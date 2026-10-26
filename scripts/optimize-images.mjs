// Converte as fotos originais (src/images) em WebP responsivo,
// gera a imagem de compartilhamento (og-image.jpg) e os ícones do site.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const SRC = "src/images";
const OUT = "assets/images/obras";

const photos = {
  "perfil led.jpeg": "sancas-perfil-led",
  "forro.jpeg": "forro-rebaixado-luz",
  "paredes 3D.jpeg": "paredes-3d-sala",
  "Paredes 3D.png": "paredes-3d",
  "Sancas e iluminação LED.png": "sancas-iluminacao-led",
  "Forro rebaixado.png": "forro-rebaixado",
  "Isolamento.png": "isolamento-termoacustico",
  "Nichos e paineis decortaivos.png": "nichos-paineis",
  "Comerciais.png": "ambientes-comerciais",
};

const LOGO_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#dfb135">
  <rect x="15" y="85" width="70" height="4" rx="2"/><rect x="44" y="10" width="4" height="75"/>
  <rect x="28" y="26" width="4" height="59"/><polygon points="18,44 48,22 48,27 20,47"/>
  <polygon points="28,34 44,24 44,85 28,85"/><rect x="48" y="14" width="4" height="71"/>
  <rect x="58" y="14" width="4" height="71"/><polygon points="48,25 58,33 58,36 48,28"/>
  <polygon points="58,36 48,44 48,47 58,39"/><polygon points="48,47 58,55 58,58 48,50"/>
  <polygon points="58,58 48,66 48,69 58,61"/><polygon points="48,69 58,77 58,80 48,72"/>
  <polygon points="54,26 70,18 71,22 55,30"/><polygon points="58,34 82,46 82,85 58,85"/>
</svg>`;

mkdirSync(OUT, { recursive: true });
const manifest = {};

for (const [file, slug] of Object.entries(photos)) {
  const input = sharp(`${SRC}/${file}`).rotate();
  const { width, height } = await input.metadata();
  manifest[slug] = { original: [width, height], variants: [] };
  for (const target of [480, 960]) {
    const w = Math.min(target, width);
    const name = `${slug}-${target}.webp`;
    const info = await sharp(`${SRC}/${file}`).rotate().resize({ width: w })
      .webp({ quality: 74, effort: 6 }).toFile(`${OUT}/${name}`);
    manifest[slug].variants.push({ name, width: info.width, height: info.height, kb: Math.round(info.size / 1024) });
  }
}

// Imagem de compartilhamento 1200x630: foto à direita, logo e texto à esquerda.
const photo = await sharp(`${SRC}/perfil led.jpeg`).resize({ width: 520, height: 630, fit: "cover" }).toBuffer();
const overlay = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="680" height="630" fill="#0a0e14"/>
  <text x="72" y="250" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="58" fill="#ffffff">Forro de gesso,</text>
  <text x="72" y="320" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="58" fill="#ffffff">sancas e drywall</text>
  <text x="72" y="390" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="58" fill="#dfb135">no Rio de Janeiro</text>
  <text x="72" y="470" font-family="Inter, Arial, sans-serif" font-size="30" fill="#cbd5e1">Orçamento gratuito pelo WhatsApp</text>
  <text x="168" y="140" font-family="Montserrat, Arial, sans-serif" font-weight="700" font-size="40" fill="#ffffff">GL GESSO</text>
</svg>`);
const logo = await sharp(Buffer.from(LOGO_SVG)).resize(80, 80).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#0a0e14" } })
  .composite([
    { input: photo, left: 680, top: 0 },
    { input: overlay, left: 0, top: 0 },
    { input: logo, left: 72, top: 82 },
  ])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile("assets/images/og-image.jpg");

// Ícones: SVG, PNG 32/48, apple-touch 180 (fundo escuro) e favicon.ico com PNG embutido.
writeFileSync("favicon.svg", LOGO_SVG);
const iconPng = async (size, bg) => {
  const pad = Math.round(size * (bg ? 0.16 : 0.04));
  const inner = await sharp(Buffer.from(LOGO_SVG)).resize(size - pad * 2, size - pad * 2).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: bg || { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: inner, left: pad, top: pad }]).png().toBuffer();
};
writeFileSync("apple-touch-icon.png", await iconPng(180, "#0a0e14"));
const png48 = await iconPng(48, "#0a0e14");
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header.writeUInt8(48, 6); header.writeUInt8(48, 7); header.writeUInt8(0, 8); header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
header.writeUInt32LE(png48.length, 14); header.writeUInt32LE(22, 18);
writeFileSync("favicon.ico", Buffer.concat([header, png48]));

writeFileSync("scripts/images-manifest.json", JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 1));

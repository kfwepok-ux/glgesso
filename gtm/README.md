# GA4 dentro do GTM

O GA4 (`G-P2X5RRFC76`) é configurado só no GTM (`GTM-MH28D3FW`). O site não carrega mais o `gtag.js` direto: ele envia os eventos só pelo `dataLayer` (`assets/js/site.js`, função `push`), e o GTM repassa ao GA4 e ao Google Ads.

`ga4-import.json` acrescenta ao contêiner:

| Item | Tipo | Configuração |
|---|---|---|
| GA4 - Tag do Google | Tag do Google | ID `G-P2X5RRFC76`, acionador **All Pages** (envia `page_view` e a medição otimizada) |
| GA4 - Evento do site | Evento do GA4 | Nome do evento `{{Event}}`, ID de medição `G-P2X5RRFC76`, parâmetros abaixo |
| GA4 - eventos do site | Acionador de evento personalizado | Regex `^(cta_click\|quiz_open\|quiz_step\|generate_lead\|faq_open\|section_view\|web_vitals)$` |
| DLV - (parâmetro) | 14 variáveis da camada de dados (versão 2) | `channel`, `cta_location`, `service`, `link_url`, `step`, `step_name`, `region`, `size`, `timeline`, `question`, `section`, `metric_name`, `metric_value`, `metric_rating` |
| Event | Variável integrada | Habilitada |

As tags e o acionador do Google Ads não são alterados.

## Importar

1. GTM → **Administrador** → **Importar contêiner**.
2. Arquivo: `ga4-import.json`.
3. Espaço de trabalho: **Existente** → "Default Workspace".
4. Opção de importação: **Mesclar** → **Substituir tags, acionadores e variáveis conflitantes**. Só a `DLV - channel` conflita, e com a mesma definição, então nada muda nela.
5. Confira o resumo: 2 tags, 1 acionador e 13 variáveis novas, mais 1 modificada. Clique em **Confirmar**.

## Testar antes de publicar

1. Clique em **Visualizar** e informe a URL do site (ou da prévia da Vercel).
2. No Tag Assistant, confira:
   - **Container Loaded / Page View:** "GA4 - Tag do Google" disparou.
   - Abra o quiz: no evento `quiz_open`, disparou "GA4 - Evento do site". A tag de conversão do Ads **não** disparou.
   - Responda as perguntas: `quiz_step` disparou "GA4 - Evento do site", com `step_name` preenchido (aba Variáveis).
   - Envie o quiz: em `generate_lead` e `cta_click`, disparou "GA4 - Evento do site". No `cta_click`, a conversão do Ads também disparou.
3. **Enviar** → nome da versão "GA4 no GTM" → **Publicar**.

## Alternativa manual (se a importação recusar o arquivo)

1. **Variáveis → Configurar:** habilite **Event**.
2. **Variáveis definidas pelo usuário → Nova → Variável da camada de dados (versão 2):** crie uma para cada parâmetro da tabela, com o nome `DLV - <parâmetro>`. A `DLV - channel` já existe.
3. **Acionadores → Novo → Evento personalizado:**
   - nome do evento: a regex da tabela;
   - marque **Usar correspondência de regex**;
   - "Todos os eventos personalizados".
4. **Tags → Nova → Tag do Google:** ID `G-P2X5RRFC76`, acionador **All Pages**.
5. **Tags → Nova → Google Analytics: evento do GA4:**
   - ID de medição `G-P2X5RRFC76`;
   - nome do evento `{{Event}}`;
   - em **Parâmetros do evento**, adicione as 14 linhas (nome do parâmetro → `{{DLV - nome}}`);
   - acionador "GA4 - eventos do site".

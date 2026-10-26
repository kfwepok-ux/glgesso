# Quiz de orçamento → planilha + e-mail

`Code.gs` recebe os pedidos do quiz do site (`assets/js/quiz.js`), grava na planilha **Gestão de Tráfego | GL Gesso** e avisa a equipe por e-mail.

- Planilha: `1Wbp_T96Wy814Tukge5X-TSIsirwCLkfI2Xrhas3leUo`
- Aba de destino: **Leads do site**, criada pelo script no primeiro lead. As abas "Gestão de Leads" e "Visão Geral" não são alteradas.
- Avisos por e-mail: kaioapchagas@gmail.com e ysousalima00@gmail.com, com o assunto "🟢 Novo lead GL Gesso — {serviço} — {nome}". O e-mail traz um botão para chamar o cliente no WhatsApp e o link da linha na planilha.

## Colunas

`Lead | 1º contato | Serviço | Nome | Telefone | Cidade | Status | Valor do Orçamento | Valor Fechado | Observação | E-mail | Bairro | Tamanho (m²) | Prazo | Origem | ID`

- A ordem é a mesma da aba "Gestão de Leads", com as respostas do quiz no fim. "Lead" recebe `1`, "Cidade" recebe a região e "Status" recebe `Novo lead`.
- O script localiza as colunas pelo nome do cabeçalho, então a ordem pode mudar. Cabeçalhos que faltarem são criados nas colunas vazias à direita.
- **Valor do Orçamento**, **Valor Fechado** e **Observação** nunca são preenchidos pelo script. O Status só é preenchido quando o lead chega.
- O painel "Visão Geral" conta apenas a aba "Gestão de Leads". Para incluir os leads do site, as fórmulas dele precisam somar as duas abas.

## Implantação atual

- Projeto Apps Script **GL Gesso - Leads do site**, vinculado à planilha: `1auFDSrbuVT-xtctADNwF9mT5c9YWMdRNSsc9sIoVnf1_2I8Xcc4h4ffq` (fica em `.clasp.json`).
- Implantação web "Quiz do site v1": `AKfycbztOiPXCjN_OYjf2RIfzlwgYwjJmex4FqaD__qZnhTnr4Tud0qFgJRbzERgxMEH4qMn`. É a URL `/exec` configurada em `assets/js/quiz.js`.

Para atualizar o código **mantendo a mesma URL**, rode estes comandos nesta pasta:

```bash
npx @google/clasp@2.4.2 push -f
npx @google/clasp@2.4.2 deploy -i AKfycbztOiPXCjN_OYjf2RIfzlwgYwjJmex4FqaD__qZnhTnr4Tud0qFgJRbzERgxMEH4qMn -d "descrição da versão"
```

Antes, é preciso ter feito `clasp login` com a conta dona do script e ativado a "API do Google Apps Script" em script.google.com/home/usersettings.

## Como publicar (do zero, pelo editor)

1. Abra a planilha com uma conta que tenha permissão de edição.
2. Vá em **Extensões → Apps Script**.
3. Substitua o conteúdo de `Code.gs` pelo deste arquivo e salve.
4. Em **Configurações do projeto**, marque "Mostrar arquivo de manifesto appsscript.json" e cole o conteúdo de `appsscript.json`.
5. Clique em **Implantar → Nova implantação**, tipo **App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
6. Autorize o acesso à planilha e o envio de e-mails.
7. Copie a URL que termina em `/exec` e coloque em `LEAD_ENDPOINT`, no início de `assets/js/quiz.js`.

Para atualizar o código depois, use **Implantar → Gerenciar implantações → Editar → Nova versão**. Assim a URL `/exec` continua a mesma.

## Como testar

1. Abra a URL `/exec` no navegador. A resposta deve ser `{"ok":true,"version":"gl-gesso-quiz-v1",...}`.
2. Mude `TEST_MODE` para `true` e publique uma nova versão. Nesse modo, o e-mail vai só para kaioapchagas@gmail.com e a linha sai com Status "Teste".
3. Preencha o quiz no site. Confira a linha na aba "Leads do site" e o e-mail recebido. Depois apague a linha de teste.
4. Volte `TEST_MODE` para `false` e publique uma nova versão.

## Formato do envio

O site envia um `POST` com `Content-Type: text/plain` (`mode: no-cors`) e um corpo JSON:

```json
{
  "id": "m2x9k1abc123",
  "created_at": "2026-10-27T14:03:00.000Z",
  "nome": "Maria Souza",
  "whatsapp": "(21) 99999-9999",
  "email": "maria@email.com",
  "servico": "Sanca ou rasgo de luz com LED",
  "regiao": "Rio de Janeiro (capital)",
  "bairro": "Botafogo",
  "medida": "10 a 30 m²",
  "prazo": "Em até 30 dias",
  "origem_cta": "servicos",
  "pagina_origem": "https://www.glgesso.com.br/"
}
```

Envios repetidos do mesmo WhatsApp e serviço dentro de 30 segundos são recusados, para evitar duplicidade.

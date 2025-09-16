# 🎁 Chá de Panela — Lista de Presentes

Este projeto é uma **lista interativa de presentes** com integração ao **Google Sheets**.  
Os convidados podem escolher itens, contribuir com PIX 💸 e deixar mensagens carinhosas 💌.

---

## ✨ Funcionalidades

- ✅ **Escolha de presentes** diretamente da lista (com controle de estoque).
- ✅ **Contribuição via PIX** com QR Code gerado automaticamente.
- ✅ **Mensagens personalizadas** (salvas em uma aba separada da planilha).
- ✅ **Validação de campos obrigatórios** (nome e email necessários em todas as ações).
- ✅ **Comentários aparecem primeiro** (ordem decrescente, mensagens mais novas no topo).
- ✅ **Registro automático no Google Sheets**:
  - Presentes → Aba **Dados**  
  - Contribuições PIX → Aba **Dados**  
  - Comentários → Aba **Comentarios**

---

## 📂 Estrutura do Projeto

├── index.html # Página principal
├── style.css # Estilo visual (cores, layout e responsividade)
├── script.js # Lógica principal (fetch, validações, integração PIX e comentários)
├── config.js # Configurações (endpoint do Google Apps Script)
└── README.md # Documentação do projeto


---

## ⚙️ Configuração

1. **Crie uma planilha no Google Sheets** com as abas:
   - `Config`
   - `Itens`
   - `Dados`
   - `Comentarios`
   - `Log`

2. **Publique o Apps Script** (`Code.gs`) como **Web App** (com acesso a qualquer pessoa com o link).  
   - Esse script será o **backend** da aplicação.

3. **Configure o endpoint** no arquivo `config.js`:

```js
// URL do Apps Script publicado
const SHEET_ENDPOINT = "https://script.google.com/macros/s/SEU_ID/exec";


⚠️ Importante: o BASE_PAYLOAD (PIX) pode ser carregado direto da aba Config da planilha, garantindo mais segurança.
No script.js ele já busca automaticamente da planilha.

🚀 Como usar

Abra index.html no navegador ou publique no GitHub Pages.

Preencha Nome e Email.

Escolha um presente da lista ou clique em Contribuir com PIX.

Opcional: deixe um comentário 💌.

Todas as interações são registradas diretamente na planilha.

🛠️ Tecnologias

Frontend:

HTML5

CSS3 (responsivo, gradientes e sombras suaves)

JavaScript (puro, sem frameworks)

Backend:

Google Apps Script + Google Sheets (armazenamento de dados)

📸 Demonstração

Lista de presentes com botões de ação:


Contribuição via PIX com QR Code:


Mensagens dos convidados:


📌 Observações

Os botões "Enviar presente" e "Contribuir com PIX" só funcionam se os campos obrigatórios estiverem preenchidos.

O campo Telefone é opcional, mas possui máscara de formatação (99) 99999-9999.

Comentários longos são automaticamente quebrados para não estourar o layout.
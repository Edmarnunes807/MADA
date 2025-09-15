document.addEventListener("DOMContentLoaded", () => {
  const giftSelect = document.getElementById("giftSelect");
  const pixButton = document.getElementById("pixButton");
  const pixArea = document.getElementById("pixArea");
  const pixKeyInput = document.getElementById("pixKey");
  const copyPix = document.getElementById("copyPix");
  const commentsList = document.getElementById("commentsList");
  const form = document.getElementById("giftForm");

  // Preenche a lista suspensa com itens do config.js
  for (let [lista, itens] of Object.entries(config.listas)) {
    const optGroup = document.createElement("optgroup");
    optGroup.label = lista;
    itens.forEach(item => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      optGroup.appendChild(option);
    });
    giftSelect.appendChild(optGroup);
  }

  // PIX
  pixButton.addEventListener("click", () => {
    pixArea.classList.toggle("hidden");
    pixKeyInput.value = config.pixKey;
    generateQRCode(config.pixKey);
    logAction("Usuário abriu área PIX");
  });

  copyPix.addEventListener("click", () => {
    navigator.clipboard.writeText(pixKeyInput.value);
    alert("Chave PIX copiada!");
    logAction("Usuário copiou chave PIX");
  });

  // Formulário
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.timestamp = new Date().toLocaleString();

    logAction(`Usuário enviou presente: ${data.item || "PIX"}`);
    alert("Obrigada pelo carinho 💕 Seu presente foi registrado!");
    form.reset();

    // Exibe comentário na página
    if (data.nome && data.email && data.comentario) {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${data.nome}</strong><br>${data.email}<br>${data.comentario}`;
      commentsList.appendChild(li);
    }

    // Envia para Google Sheets
    fetch(config.scriptURL, {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  // QRCode
  function generateQRCode(text) {
    const qrcodeDiv = document.getElementById("qrcode");
    qrcodeDiv.innerHTML = "";
    new QRCode(qrcodeDiv, { text, width: 128, height: 128 });
  }

  // Log
  function logAction(action) {
    fetch(config.scriptURL, {
      method: "POST",
      body: JSON.stringify({ log: action, timestamp: new Date().toLocaleString() }),
    });
  }
});

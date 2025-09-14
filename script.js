document.addEventListener("DOMContentLoaded", () => {
  // Mostra a chave PIX
  document.getElementById("pixKey").innerText = PIX_KEY;

  // Renderiza as listas
  carregarListas();

  // Captura envio do formulário
  document.getElementById("giftForm").addEventListener("submit", enviarFormulario);
});

// Função para carregar listas com base nas regras
function carregarListas() {
  const lista1 = ["🍳 Jogo de panela","🏡 Tapete de cozinha (jogo)","🥛 Jogo de copos","☕ Jogo de xícaras","🧻 Panos de prato","🍽️ Jogo americano","🧂 Potes para condimentos","🍽️ Jogo de pratos","🎂 Formas para bolo","🥛 Leiteira","🍴 Talheres","🥄 Espátulas de silicone","🪵 Colher de pau","🏺 Jarra","🍲 Travessas","🕸️ Jogo de peneiras","🍳 Frigideira","🍮 Forma de pudim","🍷 Taças","👩‍🍳 Avental","🥘 Pirex","🧵 Toalha de mesa"];
  const lista2 = ["🚿 Jogo de tapete pra banheiro","🛁 Toalha de banho pro casal","🛏️ Colcha de cama","🪟 Cortina","🛌 Lençol de casal","👕 Cabides","💤 Dois travesseiros","🪣 Jogo de bacias","🧺 Pegador para varal","🪣 Jogo de baldes"];
  const lista3 = ["👕 Tábua de passar roupa","🔌 Ferro de passar roupa","🔪 Tábua de cortar carne","🍲 Panela de pressão","🍚 Panela elétrica de arroz","🥤 Liquidificador","🥪 Sanduicheira","🎂 Batedeira","🌀 Mixer","🔪 Triturador elétrico","🍊 Espremedor de frutas","🍰 Boleira","🧺 Cesto para roupa suja","☕ Chaleira elétrica","🍟 Air-Fryer","💨 Umidificador","🛏️ Pillow cama de casal","🚮 Lixeira para banheiro","🧹 Mop giratório","🥒 Ralador de legumes","☕ Cafeteira","🌽 Cuscuseira","🍽️ Escorredor de louça","🔨 Martelo para carne","🧴 Copo medidor","🧺 Varal de chão","🥕 Descascador de legumes","🧊 Garrafa térmica","🔪 Afiador de facas","🥔 Amassador de batatas","🥡 Potes tupperware","🚽 Escova limpa sanitário","🍬 Açucareiro","🧂 Saleiro","🍕 Cortador de pizza","🔥 Descanso para panelas"];

  renderizarLista("lista1", lista1, "checkbox"); // pode repetir
  renderizarLista("lista2", lista2, "checkbox"); // pode repetir
  renderizarLista("lista3", lista3, "radio");    // só um
}

// Função que cria elementos da lista
function renderizarLista(id, itens, tipo) {
  const container = document.getElementById(id);
  itens.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "gift-item";

    const input = document.createElement("input");
    input.type = tipo;
    input.name = id + (tipo === "radio" ? "" : "[]");
    input.value = item;
    input.id = id + "_" + index;

    const label = document.createElement("label");
    label.setAttribute("for", input.id);
    label.innerText = item;

    div.appendChild(input);
    div.appendChild(label);
    container.appendChild(div);
  });
}

// Função de envio corrigida
function enviarFormulario(e) {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;

  const selecionados = [...document.querySelectorAll("input:checked")].map(el => el.value);

  if (selecionados.length === 0) {
    abrirModal("Por favor, selecione ao menos 1 presente.");
    return;
  }

  const payload = { nome, email, itens: selecionados };

  fetch(SHEET_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  .then(res => res.json())
  .then(data => {
    console.log("Resposta do Apps Script:", data);
    abrirModal("Obrigado! Seu presente foi confirmado 🎁");
    document.getElementById("giftForm").reset();
  })
  .catch(err => {
    console.error("Erro:", err);
    abrirModal("Erro ao enviar. Tente novamente.");
  });
}

// Modal
function abrirModal(msg) {
  document.getElementById("modalMessage").innerText = msg;
  document.getElementById("modal").style.display = "flex";
}

function fecharModal() {
  document.getElementById("modal").style.display = "none";
}

// Copiar PIX
function copiarPix() {
  navigator.clipboard.writeText(PIX_KEY);
  abrirModal("Chave PIX copiada!");
}

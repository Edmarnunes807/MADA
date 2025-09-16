(function () {
  if (typeof SHEET_ENDPOINT === "undefined" || !SHEET_ENDPOINT) {
    alert("Configure a URL do Apps Script em config.js (SHEET_ENDPOINT).");
    return;
  }

  // DOM
  const listFilter = document.getElementById("listFilter");
  const itemSelect = document.getElementById("itemSelect");
  const commentsList = document.getElementById("commentsList");
  const giftForm = document.getElementById("giftForm");
  const pixBtn = document.getElementById("pixBtn");
  const pixPanel = document.getElementById("pixPanel");
  const pixAmountInput = document.getElementById("pixAmount");
  const qrWrap = document.getElementById("qrWrap");
  const copyPixKey = document.getElementById("copyPixKey");
  const closePix = document.getElementById("closePix");
  const submitBtn = document.getElementById("submitBtn");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const commentInput = document.getElementById("comment");

  // state
  let CONFIG = {};
  let ITEMS = [];
  let DADOS = [];
  let COUNTS = {};

  // === PIX Config ===
  // payload base sem valor fixo (sua chave PIX, nome, cidade, txid etc.)
  const BASE_PAYLOAD =
    "00020126580014BR.GOV.BCB.PIX013656daaa2c-6501-49c4-abd6-64f60a8b3c2c5204000053039865802BR5917Edmar Rocha Nunes6009SAO PAULO62140510btpjCxgcJj63045C24";

  // === Inicialização ===
  async function boot() {
    await loadAll();
    setupListeners();
  }

  async function loadAll() {
    await fetchConfig();
    await fetchItems();
    await fetchData();
    populateLists();
    renderItemSelect();
    renderComments();
  }

  async function fetchConfig() {
    try {
      const r = await fetch(`${SHEET_ENDPOINT}?action=getConfig`);
      const j = await r.json();
      CONFIG = j.config || {};
    } catch (e) {
      CONFIG = {};
    }
  }

  async function fetchItems() {
    try {
      const r = await fetch(`${SHEET_ENDPOINT}?action=getItems`);
      const j = await r.json();
      ITEMS = j.items || [];
    } catch (e) {
      ITEMS = [];
    }
  }

  async function fetchData() {
    try {
      const r = await fetch(`${SHEET_ENDPOINT}?action=getData`);
      const j = await r.json();
      DADOS = j.dados || [];
      COUNTS = {};
      DADOS.forEach((row) => {
        const id = row.item_id || row.item || "";
        if (id) COUNTS[id] = (COUNTS[id] || 0) + 1;
      });
    } catch (e) {
      DADOS = [];
      COUNTS = {};
    }
  }

  function populateLists() {
    const lists = Array.from(new Set(ITEMS.map((i) => i.list || "Geral")));
    listFilter.innerHTML = "";
    lists.forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l;
      opt.textContent = l;
      listFilter.appendChild(opt);
    });
  }

  function renderItemSelect() {
    const chosen =
      listFilter.value ||
      (listFilter.options[0] && listFilter.options[0].value) ||
      "";
    itemSelect.innerHTML = '<option value="">-- selecione --</option>';
    ITEMS.filter((it) => (it.list || "Geral") === chosen).forEach((it) => {
      const id = String(it.id);
      const label = it.label || id;
      const limit = Number(it.limit || 1);
      const count = Number(COUNTS[id] || 0);
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${label}${count >= limit ? " — esgotado" : ""}`;
      if (count >= limit) opt.disabled = true;
      itemSelect.appendChild(opt);
    });
  }

  function renderComments() {
    commentsList.innerHTML = "";
    const visibleComments = DADOS.filter(
      (r) =>
        r.comment && String(r.comment_visible || "TRUE").toUpperCase() !== "FALSE"
    );
    if (visibleComments.length === 0) {
      commentsList.innerHTML =
        '<p class="hint">Nenhuma mensagem ainda — seja a primeira!</p>';
      return;
    }
    visibleComments.forEach((c) => {
      const div = document.createElement("div");
      div.className = "comment";
      div.innerHTML = `<div class="who">${c.name || "Anônimo"}</div>
                       <div class="email">${c.email || ""}</div>
                       <div class="body">${c.comment || ""}</div>`;
      commentsList.appendChild(div);
    });
  }

  // === Submissão de presentes ===
  async function submitGift(ev) {
    ev.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const item_id = itemSelect.value;
    const comment = commentInput.value.trim();

    if (!name || !email || !item_id) {
      alert("Preencha os campos obrigatórios.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    const itemObj = ITEMS.find((x) => String(x.id) === item_id) || {};
    const payload = {
      action: "submit",
      name,
      email,
      phone,
      item_id,
      item_label: itemObj.label || item_id,
      comment,
      type: "present",
      amount: "",
      timestamp: new Date().toISOString(),
      comment_visible: "TRUE",
    };

    const ok = await postToSheet(payload);
    if (ok) {
      alert("Obrigada! Seu presente foi registrado 💖");
      await fetchData();
      renderComments();
      renderItemSelect();
      commentInput.value = "";
      itemSelect.value = "";
    } else {
      alert("Erro ao registrar. Tente novamente.");
    }

    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar presente";
  }

  async function postToSheet(obj) {
    try {
      const form = new URLSearchParams();
      for (const k in obj) {
        form.append(k, obj[k]);
      }
      const res = await fetch(SHEET_ENDPOINT, { method: "POST", body: form });
      const txt = await res.text();
      return /ok/i.test(txt);
    } catch (e) {
      return false;
    }
  }

  // === PIX ===
  function crc16Str(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
    let crc = 0xffff;
    for (let b of bytes) {
      crc ^= b << 8;
      for (let i = 0; i < 8; i++) {
        if ((crc & 0x8000) !== 0) crc = ((crc << 1) ^ 0x1021) & 0xffff;
        else crc = (crc << 1) & 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function buildPayloadWithAmount(basePayload, amount) {
    let payload = basePayload.replace(/6304.{4}$/, "");
    payload = payload.replace(/54\d{2}\d+(\.\d+)?/, "");
    if (amount) {
      const v = Number(amount).toFixed(2);
      const len = v.length.toString().padStart(2, "0");
      payload = payload + "54" + len + v;
    }
    payload = payload + "6304";
    const crc = crc16Str(payload);
    return payload + crc;
  }

  function generatePixPayload() {
    let raw = pixAmountInput.value.replace(/\D/g, "");
    if (raw === "") raw = "0";
    const amount = parseFloat((parseInt(raw, 10) / 100).toFixed(2));

    if (!amount || isNaN(amount) || amount <= 0) {
      alert("Digite um valor válido.");
      return;
    }

    const finalPayload = buildPayloadWithAmount(BASE_PAYLOAD, amount);
    const qrUrl =
      "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
      encodeURIComponent(finalPayload);

    qrWrap.innerHTML = `<img src="${qrUrl}" data-payload="${finalPayload}" alt="QR PIX" 
                          style="width:200px;height:200px;object-fit:contain;cursor:pointer;display:block;margin:0 auto;">`;

    document.getElementById("pixBox").classList.remove("hidden");

    // Copiar PIX
    copyPixKey.onclick = () => {
      const payload = qrWrap.querySelector("img")?.getAttribute("data-payload");
      if (!payload) {
        alert("Nenhum PIX gerado ainda.");
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(payload).then(() => {
          alert("Código PIX copiado!");
        }).catch(() => fallbackCopy(payload));
      } else {
        fallbackCopy(payload);
      }
    };
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      alert("Código PIX copiado!");
    } catch (err) {
      prompt("Copie o código PIX:", text);
    }
    document.body.removeChild(textarea);
  }

  // === Eventos ===
  function setupListeners() {
    listFilter.addEventListener("change", renderItemSelect);
    giftForm.addEventListener("submit", submitGift);

    // Ajuste para mobile
    pixBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      pixPanel.classList.remove("hidden");
      window.scrollTo({ top: pixPanel.offsetTop - 20, behavior: "smooth" });
    });

    document
      .getElementById("generatePix")
      .addEventListener("click", generatePixPayload);

    closePix.addEventListener("click", () => {
      pixPanel.classList.add("hidden");
    });

    // máscara moeda
    pixAmountInput.addEventListener("input", () => {
      let v = pixAmountInput.value.replace(/\D/g, "");
      if (v === "") v = "0";
      v = (parseInt(v, 10) / 100).toFixed(2) + "";
      v = v.replace(".", ",");
      v = "R$ " + v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      pixAmountInput.value = v;
    });
  }

  // start
  boot();
})();

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
  const commentToggle = document.getElementById("commentToggle");
  const commentGlobalError = document.getElementById("commentGlobalError");
  const commentPanel = document.getElementById("commentPanel");
  const commentInput = document.getElementById("comment");
  const sendCommentBtn = document.getElementById("sendComment");
  const commentError = document.getElementById("commentError");

  // state
  let CONFIG = {};
  let ITEMS = [];
  let DADOS = [];
  let COUNTS = {};
  let pixGenerated = false;
  let lastFinalPayload = ""; // guarda o último payload gerado (para cópia)

  // fallback (se não encontrar na planilha)
  const FALLBACK_BASE_PAYLOAD =
    "00020126580014BR.GOV.BCB.PIX013656daaa2c-6501-49c4-abd6-64f60a8b3c2c5204000053039865802BR5917Edmar Rocha Nunes6009SAO PAULO62140510btpjCxgcJj63045C24";

  async function boot() {
    await loadAll();
    setupListeners();
  }

  async function loadAll() {
    await fetchConfig();
    await fetchItems();
    await fetchData();
    await fetchComments();
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
      console.warn("Não foi possível carregar config:", e);
    }
  }

  async function fetchItems() {
    try {
      const r = await fetch(`${SHEET_ENDPOINT}?action=getItems`);
      const j = await r.json();
      ITEMS = j.items || [];
    } catch (e) {
      ITEMS = [];
      console.warn("Não foi possível carregar items:", e);
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
      console.warn("Não foi possível carregar dados:", e);
    }
  }

  async function fetchComments() {
    try {
      const r = await fetch(`${SHEET_ENDPOINT}?action=getComments`);
      const j = await r.json();
      window.COMMENTS = j.comments || [];
    } catch (e) {
      window.COMMENTS = [];
      console.warn("Não foi possível carregar comentários:", e);
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
      listFilter.value || (listFilter.options[0] && listFilter.options[0].value) || "";
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
    if (!window.COMMENTS || window.COMMENTS.length === 0) {
      commentsList.innerHTML =
        '<p class="hint">Nenhuma mensagem ainda — seja a primeira!</p>';
      return;
    }
    // comentários novos primeiro
    window.COMMENTS.slice().reverse().forEach((c) => {
      const div = document.createElement("div");
      div.className = "comment";
      div.innerHTML = `<div class="who">${escapeHtml(c.name || "Anônimo")}</div>
                       <div class="email">${escapeHtml(c.email || "")}</div>
                       <div class="body">${escapeHtml(c.comment || "")}</div>`;
      commentsList.appendChild(div);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br>");
  }

  async function sendComment() {
    commentError.classList.add("hidden");
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const comment = commentInput.value.trim();

    if (!name || !email || !isValidPhone(phone)) {
      showInlineError("Preencha nome, email e telefone para comentar.");
      return;
    }
    if (!comment) {
      showInlineError("Escreva seu comentário antes de enviar.");
      return;
    }

    const payload = {
      action: "submitComment",
      name,
      email,
      phone,
      comment,
      timestamp: new Date().toISOString(),
    };
    const ok = await postToSheet(payload);
    if (ok) {
      alert("Comentário enviado com sucesso 💌");
      commentInput.value = "";
      commentPanel.classList.add("hidden");
      await fetchComments();
      renderComments();
    } else {
      showInlineError("Erro ao enviar comentário, tente novamente.");
    }
  }

  function showInlineError(msg) {
    commentError.textContent = msg;
    commentError.classList.remove("hidden");
  }

  async function postToSheet(obj) {
    try {
      const form = new URLSearchParams();
      for (const k in obj) form.append(k, obj[k]);
      const res = await fetch(SHEET_ENDPOINT, { method: "POST", body: form });
      const txt = await res.text();
      return /ok/i.test(txt);
    } catch (e) {
      console.warn("postToSheet falhou:", e);
      return false;
    }
  }

  // === PIX helpers ===
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

  function getBasePayloadFromConfig() {
    if (!CONFIG || typeof CONFIG !== "object") return "";
    return (
      CONFIG.basePayload ||
      CONFIG.base_payload ||
      CONFIG.BASE_PAYLOAD ||
      CONFIG.pixPayload ||
      CONFIG.pix_payload ||
      CONFIG.pix ||
      CONFIG.payload ||
      ""
    );
  }

  async function generatePixPayload() {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name || !email || !isValidPhone(phone)) {
      alert("Preencha nome, email e telefone corretamente antes de gerar o PIX.");
      return;
    }

    let raw = pixAmountInput.value.replace(/\D/g, "");
    if (raw === "") raw = "0";
    const amount = parseFloat((parseInt(raw, 10) / 100).toFixed(2));
    if (!amount || isNaN(amount) || amount <= 0) {
      alert("Digite um valor válido.");
      return;
    }

    let basePayload = getBasePayloadFromConfig();
    if (!basePayload) {
      await fetchConfig();
      basePayload = getBasePayloadFromConfig();
    }
    if (!basePayload) {
      console.warn("Nenhum basePayload na planilha — usando fallback local.");
      basePayload = FALLBACK_BASE_PAYLOAD;
    }

    try {
      const finalPayload = buildPayloadWithAmount(basePayload, amount);
      lastFinalPayload = finalPayload;
      const qrUrl =
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
        encodeURIComponent(finalPayload);
      qrWrap.innerHTML = `<img src="${qrUrl}" data-payload="${finalPayload}" alt="QR PIX" style="width:200px;height:200px;object-fit:contain;">`;
      document.getElementById("pixBox").classList.remove("hidden");
      pixGenerated = true;

      const payload = {
        action: "submit",
        name,
        email,
        phone,
        item_id: "PIX",
        item_label: "Contribuição PIX",
        comment: "",
        type: "pix",
        amount: amount.toFixed(2).replace(".", ","),
        timestamp: new Date().toISOString(),
        comment_visible: "TRUE",
      };
      await postToSheet(payload);

      copyPixKey.onclick = () => {
        const toCopy = lastFinalPayload || finalPayload;
        navigator.clipboard
          .writeText(toCopy)
          .then(() => alert("Código PIX copiado!"))
          .catch(() => prompt("Copie o código PIX abaixo:", toCopy));
      };
    } catch (e) {
      console.error("Erro ao gerar PIX:", e);
      alert("Erro ao gerar QR PIX. Veja console para mais detalhes.");
    }
  }

  // === Eventos ===
  function setupListeners() {
    listFilter.addEventListener("change", renderItemSelect);
    giftForm.addEventListener("submit", (ev) => ev.preventDefault());
    submitBtn.addEventListener("click", submitGift);

    pixBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const phone = phoneInput.value.trim();

      if (!name || !email || !isValidPhone(phone)) {
        alert("Preencha nome, email e telefone antes de continuar.");
        return;
      }

      pixPanel.classList.remove("hidden");
      window.scrollTo({ top: pixPanel.offsetTop - 20, behavior: "smooth" });
    });

    document.getElementById("generatePix").addEventListener("click", generatePixPayload);
    closePix.addEventListener("click", () => pixPanel.classList.add("hidden"));

    commentToggle.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      if (!name || !email || !isValidPhone(phoneInput.value.trim())) {
        commentGlobalError.textContent =
          "⚠️ Preencha nome, e-mail e telefone antes de comentar.";
        commentGlobalError.classList.remove("hidden");
        return;
      }
      commentGlobalError.classList.add("hidden");
      commentPanel.classList.toggle("hidden");
    });

    sendCommentBtn.addEventListener("click", sendComment);

    // máscara telefone
    phoneInput.addEventListener("input", () => {
      let v = phoneInput.value.replace(/\D/g, "");
      if (v.length > 11) v = v.slice(0, 11);
      if (v.length > 6) {
        phoneInput.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
      } else if (v.length > 2) {
        phoneInput.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      } else if (v.length > 0) {
        phoneInput.value = `(${v}`;
      }
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

  async function submitGift() {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const item_id = itemSelect.value;

    if (!name || !email || !isValidPhone(phone) || !item_id) {
      alert("Preencha nome, email, telefone e escolha um item.");
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
      comment: "",
      type: "present",
      amount: "",
      timestamp: new Date().toISOString(),
      comment_visible: "TRUE",
    };

    const ok = await postToSheet(payload);
    if (ok) {
      alert("Obrigada! Seu presente foi registrado 💖");
      await fetchData();
      renderItemSelect();
    } else {
      alert("Erro ao registrar. Tente novamente.");
    }

    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar presente";
  }

  function isValidPhone(phone) {
    return /^\(\d{2}\)\s\d{5}-\d{4}$/.test(phone);
  }

  boot();
})();

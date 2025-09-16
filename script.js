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
  const commentInput = document.getElementById("commentInput");
  const openCommentBox = document.getElementById("openCommentBox");
  const sendComment = document.getElementById("sendComment");
  const commentWarning = document.getElementById("commentWarning");

  // state
  let ITEMS = [];
  let DADOS = [];
  let COUNTS = {};
  let pixGenerated = false;

  // === Inicialização ===
  async function boot() {
    await fetchItems();
    await fetchData();
    populateLists();
    renderItemSelect();
    renderComments();
    setupListeners();
  }

  async function fetchItems() {
    try {
      const r = await fetch(`${SHEET_ENDPOINT}?action=getItems`);
      const j = await r.json();
      ITEMS = j.items || [];
    } catch {
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
    } catch {
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
    const chosen = listFilter.value || "";
    itemSelect.innerHTML = '<option value="">-- selecione --</option>';
    ITEMS.filter((it) => (it.list || "Geral") === chosen).forEach((it) => {
      const id = String(it.id);
      const label = it.label || id;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = label;
      itemSelect.appendChild(opt);
    });
  }

  function renderComments() {
    commentsList.innerHTML = "";
    const visibleComments = DADOS.filter(
      (r) => r.comment && String(r.comment_visible || "TRUE").toUpperCase() !== "FALSE"
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

  // === Comentários ===
  openCommentBox.addEventListener("click", () => {
    const item_id = itemSelect.value;

    if (!item_id && !pixGenerated) {
      commentWarning.classList.remove("hidden");
      return;
    }

    commentWarning.classList.add("hidden");
    document.getElementById("commentBox").classList.toggle("hidden");
  });

  sendComment.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const comment = commentInput.value.trim();
    const item_id = itemSelect.value;

    if (!name || !email || !comment) {
      alert("Preencha nome, email e comentário.");
      return;
    }
    if (!item_id && !pixGenerated) {
      alert("Selecione um presente ou gere um PIX antes de comentar.");
      return;
    }

    const payload = {
      action: "submit",
      name,
      email,
      phone: phoneInput.value.trim(),
      item_id: item_id || "PIX",
      item_label: item_id ? "Comentário Presente" : "Comentário PIX",
      comment,
      type: item_id ? "present_comment" : "pix_comment",
      timestamp: new Date().toISOString(),
      comment_visible: "TRUE",
    };

    const ok = await postToSheet(payload);
    if (ok) {
      alert("Comentário enviado!");
      commentInput.value = "";
      document.getElementById("commentBox").classList.add("hidden");
      await fetchData();
      renderComments();
    } else {
      alert("Erro ao enviar comentário.");
    }
  });

  async function postToSheet(obj) {
    try {
      const form = new URLSearchParams();
      for (const k in obj) form.append(k, obj[k]);
      const res = await fetch(SHEET_ENDPOINT, { method: "POST", body: form });
      const txt = await res.text();
      return /ok/i.test(txt);
    } catch {
      return false;
    }
  }

  // === PIX ===
  function generatePixPayload() {
    pixGenerated = true;
    commentWarning.classList.add("hidden");
    openCommentBox.disabled = false;
    document.getElementById("pixBox").classList.remove("hidden");
    qrWrap.innerHTML = `<div style="width:200px;height:200px;background:#eee;margin:auto"></div>`;
  }

  // === Eventos ===
  function setupListeners() {
    listFilter.addEventListener("change", renderItemSelect);
    itemSelect.addEventListener("change", () => {
      if (itemSelect.value) {
        commentWarning.classList.add("hidden");
        openCommentBox.disabled = false;
      }
    });
    document.getElementById("generatePix").addEventListener("click", generatePixPayload);
    closePix.addEventListener("click", () => pixPanel.classList.add("hidden"));
    pixBtn.addEventListener("click", () => pixPanel.classList.remove("hidden"));

    // máscara moeda PIX
    pixAmountInput.addEventListener("input", () => {
      let v = pixAmountInput.value.replace(/\D/g, "");
      if (v === "") v = "0";
      v = (parseInt(v, 10) / 100).toFixed(2) + "";
      v = v.replace(".", ",");
      v = "R$ " + v.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      pixAmountInput.value = v;
    });
  }

  boot();
})();

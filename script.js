/* script.js */
(function(){
  if(typeof SHEET_ENDPOINT === 'undefined' || !SHEET_ENDPOINT) {
    alert('Por favor configure a URL do Apps Script em config.js (SHEET_ENDPOINT).');
    return;
  }

  // elementos
  const listFilter = document.getElementById('listFilter');
  const itemSelect = document.getElementById('itemSelect');
  const commentsList = document.getElementById('commentsList');
  const giftForm = document.getElementById('giftForm');
  const pixBtn = document.getElementById('pixBtn');
  const pixPanel = document.getElementById('pixPanel');
  const generatePix = document.getElementById('generatePix');
  const pixAmountInput = document.getElementById('pixAmount');
  const qrWrap = document.getElementById('qrWrap');
  const pixKeyText = document.getElementById('pixKeyText');
  const pixPayloadEl = document.getElementById('pixPayload');
  const copyPixKey = document.getElementById('copyPixKey');
  const openQrNew = document.getElementById('openQrNew');
  const confirmPaid = document.getElementById('confirmPaid');
  const closePix = document.getElementById('closePix');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const valueInput = document.getElementById('value');
  const commentInput = document.getElementById('comment');
  const submitBtn = document.getElementById('submitBtn');

  let CONFIG = null;
  let ITEMS = [];
  let COUNTS = {}; // itemId -> count (vindo do server)
  let ITEM_MAP = {}; // id -> item object

  // inicializa
  async function init(){
    await loadConfig();
    await loadItems();
    await loadCommentsAndCounts();
    setupListeners();
  }

  async function loadConfig(){
    try{
      const res = await fetch(`${SHEET_ENDPOINT}?action=getConfig`);
      const j = await res.json();
      CONFIG = j.config || {};
      // mostra chave PIX no painel
      pixKeyText.textContent = CONFIG.PIX_KEY || '—';
    }catch(e){
      console.error('Erro carregando config', e);
      CONFIG = {};
    }
  }

  async function loadItems(){
    try{
      const res = await fetch(`${SHEET_ENDPOINT}?action=getItems`);
      const j = await res.json();
      ITEMS = j.items || [];
      // popula lista de filtros e select
      populateLists();
    }catch(e){
      console.error('Erro carregando items', e);
      ITEMS = [];
    }
  }

  async function loadCommentsAndCounts(){
    try{
      const res = await fetch(`${SHEET_ENDPOINT}?action=getData`);
      const j = await res.json();
      const data = j.dados || [];
      // contar seleções por item_id
      COUNTS = {};
      data.forEach(r=>{
        if(r.item_id){
          COUNTS[r.item_id] = (COUNTS[r.item_id]||0) + 1;
        }
      });
      // comments: apenas os que vieram com visible = TRUE (será controlado pela planilha)
      const comments = data.filter(r => r.comment && (r.comment_visible !== 'FALSE'));
      renderComments(comments);
      // monta itens com uso de COUNTS
      renderItemSelect();
    }catch(e){
      console.error('Erro carregando dados', e);
    }
  }

  function populateLists(){
    // lista única de nomes de lista
    const lists = Array.from(new Set(ITEMS.map(i=>i.list || 'Geral')));
    listFilter.innerHTML = '';
    lists.forEach(l=>{
      const opt = document.createElement('option');
      opt.value = l;
      opt.textContent = l;
      listFilter.appendChild(opt);
    });
    // default
    listFilter.value = lists[0];
  }

  function renderItemSelect(){
    const chosenList = listFilter.value;
    itemSelect.innerHTML = '<option value="">-- selecione --</option>';
    ITEM_MAP = {};
    ITEMS.filter(i=>i.list === chosenList).forEach(it=>{
      ITEM_MAP[it.id] = it;
      const count = Number(COUNTS[it.id]||0);
      const limit = Number(it.limit || CONFIG.LIMITS && CONFIG.LIMITS[it.listKey] || it.limit || 1);
      const opt = document.createElement('option');
      opt.value = it.id;
      opt.textContent = `${it.label}${it.price ? ' • R$ ' + it.price : ''}${count>0 ? ` (${count} já)` : ''}${count >= limit ? ' — esgotado' : ''}`;
      if(count >= limit) opt.disabled = true;
      itemSelect.appendChild(opt);
    });
  }

  function renderComments(comments){
    commentsList.innerHTML = '';
    if(!comments.length){
      commentsList.innerHTML = '<p class="hint">Nenhuma mensagem ainda — seja a primeira!</p>';
      return;
    }
    comments.forEach(c=>{
      const div = document.createElement('div');
      div.className = 'comment';
      const who = document.createElement('div');
      who.className = 'who';
      who.textContent = c.name || 'Anônimo';
      const email = document.createElement('div');
      email.className = 'email';
      email.textContent = c.email || '';
      const body = document.createElement('div');
      body.className = 'body';
      body.textContent = c.comment || '';
      div.appendChild(who);
      div.appendChild(email);
      div.appendChild(body);
      commentsList.appendChild(div);
    });
  }

  function setupListeners(){
    listFilter.addEventListener('change', renderItemSelect);

    giftForm.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      await submitGift();
    });

    pixBtn.addEventListener('click', ()=>{
      pixPanel.classList.toggle('hidden');
      logAction('pix_view');
    });

    generatePix.addEventListener('click', ()=>{
      generatePixPayload();
    });

    copyPixKey.addEventListener('click', async ()=>{
      const key = CONFIG.PIX_KEY || '';
      try{
        await navigator.clipboard.writeText(key);
        alert('Chave PIX copiada!');
        logAction('pix_copy');
      }catch(e){
        alert('Não foi possível copiar automaticamente. Copie manualmente: ' + key);
      }
    });

    openQrNew.addEventListener('click', ()=>{
      // abre imagem do qr em nova aba -> consideramos como "scan intent"
      const img = qrWrap.querySelector('img');
      if(img && img.src) window.open(img.src, '_blank');
      logAction('pix_qr_open');
    });

    confirmPaid.addEventListener('click', async ()=>{
      // confirma pagamento manualmente — registra na planilha com tipo=paid e valor se houver
      const amount = pixAmountInput.value.trim();
      await postToSheet({
        action: 'submit',
        name: nameInput.value || '—',
        email: emailInput.value || '—',
        phone: document.getElementById('phone').value || '—',
        item_id: '',
        item_label: 'PIX_CONTRIB',
        comment: 'Contribuição via PIX',
        type: 'pix_paid',
        amount: amount || '',
        timestamp: new Date().toISOString()
      });
      alert('Obrigado! Obrigada pela contribuição 💖');
      logAction('pix_paid');
    });

    closePix.addEventListener('click', ()=>{
      pixPanel.classList.add('hidden');
    });
  }

  async function submitGift(){
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = document.getElementById('phone').value.trim();
    const item_id = itemSelect.value;
    const comment = commentInput.value.trim();
    const amount = valueInput.value.trim();

    if(!name || !email) {
      alert('Nome e email são obrigatórios.');
      return;
    }
    if(!item_id){
      alert('Por favor escolha um item.');
      return;
    }

    // envio
    const payload = {
      action: 'submit',
      name, email, phone,
      item_id,
      item_label: ITEM_MAP[item_id] ? ITEM_MAP[item_id].label : item_id,
      comment,
      type: 'present',
      amount: amount || '',
      timestamp: new Date().toISOString()
    };

    const ok = await postToSheet(payload);
    if(ok){
      alert('Presente registrado — obrigada! 💕');
      // atualizar contagens locais
      await loadCommentsAndCounts();
      // limpar campos de comentário e valor (mantém nome/email para facilidade)
      commentInput.value = '';
      valueInput.value = '';
      itemSelect.value = '';
    }else{
      alert('Erro ao registrar. Tente novamente em instantes.');
    }
  }

  async function postToSheet(obj){
    try{
      const res = await fetch(SHEET_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {'Content-Type':'application/json'}
      });
      const t = await res.text();
      return /ok/i.test(t);
    }catch(e){
      console.error('postToSheet', e);
      return false;
    }
  }

  function logAction(action, extra = {}){
    // envia log simples
    const obj = {
      action: 'log',
      event: action,
      extra,
      timestamp: new Date().toISOString()
    };
    fetch(SHEET_ENDPOINT, {
      method:'POST',
      body: JSON.stringify(obj),
      headers:{'Content-Type':'application/json'}
    }).catch(()=>{});
  }

  /* =============================
     PIX EMV payload builder (BR spec simplified)
     Gera uma payload EMV compatível com a maioria dos apps PIX.
     Calcula CRC16-CCITT (polynomial 0x1021, init 0xFFFF).
  ============================== */

  function buildPixPayload(key, merchantName, merchantCity, txid, amount){
    // helper to format TLV
    const tlv = (id, value) => {
      const v = String(value);
      const len = v.length.toString().padStart(2,'0');
      return id + len + v;
    };

    // 26 — merchantAccountInformation with GUI + key
    // GUI = 'br.gov.bcb.pix'
    const gui = tlv('00','br.gov.bcb.pix');
    const pixKey = tlv('01', key);
    const merchantInfo = '26' + String((gui + pixKey).length).padStart(2,'0') + (gui + pixKey);

    // other fields
    const payloadFormat = tlv('00','01'); // payload format indicator
    const merchantNameField = tlv('59', merchantName || 'NAO INFORMADO');
    const merchantCityField = tlv('60', merchantCity || 'SAO PAULO');
    const transactionId = txid ? tlv('62', txid) : '';

    // amount field is optional (54)
    const amountField = amount ? tlv('54', Number(amount).toFixed(2)) : '';

    // assemble without CRC
    const partial = payloadFormat + merchantInfo + (amountField) + merchantNameField + merchantCityField + transactionId;

    // Add CRC placeholder
    const crcInput = partial + '6304';
    const crc = crc16(ccittBuffer(crcInput)).toString(16).toUpperCase().padStart(4,'0');
    const full = crcInput + crc;
    return full;
  }

  // Convert string to bytes for CRC
  function ccittBuffer(str){
    const arr = [];
    for(let i=0;i<str.length;i++){
      arr.push(str.charCodeAt(i));
    }
    return arr;
  }

  // CRC16-CCITT (poly 0x1021 init 0xFFFF)
  function crc16(bytes){
    let crc = 0xFFFF;
    for (let b of bytes){
      crc ^= (b << 8);
      for (let i=0;i<8;i++){
        if ((crc & 0x8000) !== 0){
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc & 0xFFFF;
  }

  function generatePixPayload(){
    const key = CONFIG && CONFIG.PIX_KEY ? CONFIG.PIX_KEY : '';
    if(!key){
      alert('PIX não configurado.');
      return;
    }
    const amount = (pixAmountInput.value || '').replace(',','.');
    const txid = 'tx' + Date.now().toString(36);
    const merchantName = (CONFIG && CONFIG.MERCHANT_NAME) || CONFIG && CONFIG.MERCHANT || 'Nome';
    const merchantCity = (CONFIG && CONFIG.MERCHANT_CITY) || 'SAO PAULO';

    const payload = buildPixPayload(key, merchantName, merchantCity, txid, amount);
    pixPayloadEl.textContent = payload;
    pixKeyText.textContent = key;

    // gera QR via Google Chart API
    const qrUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(payload);
    qrWrap.innerHTML = `<img src="${qrUrl}" alt="QR PIX" style="width:100%;height:100%;object-fit:contain;cursor:pointer">`;
    // click to open
    const img = qrWrap.querySelector('img');
    img.addEventListener('click', ()=> window.open(qrUrl, '_blank'));

    // log that user generated QR and amount
    logAction('pix_generated', {amount: amount || '', payload});
  }

  // Small utility: will fetch CONFIG from server-side endpoint (sheet)
  async function fetchConfigFromServer(){
    try{
      const r = await fetch(`${SHEET_ENDPOINT}?action=getConfig`);
      const j = await r.json();
      return j.config || {};
    }catch(e){
      console.error(e);
      return {};
    }
  }

  // before first paint, fetch CONFIG (server-managed)
  async function boot(){
    CONFIG = await fetchConfigFromServer();
    // override some values if items provide limits structure; but items also include their own limit
    await init();
  }

  boot();

})();

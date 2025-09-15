/* script.js - front-end completo */
(function(){
  if(typeof SHEET_ENDPOINT === 'undefined' || !SHEET_ENDPOINT){
    alert('Por favor configure a URL do Apps Script em config.js (SHEET_ENDPOINT).');
    return;
  }

  // DOM
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
  const phoneInput = document.getElementById('phone');
  const valueInput = document.getElementById('value');
  const commentInput = document.getElementById('comment');
  const submitBtn = document.getElementById('submitBtn');

  // state
  let CONFIG = {};
  let ITEMS = [];
  let DADOS = []; // raw dados from sheet
  let COUNTS = {}; // item_id -> number

  // init
  async function boot(){
    await loadAll();
    setupListeners();
  }

  async function loadAll(){
    await fetchConfig();
    await fetchItems();
    await fetchData(); // fills DADOS and COUNTS and comments
    populateLists();
    renderItemSelect();
    renderComments();
    if(CONFIG.PIX_KEY) {
      pixKeyText.textContent = CONFIG.PIX_KEY;
    }
  }

  async function fetchConfig(){
    try{
      const r = await fetch(`${SHEET_ENDPOINT}?action=getConfig`);
      const j = await r.json();
      CONFIG = j.config || {};
      // parse THANKS_MESSAGES if stringified
      if(typeof CONFIG.THANKS_MESSAGES === 'string') {
        try { CONFIG.THANKS_MESSAGES = JSON.parse(CONFIG.THANKS_MESSAGES); } catch(e){ CONFIG.THANKS_MESSAGES = [CONFIG.THANKS_MESSAGES]; }
      }
    }catch(e){
      console.error('Erro fetchConfig', e);
      CONFIG = {};
    }
  }

  async function fetchItems(){
    try{
      const r = await fetch(`${SHEET_ENDPOINT}?action=getItems`);
      const j = await r.json();
      ITEMS = j.items || [];
    }catch(e){
      console.error('Erro fetchItems', e);
      ITEMS = [];
    }
  }

  async function fetchData(){
    try{
      const r = await fetch(`${SHEET_ENDPOINT}?action=getData`);
      const j = await r.json();
      DADOS = j.dados || [];
      // build counts
      COUNTS = {};
      DADOS.forEach(row=>{
        const id = row.item_id || row.item || '';
        if(id) COUNTS[id] = (COUNTS[id]||0) + 1;
      });
    }catch(e){
      console.error('Erro fetchData', e);
      DADOS = [];
      COUNTS = {};
    }
  }

  function populateLists(){
    const lists = Array.from(new Set(ITEMS.map(i => i.list || 'Geral')));
    listFilter.innerHTML = '';
    lists.forEach(l=>{
      const opt = document.createElement('option');
      opt.value = l;
      opt.textContent = l;
      listFilter.appendChild(opt);
    });
    if(lists.length === 0){
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Sem itens';
      listFilter.appendChild(opt);
    }
  }

  function renderItemSelect(){
    const chosen = listFilter.value || (listFilter.options[0] && listFilter.options[0].value) || '';
    itemSelect.innerHTML = '<option value="">-- selecione --</option>';
    ITEMS.filter(it => (it.list || 'Geral') === chosen).forEach(it=>{
      const id = String(it.id);
      const label = it.label || id;
      const price = it.price ? ` • R$ ${it.price}` : '';
      const limit = Number(it.limit || 1);
      const count = Number(COUNTS[id] || 0);
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${label}${price}${count>0? ` (${count} já)` : ''}${count >= limit ? ' — esgotado' : ''}`;
      if(count >= limit) opt.disabled = true;
      itemSelect.appendChild(opt);
    });
  }

  function renderComments(){
    commentsList.innerHTML = '';
    const visibleComments = DADOS.filter(r => r.comment && String(r.comment_visible || 'TRUE').toUpperCase() !== 'FALSE' );
    if(visibleComments.length === 0){
      commentsList.innerHTML = '<p class="hint">Nenhuma mensagem ainda — seja a primeira!</p>';
      return;
    }
    visibleComments.forEach(c=>{
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
      postLog('pix_view');
    });

    generatePix.addEventListener('click', ()=> generatePixPayload());

    copyPixKey.addEventListener('click', async ()=>{
      const key = CONFIG.PIX_KEY || '';
      if(!key){
        alert('PIX não configurado.');
        return;
      }
      try{
        await navigator.clipboard.writeText(key);
        alert('Chave PIX copiada!');
        postLog('pix_copy');
      }catch(e){
        prompt('Copie a chave PIX:', key);
      }
    });

    openQrNew.addEventListener('click', ()=>{
      const img = qrWrap.querySelector('img');
      if(img && img.src) window.open(img.src, '_blank');
      postLog('pix_qr_open');
    });

    confirmPaid.addEventListener('click', async ()=>{
      const amount = (pixAmountInput.value || '').replace(',', '.');
      await postToSheet({
        action: 'submit',
        name: nameInput.value || '—',
        email: emailInput.value || '—',
        phone: phoneInput.value || '—',
        item_id: '',
        item_label: 'PIX_CONTRIB',
        comment: 'Contribuição PIX (confirmada)',
        type: 'pix_paid',
        amount: amount || '',
        timestamp: new Date().toISOString(),
        comment_visible: 'FALSE'
      });
      alert('Obrigado! Contribuição registrada.');
      postLog('pix_paid', {amount});
      await fetchData();
      renderComments();
    });

    closePix.addEventListener('click', ()=> {
      pixPanel.classList.add('hidden');
    });
  }

  async function submitGift(){
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const item_id = itemSelect.value;
    const comment = commentInput.value.trim();
    const amount = valueInput.value.trim();

    if(!name || !email){
      alert('Nome e email são obrigatórios.');
      return;
    }
    if(!item_id){
      alert('Por favor escolha um item.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    // find label
    const itemObj = ITEMS.find(x => String(x.id) === item_id) || {};
    const payload = {
      action: 'submit',
      name, email, phone,
      item_id,
      item_label: itemObj.label || item_id,
      comment,
      type: 'present',
      amount: amount || '',
      timestamp: new Date().toISOString(),
      comment_visible: 'TRUE'
    };

    const ok = await postToSheet(payload);
    if(ok){
      const msg = (CONFIG.THANKS_MESSAGES && CONFIG.THANKS_MESSAGES[0]) || 'Obrigada! Seu presente foi registrado 💖';
      alert(msg);
      await fetchData();
      renderComments();
      renderItemSelect();
      commentInput.value = '';
      valueInput.value = '';
      itemSelect.value = '';
    }else{
      alert('Deu erro ao registrar. Tente novamente em instantes.');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Enviar presente';
  }

  // NOVA VERSÃO postToSheet (form-urlencoded)
  async function postToSheet(obj){
    try {
      const form = new URLSearchParams();
      for (const k in obj) {
        if (obj.hasOwnProperty(k)) {
          form.append(k, obj[k]);
        }
      }

      const res = await fetch(SHEET_ENDPOINT, {
        method: 'POST',
        body: form
      });

      const txt = await res.text();
      if (/ok/i.test(txt)) return true;
      try {
        const j = JSON.parse(txt);
        return j && (j.status === 'ok' || j.status === 'success');
      } catch (e) {}
      return false;
    } catch (e) {
      console.error('postToSheet error', e);
      return false;
    }
  }

  function postLog(event, extra){
    const obj = {
      action: 'log',
      event: event,
      extra: extra || {},
      timestamp: new Date().toISOString()
    };
    const form = new URLSearchParams();
    for (const k in obj) {
      if (obj.hasOwnProperty(k)) {
        form.append(k, obj[k]);
      }
    }
    fetch(SHEET_ENDPOINT, {
      method: 'POST',
      body: form
    }).catch(()=>{});
  }

  /* =============================
     PIX EMV builder + CRC16
     (gera payload compatível com apps PIX)
  ============================== */
  function tlv(id, value){
    const s = String(value);
    const len = String(s.length).padStart(2,'0');
    return id + len + s;
  }

  function buildPixPayload(key, merchantName, merchantCity, txid, amount){
    const gui = tlv('00','br.gov.bcb.pix');
    const pixKey = tlv('01', key);
    const merchantAccountInfo = '26' + String((gui + pixKey).length).toString().padStart(2,'0') + (gui + pixKey);

    const payloadFormat = tlv('00','01');
    const merchantNameField = tlv('59', (merchantName || '---').substring(0,25));
    const merchantCityField = tlv('60', (merchantCity || 'SAO PAULO').substring(0,15));
    const amountField = amount ? tlv('54', Number(amount).toFixed(2)) : '';
    const txField = txid ? '62' + String(txid.length + 2).padStart(2,'0') + tlv('05', txid) : '';

    const partial = payloadFormat + merchantAccountInfo + amountField + merchantNameField + merchantCityField + txField;
    const crcInput = partial + '6304';
    const crc = crc16Str(crcInput);
    const full = crcInput + crc;
    return full;
  }

  function crc16Str(str){
    const bytes = [];
    for(let i=0;i<str.length;i++) bytes.push(str.charCodeAt(i));
    let crc = 0xFFFF;
    for(let b of bytes){
      crc ^= (b << 8);
      for(let i=0;i<8;i++){
        if((crc & 0x8000) !== 0) crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        else crc = (crc << 1) & 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4,'0');
  }

  function generatePixPayload(){
    const key = CONFIG.PIX_KEY || '';
    if(!key){
      alert('PIX não configurado.');
      return;
    }
    const amount = (pixAmountInput.value || '').replace(',','.');
    const txid = 'tx' + Date.now().toString(36);
    const merchantName = CONFIG.MERCHANT_NAME || CONFIG.MERCHANT || 'Nome';
    const merchantCity = CONFIG.MERCHANT_CITY || 'SAO PAULO';
    const payload = buildPixPayload(key, merchantName, merchantCity, txid, amount);
    pixPayloadEl.textContent = payload;
    pixKeyText.textContent = key;
    const qrUrl = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(payload);
    qrWrap.innerHTML = `<img src="${qrUrl}" alt="QR PIX" style="width:100%;height:100%;object-fit:contain;cursor:pointer">`;
    const img = qrWrap.querySelector('img');
    if(img) img.addEventListener('click', ()=> window.open(qrUrl, '_blank'));
    postLog('pix_generated', {amount});
  }

  // start
  boot();

})();

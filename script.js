/* script.js - front-end logic */
(function(){
  if(!CONFIG) {
    alert('Por favor defina o arquivo config.js corretamente.');
    return;
  }

  const endpoint = CONFIG.SHEET_ENDPOINT;
  const pixKey = CONFIG.PIX_KEY;
  const limits = CONFIG.LIMITS;
  const lists = CONFIG.LISTS;
  const thanksMessages = CONFIG.THANKS_MESSAGES || [];

  // elementos
  const listSelector = document.getElementById('listSelector');
  const itemSelector = document.getElementById('itemSelector');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const commentInput = document.getElementById('comment');
  const submitGift = document.getElementById('submitGift');
  const openPix = document.getElementById('openPix');
  const pixArea = document.getElementById('pixArea');
  const qrWrap = document.getElementById('qrWrap');
  const pixKeyText = document.getElementById('pixKeyText');
  const copyPix = document.getElementById('copyPix');
  const pixDone = document.getElementById('pixDone');
  const commentsList = document.getElementById('commentsList');
  const thanksCard = document.getElementById('thanksCard');
  const thanksMessage = document.getElementById('thanksMessage');
  const thanksOk = document.getElementById('thanksOk');

  // estado local
  let remoteData = {dados: [], log: []};

  async function fetchData(){
    try{
      const res = await fetch(endpoint + '?action=getData');
      const data = await res.json();
      remoteData = data;
      return data;
    }catch(err){
      console.error('Erro ao buscar dados', err);
      return {dados:[], log:[]};
    }
  }

  function getCounts(){
    // calcula quantas vezes cada item foi selecionado na sheet (campo item_id)
    const counts = {};
    (remoteData.dados || []).forEach(row=>{
      const itemId = row.item_id;
      const type = row.type || 'present';
      // contamos apenas presentes (não contamos logs de pix sem item)
      if(itemId){
        counts[itemId] = (counts[itemId]||0) + 1;
      }
    });
    return counts;
  }

  function populateItems(){
    const listIndex = parseInt(listSelector.value,10);
    const items = lists[listIndex] || [];
    const counts = getCounts();
    itemSelector.innerHTML = '';
    const defaultOp = document.createElement('option');
    defaultOp.value = '';
    defaultOp.textContent = '— selecione um item —';
    itemSelector.appendChild(defaultOp);

    items.forEach(it=>{
      const opt = document.createElement('option');
      opt.value = it.id;
      const count = counts[it.id] || 0;
      const limit = limits[listIndex] || 1;
      opt.textContent = `${it.label} ${count>0?`(${count} já escolhido)`:''}`;
      if(count >= limit){
        opt.disabled = true;
        opt.textContent += ' — esgotado';
      }
      itemSelector.appendChild(opt);
    });
  }

  function showComments(){
    commentsList.innerHTML = '';
    const comments = (remoteData.dados || []).filter(r => r.comment && r.type !== 'pix');
    if(comments.length === 0){
      commentsList.innerHTML = '<p class="hint">Nenhum comentário ainda. Seja a primeira pessoa a deixar uma mensagem!</p>';
      return;
    }
    comments.forEach(c=>{
      const div = document.createElement('div');
      div.className = 'comment';
      const h4 = document.createElement('h4');
      h4.textContent = c.name || 'Anônimo';
      const email = document.createElement('div');
      email.className = 'email';
      email.textContent = c.email || '';
      const body = document.createElement('div');
      body.className = 'body';
      body.textContent = c.comment || '';
      div.appendChild(h4);
      div.appendChild(email);
      div.appendChild(body);
      commentsList.appendChild(div);
    });
  }

  function randomThanks(){
    if(thanksMessages.length === 0) return 'Obrigada!';
    return thanksMessages[Math.floor(Math.random()*thanksMessages.length)];
  }

  async function init(){
    await fetchData();
    populateItems();
    showComments();
  }

  // eventos
  listSelector.addEventListener('change', populateItems);

  submitGift.addEventListener('click', async ()=>{
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const itemId = itemSelector.value;
    const comment = commentInput.value.trim();

    if(!name || !email){
      alert('Por favor preencha nome e email (necessários para registro).');
      return;
    }

    if(!itemId){
      alert('Por favor selecione um item da lista.');
      return;
    }

    // confirm optionally
    submitGift.disabled = true;
    submitGift.textContent = 'Enviando...';

    const payload = {
      action: 'submit',
      name, email, phone,
      item_id: itemId,
      item_label: findItemLabel(itemId),
      comment,
      type: 'present',
      timestamp: new Date().toISOString()
    };

    try{
      const res = await fetch(endpoint, {
        method:'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      const j = await res.json();
      if(j && j.status === 'ok'){
        await fetchData();
        populateItems();
        showThank(randomThanks());
        // limpar campos (menos nome/email pra facilitar)
        itemSelector.value = '';
        commentInput.value = '';
      }else{
        alert('Erro ao enviar. Tente novamente.');
      }
    }catch(err){
      console.error(err);
      alert('Erro ao enviar. Verifique conexão.');
    }finally{
      submitGift.disabled = false;
      submitGift.textContent = 'Enviar presente escolhido';
    }
  });

  openPix.addEventListener('click', async ()=>{
    // abre a área do PIX (gera log de interesse)
    pixArea.classList.remove('hidden');
    pixKeyText.textContent = pixKey || '---';
    generateQR(pixKey);
    // registra no log que a pessoa clicou para ver PIX (sem necessariamente doar)
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();

    const payload = {
      action: 'submit',
      name: name || '—',
      email: email || '—',
      phone: phone || '—',
      item_id: '',
      item_label: 'INTERESSE_PIX',
      comment: '',
      type: 'pix_view',
      timestamp: new Date().toISOString()
    };
    try{
      await fetch(endpoint, {
        method:'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      await fetchData();
    }catch(e){
      console.warn('Não foi possível registrar log do PIX', e);
    }
  });

  pixDone.addEventListener('click', ()=>{
    pixArea.classList.add('hidden');
  });

  copyPix.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(pixKey);
      alert('Chave PIX copiada para a área de transferência.');
    }catch(e){
      prompt('Copie manualmente a chave PIX:', pixKey);
    }
  });

  thanksOk.addEventListener('click', ()=>{
    thanksCard.classList.add('hidden');
  });

  function showThank(msg){
    thanksMessage.textContent = msg;
    thanksCard.classList.remove('hidden');
  }

  function findItemLabel(id){
    for(const k of Object.keys(lists)){
      const arr = lists[k];
      for(const it of arr){
        if(it.id === id) return it.label;
      }
    }
    return id;
  }

  function generateQR(text){
    qrWrap.innerHTML = '';
    if(!text){
      qrWrap.textContent = 'Chave PIX não configurada.';
      return;
    }
    // usa Google Chart API para QR simples
    const url = 'https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=' + encodeURIComponent(text + (CONFIG.PIX_DESCRIPTION ? ' - ' + CONFIG.PIX_DESCRIPTION : ''));
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'QR PIX';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.cursor = 'pointer';
    img.addEventListener('click', ()=>{
      // abrir imagem em nova aba para facilitar scan do celular
      window.open(url, '_blank');
    });
    qrWrap.appendChild(img);
  }

  // inicia
  init();

})();

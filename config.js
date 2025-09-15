// Configurações editáveis
const CONFIG = {
  // URL do Web App do Google Apps Script que você deve publicar (veja o script do Apps Script abaixo)
  SHEET_ENDPOINT: 'https://script.google.com/macros/s/SEU_DEPLOY_ID_AQUI/exec',

  // Chave PIX que será usada para gerar o QR
  PIX_KEY: 'seu-email-ou-cpf-ou-telefone@pix', // ex: 'fulano@icloud.com' ou '+5511999999999' ou CPF

  // Texto complementar para o PIX (aparecerá no QR e como informação)
  PIX_DESCRIPTION: 'Presente para o Chá de Panela',

  // Mensagens de agradecimento (aleatórias)
  THANKS_MESSAGES: [
    "Sua generosidade aquece nosso lar. Muito obrigada 💖",
    "Que alegria! Agradecemos muito pelo carinho e amor.",
    "Você deixou nosso coração feliz — obrigada por participar!",
    "Seu presente é um abraço em forma de gesto. Obrigada!"
  ],

  // Itens configuráveis por lista.
  // Cada item é um objeto { id, label }.
  // id deve ser único por item.
  LISTS: {
    1: [ // Lista I – Cozinha (limite 2)
      { id: 'L1_panela', label: '🍳 Jogo de panela' },
      { id: 'L1_tapete', label: '🏡 Tapete de cozinha (jogo)' },
      { id: 'L1_copos', label: '🥛 Jogo de copos' },
      { id: 'L1_xicaras', label: '☕ Jogo de xícaras' },
      { id: 'L1_panos', label: '🧻 Panos de prato' },
      { id: 'L1_jogo_americano', label: '🍽️ Jogo americano' },
      { id: 'L1_potes_condimentos', label: '🧂 Potes para condimentos' },
      { id: 'L1_pratos', label: '🍽️ Jogo de pratos' },
      { id: 'L1_formas_bolo', label: '🎂 Formas para bolo (quadrada ou redonda)' },
      { id: 'L1_leiteira', label: '🥛 Leiteira' },
      { id: 'L1_talheres', label: '🍴 Talheres' },
      { id: 'L1_espatulas', label: '🥄 Espátulas de silicone' },
      { id: 'L1_colher_pau', label: '🪵 Colher de pau' },
      { id: 'L1_jarra', label: '🏺 Jarra' },
      { id: 'L1_travessas', label: '🍲 Travessas' },
      { id: 'L1_peneiras', label: '🕸️ Jogo de peneiras' },
      { id: 'L1_frigideira', label: '🍳 Frigideira' },
      { id: 'L1_forma_pudim', label: '🍮 Forma de pudim' },
      { id: 'L1_tacas', label: '🍷 Taças' },
      { id: 'L1_avental', label: '👩‍🍳 Avental' },
      { id: 'L1_pirex', label: '🥘 Pirex' },
      { id: 'L1_toalha_mesa', label: '🧵 Toalha de mesa' }
    ],
    2: [ // Lista II – Banheiro e Quarto (limite 2)
      { id: 'L2_tapete_banheiro', label: '🚿 Jogo de tapete pra banheiro' },
      { id: 'L2_toalha_casal', label: '🛁 Toalha de banho pro casal' },
      { id: 'L2_colcha', label: '🛏️ Colcha de cama' },
      { id: 'L2_cortina', label: '🪟 Cortina' },
      { id: 'L2_lencol', label: '🛌 Lençol de casal' },
      { id: 'L2_cabides', label: '👕 Cabides' },
      { id: 'L2_travesseiros', label: '💤 Dois travesseiros' },
      { id: 'L2_bacias', label: '🪣 Jogo de bacias' },
      { id: 'L2_pegador_varal', label: '🧺 Pegador para varal' },
      { id: 'L2_baldes', label: '🪣 Jogo de baldes' }
    ],
    3: [ // Lista III – Eletros e Utilidades (limite 1)
      { id: 'L3_tabua_passar', label: '👕 Tábua de passar roupa' },
      { id: 'L3_ferro', label: '🔌 Ferro de passar roupa' },
      { id: 'L3_tabua_cortar', label: '🔪 Tábua de cortar carne' },
      { id: 'L3_panela_pressao', label: '🍲 Panela de pressão' },
      { id: 'L3_panela_arroz', label: '🍚 Panela elétrica de arroz' },
      { id: 'L3_liquidificador', label: '🥤 Liquidificador' },
      { id: 'L3_sanduicheira', label: '🥪 Sanduicheira' },
      { id: 'L3_batedeira', label: '🎂 Batedeira' },
      { id: 'L3_mixer', label: '🌀 Mixer' },
      { id: 'L3_triturador', label: '🔪 Triturador elétrico ou manual' },
      { id: 'L3_espremedor', label: '🍊 Espremedor de frutas' },
      { id: 'L3_boleira', label: '🍰 Boleira' },
      { id: 'L3_cesto_roupa', label: '🧺 Cesto para roupa suja' },
      { id: 'L3_chaleira', label: '☕ Chaleira elétrica' },
      { id: 'L3_airfryer', label: '🍟 Air-Fryer' },
      { id: 'L3_umidificador', label: '💨 Umidificador' },
      { id: 'L3_pillow', label: '🛏️ Pillow cama de casal' },
      { id: 'L3_lixeira', label: '🚮 Lixeira para banheiro' },
      { id: 'L3_mop', label: '🧹 Mop giratório' },
      { id: 'L3_ralador', label: '🥒 Ralador de legumes' },
      { id: 'L3_cafeteira', label: '☕ Cafeteira' },
      { id: 'L3_cuscuseira', label: '🌽 Cuscuseira' },
      { id: 'L3_escorredor', label: '🍽️ Escorredor de louça' },
      { id: 'L3_martelo_carne', label: '🔨 Martelo para carne' },
      { id: 'L3_copo_medidor', label: '🧴 Copo medidor' },
      { id: 'L3_varal', label: '🧺 Varal de chão dobrável' },
      { id: 'L3_descascador', label: '🥕 Descascador de legumes' },
      { id: 'L3_garrafa_termica', label: '🧊 Garrafa térmica' },
      { id: 'L3_afiador', label: '🔪 Afiador de facas' },
      { id: 'L3_amassador', label: '🥔 Amassador de batatas' },
      { id: 'L3_tupperware', label: '🥡 Potes tupperware' },
      { id: 'L3_escova_sanitario', label: '🚽 Escova limpa sanitário' },
      { id: 'L3_acucareiro', label: '🍬 Açucareiro' },
      { id: 'L3_saleiro', label: '🧂 Saleiro' },
      { id: 'L3_cortador_pizza', label: '🍕 Cortador de pizza' },
      { id: 'L3_descanso_panelas', label: '🔥 Descanso para panelas' }
    ]
  },

  // Limites por lista: lista 1 e 2 -> 2; lista 3 -> 1
  LIMITS: {
    1: 2,
    2: 2,
    3: 1
  }
};

// pistas.js — DADOS das pistas. Para criar uma pista nova, edite só este arquivo.
//
// Cada pista é um objeto com:
//   nome     — aparece nos menus.
//   largura  — largura do asfalto, em pixels.
//   borda    — faixa de grama entre o asfalto e o muro, em pixels.
//   setores  — em quantos trechos a volta é dividida para validar a volta
//              (o kart precisa passar por todos, em ordem; ver corrida.js).
//   pontos   — o traçado CENTRAL da pista, como [x, y], na ordem em que se
//              corre. A pista é fechada: depois do último ponto ela volta ao
//              primeiro. O PRIMEIRO ponto é a linha de chegada.
//              Não precisa de muitos pontos: o código suaviza as curvas
//              entre eles (ver Pista.suavizar em pista.js).
//   obstaculos (opcional) — lista de { tipo, x, y, raio }, com tipo:
//              'grama' — mancha de grama que deixa o kart lento;
//              'oleo'  — poça que faz o kart rodopiar e derrapar;
//              'turbo' — placa que dá um empurrão e mais velocidade.
//              A placa de turbo se alinha sozinha com a direção da pista.
//
// Dicas: y cresce para baixo. Deixe trechos diferentes da pista afastados
// pelo menos (largura + 2 × borda + 30) um do outro, senão os muros se fundem.
// Curvas feitas com pontos a 45° num círculo de raio R ficam bem redondas.

const PISTAS = [
  {
    nome: 'Oval da Largada',
    largura: 180,
    borda: 70,
    setores: 12,
    // Um "estádio": duas retas ligadas por meias-voltas de raio 450.
    pontos: [
      [900, 200], [1300, 200], [1700, 200], [2000, 200],   // reta de cima →
      [2318, 332], [2450, 650], [2318, 968],                 // curva da direita
      [2000, 1100], [1600, 1100], [1300, 1100], [900, 1100], [600, 1100], // reta de baixo ←
      [282, 968], [150, 650], [282, 332],                   // curva da esquerda
      [600, 200],
    ],
  },
  {
    nome: 'Serpente de Grama',
    largura: 150,
    borda: 45,
    setores: 16,
    // Zigue-zague com três "grampos" (meias-voltas fechadas, raio 140)
    // e uma grande curva à esquerda para voltar à largada.
    // Perto das curvas os pontos ficam mais juntos (~150 px): um salto
    // grande no espaçamento logo depois de uma curva entorta a suavização.
    pontos: [
      [600, 250], [1100, 250], [1550, 250], [1850, 250], [2000, 250], // reta de cima →
      [2099, 291], [2140, 390], [2099, 489],                          // grampo 1
      [2000, 530], [1850, 530], [1550, 530], [1150, 530], [1000, 530], // reta ←
      [901, 571], [860, 670], [901, 769],                             // grampo 2
      [1000, 810], [1150, 810], [1450, 810], [1850, 810], [2000, 810], // reta →
      [2099, 851], [2140, 950], [2099, 1049],                         // grampo 3
      [2000, 1090], [1850, 1090], [1500, 1090], [1000, 1090], [600, 1090], // reta de baixo ←
      [303, 987], [180, 670], [303, 353],                             // curvão da esquerda
    ],
    obstaculos: [
      // Grama no lado de dentro de cada grampo: castiga quem corta a curva.
      { tipo: 'grama', x: 2075, y: 390, raio: 42 },
      { tipo: 'grama', x: 925, y: 670, raio: 42 },
      { tipo: 'grama', x: 2075, y: 950, raio: 42 },
      // Manchas nas retas, encostadas numa das bordas.
      { tipo: 'grama', x: 1350, y: 285, raio: 38 },
      { tipo: 'grama', x: 1500, y: 775, raio: 38 },
      { tipo: 'grama', x: 1250, y: 1055, raio: 38 },
      { tipo: 'grama', x: 225, y: 670, raio: 38 },
    ],
  },
  {
    nome: 'Trilha do Óleo',
    largura: 115,
    borda: 40,
    setores: 20,
    // Estreita e sinuosa: uma volta grande com uma serpentina no meio.
    pontos: [
      [500, 200], [800, 200], [1100, 300], [1400, 200], [1750, 200], // cima, com lombada
      [2000, 260], [2100, 450], [1980, 620],                         // desce à direita
      [1700, 650], [1400, 600], [1150, 680],                         // serpentina ←
      [1000, 880],                                                   // grampo
      [1150, 1080], [1450, 1060], [1750, 1100],                      // serpentina →
      [2000, 1200], [2100, 1400], [1950, 1560],                      // desce à direita
      [1650, 1550], [1300, 1460], [950, 1550], [600, 1470],          // baixo, ondulado ←
      [420, 1250], [460, 980], [360, 720], [300, 450], [360, 260],   // sobe à esquerda
    ],
    obstaculos: [
      { tipo: 'turbo', x: 650, y: 200, raio: 30 },
      { tipo: 'oleo', x: 1100, y: 290, raio: 24 },
      { tipo: 'oleo', x: 1560, y: 215, raio: 22 },
      { tipo: 'oleo', x: 1020, y: 860, raio: 24 },
      { tipo: 'turbo', x: 1450, y: 1060, raio: 30 },
      { tipo: 'oleo', x: 2085, y: 1380, raio: 22 },
      { tipo: 'oleo', x: 1300, y: 1470, raio: 24 },
      { tipo: 'turbo', x: 800, y: 1515, raio: 30 },
      { tipo: 'oleo', x: 450, y: 1000, raio: 22 },
      { tipo: 'turbo', x: 330, y: 560, raio: 30 },
    ],
  },
];

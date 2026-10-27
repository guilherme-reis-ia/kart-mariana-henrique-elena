// pistas.js — DADOS das pistas. Para criar uma pista nova, edite só este arquivo.
//
// Cada pista é um objeto com:
//   nome     — aparece nos menus.
//   largura  — largura do asfalto, em pixels.
//   borda    — faixa de grama entre o asfalto e o muro, em pixels.
//   setores  — em quantos trechos a volta é dividida para validar a volta
//              (o kart precisa passar por todos, em ordem; ver jogo.js).
//   pontos   — o traçado CENTRAL da pista, como [x, y], na ordem em que se
//              corre. A pista é fechada: depois do último ponto ela volta ao
//              primeiro. O PRIMEIRO ponto é a linha de chegada.
//              Não precisa de muitos pontos: o código suaviza as curvas
//              entre eles (ver Pista.suavizar em pista.js).
//
// Dicas: y cresce para baixo. Deixe trechos diferentes da pista afastados
// pelo menos (largura + 2 × borda) um do outro, senão os muros se fundem.

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
];

// personagens.js — os três pilotos.
//
// "fisica" troca os valores padrão do Kart (ver kart.js). Cada um é melhor
// em uma coisa e um pouco pior nas outras, para que ninguém seja o melhor
// em tudo:
//   - Mariana: maior velocidade máxima, mas demora a embalar e vira menos.
//   - Henrique: arranca muito rápido (ótimo depois de batidas e na grama).
//   - Elena: vira mais e escorrega menos (ótima nas pistas sinuosas).
// "notas" servem só para as barrinhas da tela de escolha.

const PERSONAGENS = [
  {
    nome: 'Mariana',
    inicial: 'M',
    cor: '#e63946',
    destaque: 'Velocidade máxima',
    fisica: { velocidadeMaxima: 382, aceleracao: 370, giro: 2.85, aderencia: 8.5 },
    notas: { Velocidade: 5, 'Aceleração': 2, Curvas: 2 },
  },
  {
    nome: 'Henrique',
    inicial: 'H',
    cor: '#3a86ff',
    destaque: 'Aceleração',
    fisica: { velocidadeMaxima: 354, aceleracao: 560, giro: 3.0, aderencia: 9 },
    notas: { Velocidade: 3, 'Aceleração': 5, Curvas: 3 },
  },
  {
    nome: 'Elena',
    inicial: 'E',
    cor: '#9b5de5',
    destaque: 'Controle nas curvas',
    fisica: { velocidadeMaxima: 356, aceleracao: 400, giro: 3.45, aderencia: 12 },
    notas: { Velocidade: 3, 'Aceleração': 3, Curvas: 5 },
  },
];

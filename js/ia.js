// ia.js — pilotos controlados pelo computador.
//
// A IA não "trapaceia": ela produz os mesmos comandos que o teclado
// (acelerar, frear, esquerda, direita) e o kart dela obedece à mesma física.
// A cada quadro ela responde a duas perguntas:
//   1. Para onde virar?  Mira num ponto do traçado um pouco à frente,
//                        desviando de óleo e grama (e buscando turbos).
//   2. Quão rápido ir?   Olha as curvas que vêm aí e freia a tempo.

// O que muda entre as dificuldades é só o comportamento dos adversários.
const DIFICULDADES = {
  facil: {
    nome: 'Fácil',
    ritmo: 0.88,       // fração da velocidade máxima do kart
    margemCurva: 0.8,  // quanto da velocidade "possível" na curva ela usa
    imprecisao: 35,    // quanto (px) ela se desvia do traçado ideal
    chanceErro: 0.3,   // chance de entrar rápido demais numa curva
    chanceDesvio: 0.4, // chance de desviar de cada óleo/grama
    buscaTurbo: false, // mira nas placas de turbo?
  },
  dificil: {
    nome: 'Difícil',
    ritmo: 1.03,
    margemCurva: 0.95,
    imprecisao: 8,
    chanceErro: 0.04,
    chanceDesvio: 0.95,
    buscaTurbo: true,
  },
};

// Diferença entre dois ângulos, sempre entre -π e π (o caminho mais curto).
// Sem isso, ir de 350° para 10° pareceria uma volta de -340° em vez de +20°.
function diferencaAngulo(de, para) {
  let d = (para - de) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

class PilotoIA {
  // faixa: de -1 (esquerda) a 1 (direita), o lado da pista que este piloto
  // prefere. Pilotos em faixas diferentes se atrapalham menos.
  constructor(dificuldade, faixa) {
    this.d = DIFICULDADES[dificuldade];
    this.faixa = faixa;
    this.fase = Math.random() * 100;
    this.tempo = 0;
    this.tempoParado = 0;
    this.tempoManobra = 0;
    this.tempoErro = 0;
    this.vendoCurva = false;
    // Para cada obstáculo, a decisão de desviar ou não (sorteada uma vez
    // por volta, para o piloto não ficar "indeciso" a cada quadro).
    this.decisoes = new Map();
  }

  comandos(kart, pista, info, dt) {
    this.tempo += dt;
    const v = kart.velocidade;

    // --- 1. Para onde virar ---------------------------------------------
    // Quanto mais rápido, mais longe ela olha (como uma pessoa faria).
    // O alvo é deslocado para o lado preferido, mais uma oscilação lenta
    // que imita a imprecisão de um piloto humano.
    const olhar = 50 + v * 0.35;
    let desvio = this.faixa * pista.largura * 0.2 +
      Math.sin(this.tempo * 0.7 + this.fase) * this.d.imprecisao;
    desvio = this.ajustarParaObstaculos(desvio, kart, pista, info);
    const alvo = pista.pontoEm(info.s + olhar);
    const tx = alvo.x - Math.sin(alvo.angulo) * desvio;
    const ty = alvo.y + Math.cos(alvo.angulo) * desvio;
    const erroDirecao = diferencaAngulo(kart.angulo, Math.atan2(ty - kart.y, tx - kart.x));

    // --- Destravar ------------------------------------------------------
    // Se ficou quase parado por um tempo (preso no muro ou em outro kart),
    // dá ré por um instante. De ré a direção inverte, então para apontar
    // o bico para o alvo ela vira o volante para o lado OPOSTO.
    if (this.tempoManobra > 0) {
      this.tempoManobra -= dt;
      return { frear: true, esquerda: erroDirecao > 0, direita: erroDirecao < 0 };
    }
    this.tempoParado = v < 25 ? this.tempoParado + dt : 0;
    if (this.tempoParado > 0.8) {
      this.tempoParado = 0;
      this.tempoManobra = 0.9;
    }

    // --- 2. Quão rápido ir ----------------------------------------------
    // Curvatura k = quanto a pista vira por pixel percorrido. Andando a v,
    // fazer a curva exige girar v·k rad/s, e o kart gira no máximo
    // giro·(1 − perdaGiro·v/vmax) (ver Kart.taxaDeGiro). Igualando os dois
    // e isolando v, sai a maior velocidade que ainda faz a curva:
    //      v = (giro/k) / (1 + perdaGiro·giro / (k·vmax))
    // Para uma curva a uma distância d, ainda dá tempo de frear: pela física
    // (v² = v0² + 2·a·d), hoje podemos estar a sqrt(vCurva² + 2·freio·d).
    let margem = this.d.margemCurva;
    if (this.tempoErro > 0) {
      this.tempoErro -= dt;
      margem *= 1.35; // errando: entra na curva rápido demais
    }
    let limite = Infinity;
    for (let d = 0; d <= 500; d += 25) {
      const a = pista.pontoEm(info.s + d);
      const b = pista.pontoEm(info.s + d + 40);
      const k = Math.max(Math.abs(diferencaAngulo(a.angulo, b.angulo)) / 40, 1e-4);
      const vCurva = (kart.giro / k) / (1 + (kart.perdaGiro * kart.giro) / (k * kart.velocidadeMaxima)) * margem;
      limite = Math.min(limite, Math.sqrt(vCurva * vCurva + 2 * kart.forcaFreio * 0.6 * d));
    }

    // Ao avistar uma curva que pede freio, às vezes decide errar.
    const temCurva = limite < kart.velocidadeMaxima * 0.9;
    if (temCurva && !this.vendoCurva && Math.random() < this.d.chanceErro) {
      this.tempoErro = 1.2;
    }
    this.vendoCurva = temCurva;

    const velocidadeAlvo = Math.min(kart.velocidadeMaxima * (kart.tempoTurbo > 0 ? 1.3 : 1), limite);
    const frente = kart.vx * Math.cos(kart.angulo) + kart.vy * Math.sin(kart.angulo);
    return {
      acelerar: frente < velocidadeAlvo - 5,
      frear: frente > velocidadeAlvo + 25,
      esquerda: erroDirecao < -0.04,
      direita: erroDirecao > 0.04,
    };
  }

  // Olha os obstáculos dos próximos ~280 px de pista. Se o caminho
  // planejado (desvio) passa por cima de óleo ou grama, empurra o desvio
  // para o lado com mais espaço. Se for um turbo (e a dificuldade manda),
  // mira nele.
  ajustarParaObstaculos(desvio, kart, pista, info) {
    const meia = pista.largura / 2 - Kart.RAIO - 4;
    for (const o of pista.obstaculos) {
      let frente = o.s - info.s;
      if (frente < 0) frente += pista.comprimento; // obstáculo depois da linha
      if (frente > 280) continue;

      const chave = `${kart.volta}:${o.s}`;
      if (!this.decisoes.has(chave)) {
        const quer = o.tipo === 'turbo' ? this.d.buscaTurbo : Math.random() < this.d.chanceDesvio;
        this.decisoes.set(chave, quer);
      }
      if (!this.decisoes.get(chave)) continue;

      if (o.tipo === 'turbo') {
        desvio = o.lado;
      } else if (Math.abs(desvio - o.lado) < o.raio + Kart.RAIO + 6) {
        // Passa pelo lado do obstáculo que fica mais perto do centro.
        const lado = o.lado > 0 ? -1 : 1;
        desvio = o.lado + lado * (o.raio + Kart.RAIO + 10);
      }
    }
    return Math.max(-meia, Math.min(meia, desvio));
  }
}

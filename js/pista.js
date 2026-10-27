// pista.js — transforma os dados de uma pista (pistas.js) em geometria:
// traçado suavizado, colisão com o muro, grama, setores e desenho.

class Pista {
  constructor(dados) {
    this.nome = dados.nome;
    this.largura = dados.largura;
    this.borda = dados.borda;
    this.numSetores = dados.setores;

    // "amostras" são pontos bem próximos (~10 px) ao longo do traçado
    // central. Para cada uma guardamos a distância percorrida desde a
    // largada (s), o tamanho do trecho até a próxima (comp) e a direção.
    this.amostras = Pista.suavizar(dados.pontos);
    const n = this.amostras.length;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const a = this.amostras[i];
      const b = this.amostras[(i + 1) % n];
      a.s = s;
      a.comp = Math.hypot(b.x - a.x, b.y - a.y);
      a.angulo = Math.atan2(b.y - a.y, b.x - a.x);
      s += a.comp;
    }
    this.comprimento = s;

    this.criarImagem();
  }

  // Curva de Catmull-Rom: passa EXATAMENTE pelos pontos dados e cria curvas
  // suaves entre eles. Cada trecho entre p1 e p2 usa também o vizinho
  // anterior (p0) e o seguinte (p3) para decidir a "inclinação" da curva.
  static suavizar(pontos, passo = 10) {
    const n = pontos.length;
    const saida = [];
    for (let i = 0; i < n; i++) {
      const p0 = pontos[(i - 1 + n) % n];
      const p1 = pontos[i];
      const p2 = pontos[(i + 1) % n];
      const p3 = pontos[(i + 2) % n];
      const passos = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / passo));
      for (let k = 0; k < passos; k++) {
        const t = k / passos, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t +
          (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
        saida.push({
          x: f(p0[0], p1[0], p2[0], p3[0]),
          y: f(p0[1], p1[1], p2[1], p3[1]),
        });
      }
    }
    return saida;
  }

  // Encontra o ponto do traçado central mais próximo de (x, y).
  // Para cada pequeno segmento a→b, "projetamos" o ponto sobre ele
  // (produto escalar) e ficamos com o mais perto de todos.
  // Retorna onde está esse ponto, a distância até ele, quanto da volta
  // ele representa (s) e em qual setor ele cai.
  maisProximo(x, y) {
    const am = this.amostras;
    const n = am.length;
    let melhorD2 = Infinity, mi = 0, mt = 0, mx = 0, my = 0;
    for (let i = 0; i < n; i++) {
      const a = am[i], b = am[(i + 1) % n];
      const dx = b.x - a.x, dy = b.y - a.y;
      let t = ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a.x + dx * t, py = a.y + dy * t;
      const d2 = (x - px) * (x - px) + (y - py) * (y - py);
      if (d2 < melhorD2) { melhorD2 = d2; mi = i; mt = t; mx = px; my = py; }
    }
    const s = am[mi].s + am[mi].comp * mt;
    return {
      x: mx,
      y: my,
      distancia: Math.sqrt(melhorD2),
      s,
      setor: Math.floor((s / this.comprimento) * this.numSetores) % this.numSetores,
    };
  }

  // Ponto do traçado central a uma distância s da linha de chegada.
  pontoEm(s) {
    s = ((s % this.comprimento) + this.comprimento) % this.comprimento;
    const am = this.amostras;
    // Busca binária: as amostras estão em ordem de s, então a cada passo
    // descartamos metade delas (~10 passos em vez de centenas).
    let i = 0, fim = am.length - 1;
    while (i < fim) {
      const meio = (i + fim + 1) >> 1;
      if (am[meio].s <= s) i = meio; else fim = meio - 1;
    }
    const t = (s - am[i].s) / am[i].comp;
    const b = am[(i + 1) % am.length];
    return { x: am[i].x + (b.x - am[i].x) * t, y: am[i].y + (b.y - am[i].y) * t, angulo: am[i].angulo };
  }

  // Posição de largada: "atras" pixels antes da linha, deslocada para o
  // lado (lateral > 0 = à direita de quem corre).
  posicaoDeLargada(atras, lateral = 0) {
    const p = this.pontoEm(-atras);
    return {
      x: p.x - Math.sin(p.angulo) * lateral,
      y: p.y + Math.cos(p.angulo) * lateral,
      angulo: p.angulo,
    };
  }

  // Colisão com a pista, chamada depois que o kart se moveu.
  //  - Longe do centro mais que meia largura: está na grama (fica lento).
  //  - Longe demais: bateu no muro. Empurramos o kart de volta para dentro
  //    e cancelamos a parte da velocidade que apontava para fora do muro.
  colidir(kart) {
    const info = this.maisProximo(kart.x, kart.y);
    kart.naGrama = info.distancia > this.largura / 2;

    const limite = this.largura / 2 + this.borda - Kart.RAIO;
    if (info.distancia > limite) {
      // n = vetor de tamanho 1 que aponta do centro da pista para o kart,
      // ou seja, perpendicular ao muro, para fora.
      const nx = (kart.x - info.x) / info.distancia;
      const ny = (kart.y - info.y) / info.distancia;
      kart.x = info.x + nx * limite;
      kart.y = info.y + ny * limite;
      const paraFora = kart.vx * nx + kart.vy * ny;
      if (paraFora > 0) {
        // Tira a parte "para fora" e devolve 30% dela como quique;
        // o resto da velocidade (rente ao muro) perde um pouco pelo atrito.
        kart.vx = (kart.vx - 1.3 * paraFora * nx) * 0.85;
        kart.vy = (kart.vy - 1.3 * paraFora * ny) * 0.85;
      }
    }
    return info;
  }

  // Desenhar centenas de pontos a cada quadro seria desperdício: a pista
  // não muda. Então desenhamos UMA vez numa imagem fora da tela e depois
  // só "colamos" essa imagem a cada quadro.
  criarImagem() {
    const folga = this.largura / 2 + this.borda + 300;
    const xs = this.amostras.map((a) => a.x), ys = this.amostras.map((a) => a.y);
    this.minX = Math.floor(Math.min(...xs) - folga);
    this.minY = Math.floor(Math.min(...ys) - folga);
    const largura = Math.ceil(Math.max(...xs) + folga) - this.minX;
    const altura = Math.ceil(Math.max(...ys) + folga) - this.minY;

    this.imagem = document.createElement('canvas');
    this.imagem.width = largura;
    this.imagem.height = altura;
    const c = this.imagem.getContext('2d');
    c.translate(-this.minX, -this.minY);

    // Fora da pista: mato com tufos espalhados. Usamos um sorteio com
    // "semente" fixa para os tufos ficarem sempre no mesmo lugar.
    c.fillStyle = Pista.COR_FORA;
    c.fillRect(this.minX, this.minY, largura, altura);
    const sorteio = semente(7);
    c.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let k = 0; k < (largura * altura) / 2500; k++) {
      c.beginPath();
      c.arc(this.minX + sorteio() * largura, this.minY + sorteio() * altura, 3 + sorteio() * 6, 0, Math.PI * 2);
      c.fill();
    }

    // A pista é o traçado central desenhado com linhas cada vez mais finas,
    // uma por cima da outra: muro, grama, zebra e asfalto.
    const tracar = () => {
      c.beginPath();
      for (const a of this.amostras) c.lineTo(a.x, a.y);
      c.closePath();
    };
    c.lineJoin = 'round';
    const camada = (cor, espessura, tracejado = []) => {
      tracar();
      c.strokeStyle = cor;
      c.lineWidth = espessura;
      c.setLineDash(tracejado);
      // Ponta arredondada estende cada traço em meia espessura da linha:
      // numa linha grossa tracejada, isso cobriria os vãos (a zebra
      // ficaria toda branca). Por isso só a usamos em linhas contínuas.
      c.lineCap = tracejado.length ? 'butt' : 'round';
      c.stroke();
    };
    const larguraMuro = this.largura + 2 * this.borda;
    camada('#9aa0a6', larguraMuro + 28);            // muro
    camada('#5f6368', larguraMuro + 28, [6, 18]);   // pneus no muro
    camada('#5cae4f', larguraMuro);                 // grama
    camada('#d62828', this.largura + 18);           // zebra vermelha...
    camada('#ffffff', this.largura + 18, [22, 22]); // ...com listras brancas
    camada('#50555c', this.largura);                // asfalto
    camada('rgba(255, 255, 255, 0.35)', 3, [30, 30]); // faixa central
    c.setLineDash([]);

    // Linha de chegada quadriculada, perpendicular à pista no ponto s = 0.
    const p = this.pontoEm(0);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.angulo);
    const q = 12;
    for (let lado = -this.largura / 2, linha = 0; lado < this.largura / 2; lado += q, linha++) {
      for (let col = 0; col < 2; col++) {
        c.fillStyle = (linha + col) % 2 ? '#111' : '#fff';
        c.fillRect(-q + col * q, lado, q, Math.min(q, this.largura / 2 - lado));
      }
    }
    c.restore();
  }

  desenhar(ctx) {
    ctx.drawImage(this.imagem, this.minX, this.minY);
  }

  // Mostra as linhas que separam os setores (tecla C). O próximo setor
  // que o kart precisa alcançar aparece em amarelo.
  desenharSetores(ctx, proximoSetor) {
    ctx.save();
    ctx.lineWidth = 4;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let k = 0; k < this.numSetores; k++) {
      const p = this.pontoEm((k / this.numSetores) * this.comprimento);
      const nx = -Math.sin(p.angulo) * (this.largura / 2);
      const ny = Math.cos(p.angulo) * (this.largura / 2);
      const cor = k === proximoSetor ? '#ffd60a' : 'rgba(255, 255, 255, 0.5)';
      ctx.strokeStyle = cor;
      ctx.beginPath();
      ctx.moveTo(p.x - nx, p.y - ny);
      ctx.lineTo(p.x + nx, p.y + ny);
      ctx.stroke();
      ctx.fillStyle = cor;
      ctx.fillText(String(k), p.x + nx * 1.25, p.y + ny * 1.25);
    }
    ctx.restore();
  }
}

Pista.COR_FORA = '#2f5d2a';

// Montar uma pista (e sua imagem) leva alguns milissegundos; guardamos
// cada uma pronta para reaproveitar quando a corrida recomeça.
Pista.prontas = new Map();
Pista.obter = function (dados) {
  if (!Pista.prontas.has(dados)) Pista.prontas.set(dados, new Pista(dados));
  return Pista.prontas.get(dados);
};

// Gerador de números "aleatórios" previsível (mulberry32): a mesma semente
// sempre produz a mesma sequência. Math.random() não permite isso.
function semente(valor) {
  return function () {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

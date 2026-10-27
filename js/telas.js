// telas.js — os menus antes da corrida:
//   início → personagem → dificuldade → fase → (corrida)
//
// Cada tela é um objeto com dois métodos, atualizar(dt) e desenhar(ctx, w, h)
// — exatamente como a Corrida. Assim o jogo.js não precisa saber se está
// mostrando um menu ou uma corrida: ele só chama esses dois métodos na
// "cena" atual. As telas usam `escolha` e `irPara`, definidos em jogo.js.

const Telas = {
  inicial() {
    let t = 0;
    return {
      atualizar(dt) {
        t += dt;
        if (Entrada.tocou('Enter', 'Space')) irPara(Telas.personagem());
      },
      desenhar(ctx, w, h) {
        fundoDeMenu(ctx, w, h, t);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 84px system-ui, sans-serif';
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#14161c';
        ctx.strokeText('FAMÍLIA KART', w / 2, 150);
        ctx.fillStyle = '#ffd60a';
        ctx.fillText('FAMÍLIA KART', w / 2, 150);
        ctx.font = '26px system-ui, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText('Mariana, Henrique e Elena', w / 2, 215);

        // Texto piscando: visível na primeira metade de cada segundo.
        if (t % 1 < 0.6) {
          ctx.font = 'bold 30px system-ui, sans-serif';
          ctx.fillText('Aperte Enter para começar', w / 2, 340);
        }
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('Setas ou WASD: dirigir  ·  R: reiniciar corrida  ·  Esc: voltar', w / 2, 410);
      },
    };
  },

  personagem() {
    // Um kart "de vitrine" por personagem, só para desenhar.
    const vitrine = PERSONAGENS.map((p) => new Kart({ x: 0, y: 0, angulo: -Math.PI / 2, ...p }));
    return telaDeEscolha({
      titulo: 'Escolha seu piloto',
      itens: PERSONAGENS,
      inicial: PERSONAGENS.indexOf(escolha.personagem),
      alturaCartao: 340,
      aoEscolher(p) { escolha.personagem = p; irPara(Telas.dificuldade()); },
      aoVoltar() { irPara(Telas.inicial()); },
      desenharItem(ctx, p, x, y, w, h, selecionado, t) {
        const k = vitrine[PERSONAGENS.indexOf(p)];
        ctx.save();
        ctx.translate(x + w / 2, y + 85);
        ctx.scale(2.6, 2.6);
        if (selecionado) ctx.rotate(Math.sin(t * 4) * 0.15);
        k.desenhar(ctx);
        ctx.restore();

        ctx.textAlign = 'center';
        ctx.fillStyle = p.cor;
        ctx.font = 'bold 30px system-ui, sans-serif';
        ctx.fillText(p.nome, x + w / 2, y + 168);
        ctx.fillStyle = '#ddd';
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillText(p.destaque, x + w / 2, y + 198);

        // Barrinhas de 1 a 5 para cada atributo.
        Object.entries(p.notas).forEach(([nome, nota], i) => {
          const linha = y + 236 + i * 32;
          ctx.textAlign = 'left';
          ctx.fillStyle = '#bbb';
          ctx.font = '14px system-ui, sans-serif';
          ctx.fillText(nome, x + 20, linha);
          for (let b = 0; b < 5; b++) {
            ctx.fillStyle = b < nota ? p.cor : 'rgba(255, 255, 255, 0.12)';
            ctx.fillRect(x + 110 + b * 22, linha - 8, 18, 16);
          }
        });
      },
    });
  },

  dificuldade() {
    const itens = [
      { id: 'facil', linhas: ['Adversários mais lentos', 'e que erram curvas.', 'Bom para aprender.'], cor: '#06d6a0' },
      { id: 'dificil', linhas: ['Adversários rápidos', 'e precisos. Errou uma', 'curva, ficou para trás.'], cor: '#ef476f' },
    ];
    return telaDeEscolha({
      titulo: 'Escolha a dificuldade',
      itens,
      inicial: itens.findIndex((d) => d.id === escolha.dificuldade),
      alturaCartao: 240,
      aoEscolher(d) { escolha.dificuldade = d.id; irPara(Telas.fase()); },
      aoVoltar() { irPara(Telas.personagem()); },
      desenharItem(ctx, d, x, y, w) {
        ctx.textAlign = 'center';
        ctx.fillStyle = d.cor;
        ctx.font = 'bold 40px system-ui, sans-serif';
        ctx.fillText(DIFICULDADES[d.id].nome, x + w / 2, y + 60);
        ctx.fillStyle = '#ddd';
        ctx.font = '18px system-ui, sans-serif';
        d.linhas.forEach((l, i) => ctx.fillText(l, x + w / 2, y + 125 + i * 28));
      },
    });
  },

  fase() {
    const bloqueada = (dados) => !Progresso.liberada(PISTAS.indexOf(dados));
    const atual = PISTAS.indexOf(escolha.pista);
    return telaDeEscolha({
      titulo: 'Escolha a fase',
      itens: PISTAS,
      inicial: Progresso.liberada(atual) ? atual : 0,
      alturaCartao: 260,
      bloqueado: bloqueada,
      aoEscolher(p) { escolha.pista = p; irPara(novaCorrida()); },
      aoVoltar() { irPara(Telas.dificuldade()); },
      desenharItem(ctx, dados, x, y, w) {
        const numero = PISTAS.indexOf(dados) + 1;
        desenharMiniatura(ctx, Pista.obter(dados), x + 20, y + 20, w - 40, 160);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.fillText(`${numero}. ${dados.nome}`, x + w / 2, y + 220);
        if (bloqueada(dados)) {
          ctx.fillStyle = 'rgba(10, 12, 20, 0.75)';
          ctx.fillRect(x + 20, y + 20, w - 40, 160);
          desenharCadeado(ctx, x + w / 2, y + 85);
          ctx.fillStyle = '#ddd';
          ctx.font = '14px system-ui, sans-serif';
          ctx.fillText(`Chegue em 1º ou 2º na fase ${numero - 1}`, x + w / 2, y + 150);
        }
      },
    });
  },
};

// Para liberar a próxima fase é preciso vencer ou chegar em 2º. Com só três
// karts, "pódio" (top 3) seria qualquer resultado, então usamos top 2.
const POSICAO_PARA_LIBERAR = 2;

// Chamado pela Corrida quando aparece a tela de resultado: decide a
// mensagem, libera a próxima fase e monta as opções do menu.
function aoTerminarCorrida(corrida) {
  const posicao = corrida.posicaoDe(corrida.jogador);
  const indice = PISTAS.indexOf(escolha.pista);
  const proxima = PISTAS[indice + 1];
  const opcoes = [];
  let mensagem;

  if (posicao <= POSICAO_PARA_LIBERAR) {
    if (proxima) {
      const nova = Progresso.liberarAte(indice + 2);
      mensagem = nova ? `Parabéns! Fase ${indice + 2} liberada!` : `Você chegou em ${posicao}º!`;
      opcoes.push({ texto: 'Próxima fase', acao: () => { escolha.pista = proxima; irPara(novaCorrida()); } });
    } else {
      mensagem = posicao === 1 ? 'Você venceu a última fase! Que corrida!' : 'Você terminou a última fase no pódio!';
    }
  } else {
    mensagem = proxima && !Progresso.liberada(indice + 1)
      ? `Chegue em 1º ou 2º para liberar a fase ${indice + 2}.`
      : 'Não foi dessa vez. Tente de novo!';
    if (proxima && Progresso.liberada(indice + 1)) {
      opcoes.push({ texto: 'Próxima fase', acao: () => { escolha.pista = proxima; irPara(novaCorrida()); } });
    }
  }
  opcoes.push(
    { texto: 'Correr de novo', acao: () => irPara(novaCorrida()) },
    { texto: 'Escolher fase', acao: () => irPara(Telas.fase()) },
    { texto: 'Menu inicial', acao: () => irPara(Telas.inicial()) },
  );
  return { mensagem, opcoes };
}

function desenharCadeado(ctx, x, y) {
  ctx.strokeStyle = '#ffd60a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y - 6, 14, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#ffd60a';
  ctx.fillRect(x - 20, y - 6, 40, 32);
  ctx.fillStyle = '#14161c';
  ctx.fillRect(x - 3, y + 4, 6, 12);
}

// Tela genérica de "escolha um entre vários cartões", usada por
// personagem, dificuldade e fase. Quem chama diz o que desenhar em cada
// cartão e o que fazer ao escolher ou voltar.
function telaDeEscolha({ titulo, itens, inicial = 0, alturaCartao, desenharItem, aoEscolher, aoVoltar, bloqueado = () => false }) {
  let selecionado = Math.max(0, inicial);
  let t = 0;
  return {
    atualizar(dt) {
      t += dt;
      const n = itens.length;
      if (Entrada.tocou('ArrowLeft', 'KeyA')) selecionado = (selecionado - 1 + n) % n;
      if (Entrada.tocou('ArrowRight', 'KeyD')) selecionado = (selecionado + 1) % n;
      if (Entrada.tocou('Enter', 'Space')) {
        if (!bloqueado(itens[selecionado])) aoEscolher(itens[selecionado]);
      }
      else if (Entrada.tocou('Escape')) aoVoltar();
    },
    desenhar(ctx, w, h) {
      fundoDeMenu(ctx, w, h, t);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.fillText(titulo, w / 2, 70);

      const larguraCartao = 260, espaco = 30;
      const total = itens.length * larguraCartao + (itens.length - 1) * espaco;
      const y = (h - alturaCartao) / 2 + 20;
      itens.forEach((item, i) => {
        const x = (w - total) / 2 + i * (larguraCartao + espaco);
        const sel = i === selecionado;
        ctx.fillStyle = sel ? '#2c313c' : '#181b22';
        ctx.beginPath();
        ctx.roundRect(x, y, larguraCartao, alturaCartao, 14);
        ctx.fill();
        if (sel) {
          ctx.strokeStyle = '#ffd60a';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
        ctx.textBaseline = 'middle';
        desenharItem(ctx, item, x, y, larguraCartao, alturaCartao, sel, t);
      });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('← →  escolher   ·   Enter  confirmar   ·   Esc  voltar', w / 2, h - 30);
    },
  };
}

// Fundo dos menus: um pedaço de pista com os três karts passando.
function fundoDeMenu(ctx, w, h, t) {
  ctx.fillStyle = Pista.COR_FORA;
  ctx.fillRect(0, 0, w, h);
  const y0 = h - 142, alt = 72;
  ctx.fillStyle = '#50555c';
  ctx.fillRect(0, y0, w, alt);
  // Zebras que "andam" para dar sensação de movimento.
  for (let x = -((t * 200) % 44); x < w; x += 44) {
    ctx.fillStyle = '#d62828';
    ctx.fillRect(x, y0 - 8, 22, 8);
    ctx.fillRect(x, y0 + alt, 22, 8);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 22, y0 - 8, 22, 8);
    ctx.fillRect(x + 22, y0 + alt, 22, 8);
  }
  PERSONAGENS.forEach((p, i) => {
    const velocidade = 160 + i * 35;
    const x = ((t * velocidade + i * 300) % (w + 200)) - 100;
    const k = new Kart({ x, y: y0 + 16 + i * 20, angulo: 0, ...p });
    k.desenhar(ctx);
  });
  ctx.fillStyle = 'rgba(10, 12, 20, 0.45)';
  ctx.fillRect(0, 0, w, h);
}

// Desenha o traçado de uma pista encolhido para caber num retângulo.
function desenharMiniatura(ctx, pista, x, y, w, h) {
  const xs = pista.amostras.map((a) => a.x), ys = pista.amostras.map((a) => a.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const escala = Math.min((w - 20) / (maxX - minX), (h - 20) / (maxY - minY));
  const ox = x + (w - (maxX - minX) * escala) / 2, oy = y + (h - (maxY - minY) * escala) / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(x, y, w, h);
  ctx.beginPath();
  for (const a of pista.amostras) ctx.lineTo(ox + (a.x - minX) * escala, oy + (a.y - minY) * escala);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = Math.max(3, pista.largura * escala);
  ctx.stroke();
  // Linha de chegada
  const a = pista.amostras[0];
  ctx.fillStyle = '#ffd60a';
  ctx.beginPath();
  ctx.arc(ox + (a.x - minX) * escala, oy + (a.y - minY) * escala, 5, 0, Math.PI * 2);
  ctx.fill();
}

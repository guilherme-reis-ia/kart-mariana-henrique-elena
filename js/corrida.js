// corrida.js — as regras de UMA corrida: largada, voltas, posições,
// colisão entre karts, chegada e resultado. Também desenha o painel (HUD).

const TOTAL_VOLTAS = 3;

class Corrida {
  // aoTerminar(corrida) é chamado quando a tela de resultado aparece e
  // devolve { mensagem, opcoes: [{ texto, acao }] } — quem decide o que
  // vem depois (liberar fase, ir para o menu...) é o telas.js.
  constructor({ dadosPista, jogador, dificuldade, aoTerminar }) {
    this.aoTerminar = aoTerminar;
    this.pista = Pista.obter(dadosPista);
    const p = this.pista;

    // Grid de largada: os adversários na frente e o jogador por último,
    // alternando os lados da pista (como no Mario Kart).
    const ordem = PERSONAGENS.filter((x) => x !== jogador).concat(jogador);
    this.karts = ordem.map((personagem, fila) => {
      const lado = fila % 2 ? 1 : -1;
      const k = new Kart({
        ...p.posicaoDeLargada(60 + fila * 70, lado * p.largura * 0.22),
        cor: personagem.cor,
        inicial: personagem.inicial,
        nome: personagem.nome,
        fisica: personagem.fisica,
      });
      // Estado de corrida de cada kart (ver atualizarVoltas e atualizarProgresso).
      k.volta = 0;
      k.proximoSetor = 0;
      k.tempoFinal = null;
      k.chegada = null;
      k.inicioVolta = 0;
      k.temposVolta = [];
      k.info = p.maisProximo(k.x, k.y);
      k.progresso = 0;
      if (personagem !== jogador) {
        k.piloto = new PilotoIA(dificuldade, lado * 0.5);
        k.velocidadeMaxima *= DIFICULDADES[dificuldade].ritmo;
      }
      return k;
    });
    this.jogador = this.karts[this.karts.length - 1];
    this.classificacao = this.karts.slice();

    // 'contagem' → 'correndo' → 'resultado'
    this.estado = 'contagem';
    this.contagem = 3;
    this.ultimoNumero = 4;  // para tocar um bip a cada número da contagem
    this.pausada = false;
    this.tempo = 0;
    this.chegadas = 0;
    this.esperaResultado = 2; // segundos entre a chegada e a tela de resultado
    this.camera = { x: this.jogador.x, y: this.jogador.y };
    this.efeitos = new Efeitos();
    this.aviso = null;         // { texto, tempo }: mensagem que aparece e some
    this.criarMinimapa();
  }

  atualizar(dt) {
    if (this.pausada) {
      Som.motor(null);
      return;
    }
    if (this.estado === 'resultado') this.escolherNoResultado();

    if (this.estado === 'contagem') {
      this.contagem -= dt;
      const numero = Math.ceil(this.contagem);
      if (numero !== this.ultimoNumero && numero > 0) Som.contagem();
      this.ultimoNumero = numero;
      if (this.contagem <= 0) {
        this.estado = 'correndo';
        Som.largada();
      }
    } else {
      this.tempo += dt;
    }

    // Antes do "JÁ!" e depois da chegada, os karts recebem comandos
    // vazios: a física continua rodando, mas ninguém acelera.
    const largou = this.estado !== 'contagem';
    const eu = this.jogador;
    const turboAntes = eu.tempoTurbo, oleoAntes = eu.tempoOleo;
    for (const k of this.karts) {
      let comandos = {};
      if (largou && k.tempoFinal === null) {
        comandos = k.piloto ? k.piloto.comandos(k, this.pista, k.info, dt) : Entrada.comandos();
      }
      k.atualizar(dt, comandos);
    }

    this.colisoesEntreKarts();
    for (const k of this.karts) {
      k.info = this.pista.colidir(k);
      this.atualizarVoltas(k);
      this.atualizarProgresso(k);
    }
    this.ordenar();

    // Sons do jogador: só tocamos o que acontece com o kart dele.
    if (eu.tempoTurbo > turboAntes + 0.3) Som.turbo();
    if (eu.tempoOleo > oleoAntes) Som.oleo();
    if (eu.info.batida > 90) Som.batida();
    Som.motor(this.estado === 'resultado' ? null : eu.velocidade / 380);

    if (this.estado === 'correndo' && eu.tempoFinal !== null) {
      this.esperaResultado -= dt;
      if (this.esperaResultado <= 0) {
        this.estado = 'resultado';
        this.final = this.aoTerminar(this);
        this.opcaoEscolhida = 0;
      }
    }
    if (this.aviso) {
      this.aviso.tempo -= dt;
      if (this.aviso.tempo <= 0) this.aviso = null;
    }
    this.efeitos.atualizar(dt, this.karts);
    this.atualizarCamera(dt);
  }

  // Menu da tela de resultado: ↑ ↓ escolhe, Enter confirma.
  escolherNoResultado() {
    const n = this.final.opcoes.length;
    if (Entrada.tocou('ArrowUp', 'KeyW')) { this.opcaoEscolhida = (this.opcaoEscolhida - 1 + n) % n; Som.menu(); }
    if (Entrada.tocou('ArrowDown', 'KeyS')) { this.opcaoEscolhida = (this.opcaoEscolhida + 1) % n; Som.menu(); }
    if (Entrada.tocou('Enter', 'Space')) this.final.opcoes[this.opcaoEscolhida].acao();
  }

  // Contagem de voltas à prova de atalhos.
  // A pista é dividida em setores numerados 0, 1, 2, ... a partir da linha de
  // chegada. Cada kart guarda qual é o PRÓXIMO setor que precisa alcançar e só
  // avança quando entra exatamente nele. Cortar caminho pula setores, e aí o
  // kart fica "devendo" até voltar para buscá-los. A volta só conta ao entrar
  // no setor 0 (cruzar a linha) depois de ter passado por todos, em ordem.
  atualizarVoltas(k) {
    if (k.info.setor !== k.proximoSetor) return;
    if (k.proximoSetor === 0) {
      k.volta++;
      if (k.volta > 1) k.temposVolta.push(this.tempo - k.inicioVolta);
      k.inicioVolta = this.tempo;
      if (k.volta > TOTAL_VOLTAS && k.tempoFinal === null) {
        k.tempoFinal = this.tempo;
        k.chegada = ++this.chegadas;
      }
      if (k === this.jogador) this.anunciarVolta(k);
    }
    k.proximoSetor = (k.proximoSetor + 1) % this.pista.numSetores;
  }

  anunciarVolta(k) {
    if (k.volta > TOTAL_VOLTAS) {
      Som.chegada();
    } else if (k.volta > 1) {
      Som.volta();
      const ultima = k.temposVolta[k.temposVolta.length - 1];
      const texto = k.volta === TOTAL_VOLTAS ? 'ÚLTIMA VOLTA!' : `Volta ${k.volta}/${TOTAL_VOLTAS}`;
      this.aviso = { texto, detalhe: `volta anterior ${formatarTempo(ultima)}`, tempo: 2.5 };
    }
  }

  // "Progresso" = quantos pixels de pista o kart já percorreu de verdade.
  // É o que decide quem está na frente. Duas proteções:
  //  - "volta - 1": a volta atual só começa a contar ao cruzar a linha;
  //  - o teto: um kart que pulou setores (atalho) não ganha a distância
  //    que pulou; ele conta só até o último setor validado.
  atualizarProgresso(k) {
    const L = this.pista.comprimento, N = this.pista.numSetores;
    const teto = ((k.proximoSetor === 0 ? N : k.proximoSetor) / N) * L;
    k.progresso = (k.volta - 1) * L + Math.min(k.info.s, teto);
  }

  ordenar() {
    this.classificacao.sort((a, b) => {
      if (a.chegada && b.chegada) return a.chegada - b.chegada;
      if (a.chegada || b.chegada) return a.chegada ? -1 : 1;
      return b.progresso - a.progresso;
    });
  }

  posicaoDe(kart) {
    return this.classificacao.indexOf(kart) + 1;
  }

  // Colisão entre karts, tratados como círculos de raio Kart.RAIO.
  // Para cada par que se sobrepõe:
  //  1. separamos os dois, metade para cada lado, ao longo da linha que
  //     une os centros (n);
  //  2. se estão se aproximando, trocamos parte da velocidade ao longo de n
  //     (um "empurrão" igual e oposto — mesma massa para todos).
  colisoesEntreKarts() {
    const minimo = Kart.RAIO * 2;
    for (let i = 0; i < this.karts.length; i++) {
      for (let j = i + 1; j < this.karts.length; j++) {
        const a = this.karts[i], b = this.karts[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= minimo || d === 0) continue;
        const nx = dx / d, ny = dy / d;
        const sobra = (minimo - d) / 2;
        a.x -= nx * sobra; a.y -= ny * sobra;
        b.x += nx * sobra; b.y += ny * sobra;
        const aproximacao = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (aproximacao < 0) {
          const impulso = (-(1 + 0.3) * aproximacao) / 2; // 0.3 = quique
          a.vx -= impulso * nx; a.vy -= impulso * ny;
          b.vx += impulso * nx; b.vy += impulso * ny;
          if (aproximacao < -60 && (a === this.jogador || b === this.jogador)) Som.batida();
        }
      }
    }
  }

  // A câmera persegue um ponto um pouco À FRENTE do jogador (na direção da
  // velocidade), para ele ver melhor o que vem pela frente. Ela não pula
  // para lá: a cada quadro anda uma fração da distância que falta.
  atualizarCamera(dt) {
    const k = this.jogador;
    const suavidade = 1 - Math.exp(-5 * dt);
    this.camera.x += (k.x + k.vx * 0.35 - this.camera.x) * suavidade;
    this.camera.y += (k.y + k.vy * 0.35 - this.camera.y) * suavidade;
  }

  // O minimapa é a pista inteira encolhida. Calculamos a escala e o
  // contorno uma vez só (Path2D guarda o caminho pronto para redesenhar).
  criarMinimapa() {
    const am = this.pista.amostras;
    const xs = am.map((a) => a.x), ys = am.map((a) => a.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const larg = Math.max(...xs) - minX, alt = Math.max(...ys) - minY;
    const escala = Math.min(176 / larg, 106 / alt);
    const caminho = new Path2D();
    for (const a of am) caminho.lineTo((a.x - minX) * escala, (a.y - minY) * escala);
    caminho.closePath();
    this.mapa = { minX, minY, escala, caminho, larg: larg * escala, alt: alt * escala };
  }

  desenhar(ctx, largura, altura, mostrarSetores) {
    ctx.fillStyle = Pista.COR_FORA;
    ctx.fillRect(0, 0, largura, altura);

    // Coordenadas do MUNDO: deslocamos o desenho todo para que o ponto da
    // câmera caia no centro da tela. Tudo entre save() e restore() usa
    // posições do mundo; o painel, depois, usa as da tela.
    ctx.save();
    ctx.translate(Math.round(largura / 2 - this.camera.x), Math.round(altura / 2 - this.camera.y));
    this.pista.desenhar(ctx);
    this.efeitos.desenharMarcas(ctx);
    if (mostrarSetores) this.pista.desenharSetores(ctx, this.jogador.proximoSetor);
    for (const k of this.karts) k.desenhar(ctx);
    this.efeitos.desenharParticulas(ctx);
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const k of this.karts) {
      ctx.fillStyle = k === this.jogador ? '#ffd60a' : '#fff';
      ctx.fillText(k === this.jogador ? 'VOCÊ' : k.nome, k.x, k.y - 22);
    }
    ctx.restore();

    this.desenharPainel(ctx, largura, altura);
    if (this.estado === 'resultado') this.desenharResultado(ctx, largura, altura);
    else if (this.pausada) this.desenharPausa(ctx, largura, altura);
  }

  // ---------------------------------------------------------------------
  // Painel (HUD)
  // ---------------------------------------------------------------------

  desenharPainel(ctx, largura, altura) {
    const k = this.jogador;
    this.desenharVoltaETempo(ctx, k);
    this.desenharPosicoes(ctx, largura, k);
    this.desenharVelocimetro(ctx, altura, k);
    this.desenharMinimapa(ctx, largura - 200, altura - 130);

    // Números grandes no meio: contagem, "JÁ!" e "CHEGADA!".
    let grande = null, cor = '#ffd60a';
    if (this.estado === 'contagem') {
      grande = String(Math.ceil(this.contagem));
      cor = ['#ffd60a', '#ff9f1c', '#ef476f'][Math.ceil(this.contagem) - 1] || '#ef476f';
    } else if (this.tempo < 0.8) {
      grande = 'JÁ!';
      cor = '#06d6a0';
    } else if (k.tempoFinal !== null && this.estado === 'correndo') {
      grande = 'CHEGADA!';
    }
    if (grande) textoComContorno(ctx, grande, largura / 2, altura / 2 - 70, 110, cor);

    // Aviso que some sozinho (nova volta, última volta).
    if (this.aviso && !grande) {
      ctx.globalAlpha = Math.min(1, this.aviso.tempo / 0.4);
      textoComContorno(ctx, this.aviso.texto, largura / 2, 130, 40, '#ffd60a');
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(this.aviso.detalhe, largura / 2, 168);
      ctx.globalAlpha = 1;
    }
  }

  desenharVoltaETempo(ctx, k) {
    const volta = Math.min(Math.max(k.volta, 1), TOTAL_VOLTAS);
    caixa(ctx, 12, 12, 210, 96);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#aab';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('VOLTA', 24, 32);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`${volta}`, 24, 64);
    const larguraNumero = ctx.measureText(`${volta}`).width;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#aab';
    ctx.fillText(`/${TOTAL_VOLTAS}`, 26 + larguraNumero, 64);

    ctx.fillStyle = '#aab';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('TEMPO', 100, 32);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(formatarTempo(k.tempoFinal ?? this.tempo), 100, 60);

    const melhor = k.temposVolta.length ? Math.min(...k.temposVolta) : null;
    ctx.fillStyle = '#aab';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`Melhor volta  ${melhor === null ? '—' : formatarTempo(melhor)}`, 24, 94);
  }

  desenharPosicoes(ctx, largura, k) {
    // Posição grande do jogador...
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'right';
    textoComContorno(ctx, `${this.posicaoDe(k)}º`, largura - 56, 50, 56, '#ffd60a', 'right');
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`/${this.karts.length}`, largura - 18, 66);

    // ...e a classificação completa embaixo.
    caixa(ctx, largura - 170, 84, 158, 12 + this.karts.length * 26);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    this.classificacao.forEach((c, i) => {
      const y = 103 + i * 26;
      const ehJogador = c === this.jogador;
      ctx.font = `${ehJogador ? 'bold ' : ''}15px system-ui, sans-serif`;
      ctx.fillStyle = ehJogador ? '#ffd60a' : '#ddd';
      ctx.fillText(`${i + 1}º`, largura - 160, y);
      ctx.fillStyle = c.cor;
      ctx.beginPath();
      ctx.arc(largura - 124, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ehJogador ? '#ffd60a' : '#ddd';
      ctx.fillText(c.nome, largura - 110, y);
    });
  }

  // Velocímetro de ponteiro. "km/h" é só para dar sensação:
  // dividimos px/s por 4 (360 px/s viram 90 km/h).
  desenharVelocimetro(ctx, altura, k) {
    const cx = 78, cy = altura - 26, r = 56;
    const fracao = Math.min(1, k.velocidade / (k.velocidadeMaxima * 1.3));
    caixa(ctx, cx - r - 12, cy - r - 14, (r + 12) * 2, r + 30);
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 8, Math.PI, 2 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = k.tempoTurbo > 0 ? '#ff9f1c' : k.cor;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 8, Math.PI, Math.PI * (1 + fracao));
    ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(String(Math.round(k.velocidade / 4)), cx, cy - 6);
    ctx.fillStyle = '#aab';
    ctx.font = '11px system-ui, sans-serif';
    let estado = 'km/h';
    if (k.tempoTurbo > 0) { estado = 'TURBO!'; ctx.fillStyle = '#ff9f1c'; }
    else if (k.tempoOleo > 0) { estado = 'ÓLEO!'; ctx.fillStyle = '#b388ff'; }
    else if (k.derrapando) { estado = 'DRIFT'; ctx.fillStyle = '#7ecbff'; }
    else if (k.naGrama) { estado = 'GRAMA'; ctx.fillStyle = '#7bd36b'; }
    ctx.fillText(estado, cx, cy + 10);
  }

  desenharMinimapa(ctx, x, y) {
    const m = this.mapa;
    caixa(ctx, x - 12, y - 12, 200, 130);
    ctx.save();
    // Centraliza o desenho dentro da caixa de 176 × 106.
    ctx.translate(x + (176 - m.larg) / 2, y + (106 - m.alt) / 2);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = Math.max(4, this.pista.largura * m.escala);
    ctx.stroke(m.caminho);
    // Linha de chegada
    const a0 = this.pista.amostras[0];
    ctx.fillStyle = '#fff';
    ctx.fillRect((a0.x - m.minX) * m.escala - 1.5, (a0.y - m.minY) * m.escala - 5, 3, 10);
    // Karts: o jogador por último, para ficar por cima.
    for (const k of [...this.karts].reverse()) {
      ctx.fillStyle = k.cor;
      ctx.strokeStyle = k === this.jogador ? '#ffd60a' : '#111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc((k.x - m.minX) * m.escala, (k.y - m.minY) * m.escala, k === this.jogador ? 5.5 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  desenharPausa(ctx, largura, altura) {
    ctx.fillStyle = 'rgba(10, 12, 20, 0.7)';
    ctx.fillRect(0, 0, largura, altura);
    textoComContorno(ctx, 'PAUSA', largura / 2, altura / 2 - 30, 72, '#ffd60a');
    ctx.fillStyle = '#fff';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('P: continuar  ·  R: reiniciar  ·  Esc: sair da corrida', largura / 2, altura / 2 + 40);
    ctx.fillStyle = '#aab';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`M: som ${Som.ligado ? 'ligado' : 'desligado'}`, largura / 2, altura / 2 + 74);
  }

  desenharResultado(ctx, largura, altura) {
    ctx.fillStyle = 'rgba(10, 12, 20, 0.85)';
    ctx.fillRect(0, 0, largura, altura);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('Resultado', largura / 2, 64);
    ctx.fillStyle = '#fff';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(this.final.mensagem, largura / 2, 114);

    // A tabela é atualizada ao vivo: quem ainda não chegou aparece
    // como "correndo…" até cruzar a linha.
    this.classificacao.forEach((k, i) => {
      const y = 180 + i * 58;
      ctx.fillStyle = k === this.jogador ? 'rgba(255, 214, 10, 0.18)' : 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(largura / 2 - 260, y - 24, 520, 48);
      ctx.fillStyle = k.cor;
      ctx.beginPath();
      ctx.arc(largura / 2 - 160, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}º`, largura / 2 - 240, y);
      ctx.fillText(k.nome, largura / 2 - 135, y);
      ctx.textAlign = 'right';
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillText(k.tempoFinal !== null ? formatarTempo(k.tempoFinal) : 'correndo…', largura / 2 + 240, y);
    });

    this.final.opcoes.forEach((opcao, i) => {
      const y = 380 + i * 44;
      const sel = i === this.opcaoEscolhida;
      ctx.textAlign = 'center';
      ctx.fillStyle = sel ? '#ffd60a' : 'rgba(255, 255, 255, 0.7)';
      ctx.font = `${sel ? 'bold ' : ''}24px system-ui, sans-serif`;
      ctx.fillText(sel ? `▶  ${opcao.texto}  ◀` : opcao.texto, largura / 2, y);
    });
  }
}

function formatarTempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = (segundos % 60).toFixed(2).padStart(5, '0');
  return `${min}:${seg}`;
}

// Retângulo escuro semitransparente de cantos arredondados (fundo do HUD).
function caixa(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10, 12, 20, 0.6)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
}

// Texto grande com contorno escuro, legível sobre qualquer fundo.
function textoComContorno(ctx, texto, x, y, tamanho, cor, alinhamento = 'center') {
  ctx.font = `bold ${tamanho}px system-ui, sans-serif`;
  ctx.textAlign = alinhamento;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, tamanho / 12);
  ctx.strokeStyle = 'rgba(10, 12, 20, 0.75)';
  ctx.strokeText(texto, x, y);
  ctx.fillStyle = cor;
  ctx.fillText(texto, x, y);
}

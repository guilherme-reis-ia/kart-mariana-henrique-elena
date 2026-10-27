// corrida.js — as regras de UMA corrida: largada, voltas, posições,
// colisão entre karts, chegada e resultado.

const TOTAL_VOLTAS = 3;

class Corrida {
  constructor({ dadosPista, jogador, dificuldade }) {
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
    this.tempo = 0;
    this.chegadas = 0;
    this.esperaResultado = 2; // segundos entre a chegada e a tela de resultado
    this.camera = { x: this.jogador.x, y: this.jogador.y };
  }

  atualizar(dt) {
    if (this.estado === 'contagem') {
      this.contagem -= dt;
      if (this.contagem <= 0) this.estado = 'correndo';
    } else {
      this.tempo += dt;
    }

    // Antes do "JÁ!" e depois da chegada, os karts recebem comandos
    // vazios: a física continua rodando, mas ninguém acelera.
    const largou = this.estado !== 'contagem';
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

    if (this.estado === 'correndo' && this.jogador.tempoFinal !== null) {
      this.esperaResultado -= dt;
      if (this.esperaResultado <= 0) this.estado = 'resultado';
    }
    this.atualizarCamera(dt);
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
      if (k.volta > TOTAL_VOLTAS && k.tempoFinal === null) {
        k.tempoFinal = this.tempo;
        k.chegada = ++this.chegadas;
      }
    }
    k.proximoSetor = (k.proximoSetor + 1) % this.pista.numSetores;
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

  desenhar(ctx, largura, altura, mostrarSetores) {
    ctx.fillStyle = Pista.COR_FORA;
    ctx.fillRect(0, 0, largura, altura);

    // Coordenadas do MUNDO: deslocamos o desenho todo para que o ponto da
    // câmera caia no centro da tela. Tudo entre save() e restore() usa
    // posições do mundo; o painel, depois, usa as da tela.
    ctx.save();
    ctx.translate(Math.round(largura / 2 - this.camera.x), Math.round(altura / 2 - this.camera.y));
    this.pista.desenhar(ctx);
    if (mostrarSetores) this.pista.desenharSetores(ctx, this.jogador.proximoSetor);
    for (const k of this.karts) k.desenhar(ctx);
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
  }

  desenharPainel(ctx, largura, altura) {
    const k = this.jogador;
    const volta = Math.min(Math.max(k.volta, 1), TOTAL_VOLTAS);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(10, 10, 200, 72);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`Volta ${volta}/${TOTAL_VOLTAS}`, 20, 18);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(`Tempo ${formatarTempo(k.tempoFinal ?? this.tempo)}`, 20, 50);

    // Posição em destaque, no canto direito.
    ctx.textAlign = 'right';
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillStyle = '#ffd60a';
    ctx.fillText(`${this.posicaoDe(k)}º`, largura - 60, 12);
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`/${this.karts.length}`, largura - 20, 40);

    // Contagem regressiva e "JÁ!"
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let grande = null;
    if (this.estado === 'contagem') grande = String(Math.ceil(this.contagem));
    else if (this.tempo < 0.8) grande = 'JÁ!';
    else if (k.tempoFinal !== null && this.estado === 'correndo') grande = 'CHEGADA!';
    if (grande) {
      ctx.font = 'bold 110px system-ui, sans-serif';
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.strokeText(grande, largura / 2, altura / 2 - 60);
      ctx.fillStyle = grande === 'JÁ!' ? '#06d6a0' : '#ffd60a';
      ctx.fillText(grande, largura / 2, altura / 2 - 60);
    }
  }

  desenharResultado(ctx, largura, altura) {
    ctx.fillStyle = 'rgba(10, 12, 20, 0.82)';
    ctx.fillRect(0, 0, largura, altura);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('Resultado', largura / 2, 110);

    // A tabela é atualizada ao vivo: quem ainda não chegou aparece
    // como "correndo…" até cruzar a linha.
    this.classificacao.forEach((k, i) => {
      const y = 200 + i * 64;
      ctx.fillStyle = k === this.jogador ? 'rgba(255, 214, 10, 0.18)' : 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(largura / 2 - 260, y - 26, 520, 52);
      ctx.fillStyle = k.cor;
      ctx.beginPath();
      ctx.arc(largura / 2 - 160, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}º`, largura / 2 - 240, y);
      ctx.fillText(k.nome, largura / 2 - 135, y);
      ctx.textAlign = 'right';
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText(k.tempoFinal !== null ? formatarTempo(k.tempoFinal) : 'correndo…', largura / 2 + 240, y);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Enter: correr de novo  ·  Esc: escolher fase', largura / 2, altura - 70);
  }
}

function formatarTempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = (segundos % 60).toFixed(2).padStart(5, '0');
  return `${min}:${seg}`;
}

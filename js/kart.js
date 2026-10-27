// kart.js — física e desenho de um kart.
//
// Convenções:
//   - Posição (x, y) em pixels do mundo; y cresce para BAIXO (padrão do Canvas).
//   - angulo em radianos; 0 = apontando para a direita, cresce no sentido horário.
//   - Velocidade é um vetor (vx, vy) em pixels por segundo.

class Kart {
  constructor({ x, y, angulo = 0, cor, inicial, nome, fisica = {} }) {
    this.nome = nome;
    this.x = x;
    this.y = y;
    this.angulo = angulo;
    this.vx = 0;
    this.vy = 0;
    this.cor = cor;
    this.inicial = inicial;

    // Valores padrão de física; cada personagem troca alguns deles.
    this.aceleracao = 420;       // px/s² ao segurar o acelerador
    this.velocidadeMaxima = 360; // px/s
    this.forcaFreio = 700;       // px/s² ao frear andando para frente
    this.velocidadeMaximaRe = 120;
    this.atrito = 180;           // px/s² de desaceleração sem acelerar
    this.giro = 3.0;             // rad/s de giro (o máximo, em velocidade média)
    this.perdaGiro = 0.35;       // na velocidade máxima o giro cai 35%
    this.aderencia = 9;          // quão rápido o pneu "mata" o deslize lateral
    Object.assign(this, fisica);

    // Preenchidos pela pista a cada quadro (ver Pista.colidir).
    this.naGrama = false;
    this.tempoTurbo = 0;  // segundos de turbo que ainda restam
    this.tempoOleo = 0;   // segundos de derrapagem no óleo que ainda restam
    this.giroOleo = 0;    // para que lado (e quão rápido) o óleo gira o kart

    this.derrapando = false; // drift ativo neste quadro (usado no desenho)
  }

  // Quantos radianos por segundo o kart consegue girar andando a
  // velocidade v (para frente). Parado não gira; até 120 px/s o giro cresce
  // com a velocidade; acima disso ele DIMINUI um pouco, até perder
  // `perdaGiro` na velocidade máxima. É isso que obriga a frear antes das
  // curvas fechadas: rápido demais, o kart não consegue virar o bastante.
  taxaDeGiro(v) {
    const arranque = Math.max(-1, Math.min(1, v / 120));
    const perda = this.perdaGiro * Math.min(1, Math.abs(v) / this.velocidadeMaxima);
    return this.giro * arranque * (1 - perda);
  }

  // dt = tempo em segundos desde o último quadro (ver jogo.js).
  atualizar(dt, comandos) {
    this.tempoTurbo = Math.max(0, this.tempoTurbo - dt);
    this.tempoOleo = Math.max(0, this.tempoOleo - dt);

    // 1) Decompomos a velocidade em duas partes, relativas ao kart:
    //    - "frente": na direção para onde o bico aponta;
    //    - "lado": perpendicular a ela (o kart escorregando de lado).
    //    Isso é feito com o produto escalar entre a velocidade e cada direção.
    const fx = Math.cos(this.angulo), fy = Math.sin(this.angulo); // frente
    const lx = -fy, ly = fx;                                      // lado
    let frente = this.vx * fx + this.vy * fy;
    let lado = this.vx * lx + this.vy * ly;

    const direcao = (comandos.direita ? 1 : 0) - (comandos.esquerda ? 1 : 0);
    // Drift: segurando Espaço numa curva, embalado, o kart vira bem mais,
    // mas os pneus escorregam e ele perde um pouco de velocidade.
    this.derrapando = Boolean(comandos.drift) && direcao !== 0 && frente > 150;

    // 2) Motor e freio só agem na parte "frente".
    //    Na grama o motor não passa de 45% da velocidade máxima;
    //    no turbo passa 30% dela e acelera o dobro.
    let maxima = this.velocidadeMaxima * (this.naGrama ? 0.45 : 1);
    let aceleracao = this.aceleracao;
    if (this.tempoTurbo > 0) {
      maxima *= 1.3;
      aceleracao *= 2;
    }
    if (comandos.acelerar) {
      if (frente < maxima) frente = Math.min(maxima, frente + aceleracao * dt);
    } else if (comandos.frear) {
      // Andando para frente, "frear" é freio; parado ou para trás, vira ré.
      frente -= (frente > 0 ? this.forcaFreio : this.aceleracao * 0.6) * dt;
    } else {
      // Sem pedal: o atrito puxa a velocidade em direção a zero,
      // sem passar do zero (senão o kart ficaria oscilando).
      const reducao = this.atrito * dt;
      frente = Math.abs(frente) <= reducao ? 0 : frente - Math.sign(frente) * reducao;
    }
    if (this.derrapando) frente -= 45 * dt;
    // Acima do limite (ex.: entrou na grama embalado), o kart perde o
    // excesso rápido, mas sem um tranco de uma vez.
    if (frente > maxima) frente = maxima + (frente - maxima) * Math.exp(-3 * dt);
    frente = Math.max(-this.velocidadeMaximaRe, frente);

    // 3) Aderência: os pneus resistem a andar de lado. Multiplicar por
    //    exp(-aderencia * dt) reduz o deslize sempre na mesma proporção por
    //    segundo, não importa se o jogo roda a 30 ou a 144 quadros por segundo.
    //    Com aderência alta o kart "obedece" o volante; baixa, ele derrapa.
    //    O drift reduz a aderência de propósito; o óleo, quase a zera.
    let aderencia = this.aderencia;
    if (this.derrapando) aderencia *= 0.3;
    if (this.tempoOleo > 0) aderencia *= 0.08;
    lado *= Math.exp(-aderencia * dt);

    // 4) Recompomos o vetor velocidade a partir das duas partes.
    this.vx = fx * frente + lx * lado;
    this.vy = fy * frente + ly * lado;

    // 5) Volante. De ré a taxa de giro fica negativa, então a direção
    //    inverte (como num carro de verdade).
    const giro = this.taxaDeGiro(frente) * (this.derrapando ? 1.6 : 1);
    this.angulo += direcao * giro * dt;
    // No óleo o kart rodopia sozinho, cada vez mais devagar.
    if (this.tempoOleo > 0) this.angulo += this.giroOleo * (this.tempoOleo / Kart.DURACAO_OLEO) * dt;
    // Repare: giramos o bico, mas a velocidade continua apontando para onde
    // estava. No próximo quadro essa diferença aparece como "lado" e a
    // aderência a corrige aos poucos — é isso que dá o leve escorregão.

    // 6) Movimento: posição nova = posição + velocidade × tempo.
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  // Chamados pela pista quando o kart passa por cima de um obstáculo.
  pegarTurbo() {
    if (this.tempoTurbo < 0.5) {
      // Empurrão imediato para frente, além do turbo que dura um pouco.
      this.vx += Math.cos(this.angulo) * 90;
      this.vy += Math.sin(this.angulo) * 90;
    }
    this.tempoTurbo = 1.2;
  }

  pisarNoOleo() {
    if (this.tempoOleo > 0) return;
    this.vx *= 0.6; // perde 40% da velocidade na hora
    this.vy *= 0.6;
    this.tempoOleo = Kart.DURACAO_OLEO;
    this.giroOleo = (Math.random() < 0.5 ? -1 : 1) * (2.2 + Math.random() * 0.8);
  }

  get velocidade() {
    return Math.hypot(this.vx, this.vy);
  }

  desenhar(ctx) {
    ctx.save();
    // Movemos a "origem" do desenho para o centro do kart e giramos o
    // papel: assim desenhamos o kart sempre apontando para a direita,
    // e o Canvas cuida de colocá-lo no lugar e no ângulo certos.
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angulo);

    // Sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(2, 3, 21, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4 rodas (traseiras um pouco mais largas, como num kart)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-17, -15, 12, 7);  // traseira esquerda
    ctx.fillRect(-17, 8, 12, 7);    // traseira direita
    ctx.fillRect(7, -14, 10, 6);    // dianteira esquerda
    ctx.fillRect(7, 8, 10, 6);      // dianteira direita

    // Chassi
    ctx.fillStyle = this.cor;
    ctx.beginPath();
    ctx.roundRect(-16, -9, 34, 18, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Para-choque dianteiro
    ctx.fillStyle = '#333';
    ctx.fillRect(17, -7, 4, 14);

    // Volante
    ctx.fillStyle = '#222';
    ctx.fillRect(6, -4, 3, 8);

    // Capacete do piloto com a inicial
    ctx.fillStyle = '#fafafa';
    ctx.beginPath();
    ctx.arc(-3, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.cor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // A letra é desenhada "em pé" em relação ao kart: giramos de volta
    // 90° para ela ficar legível quando o kart aponta para cima.
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.inicial, 0, 3.5);

    ctx.restore();
  }
}

// Para colisões, tratamos o kart como um círculo com este raio.
Kart.RAIO = 14;

// Quanto tempo (s) o kart fica sem aderência depois de pisar no óleo.
Kart.DURACAO_OLEO = 1.1;

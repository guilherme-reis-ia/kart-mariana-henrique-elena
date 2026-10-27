// kart.js — física e desenho de um kart.
//
// Convenções:
//   - Posição (x, y) em pixels do mundo; y cresce para BAIXO (padrão do Canvas).
//   - angulo em radianos; 0 = apontando para a direita, cresce no sentido horário.
//   - Velocidade é um vetor (vx, vy) em pixels por segundo.

class Kart {
  constructor({ x, y, angulo = 0, cor, inicial }) {
    this.x = x;
    this.y = y;
    this.angulo = angulo;
    this.vx = 0;
    this.vy = 0;
    this.cor = cor;
    this.inicial = inicial;

    // Valores de física. No marco 4 cada personagem terá os seus.
    this.aceleracao = 420;       // px/s² ao segurar o acelerador
    this.velocidadeMaxima = 360; // px/s
    this.forcaFreio = 700;       // px/s² ao frear andando para frente
    this.velocidadeMaximaRe = 120;
    this.atrito = 180;           // px/s² de desaceleração sem acelerar
    this.giro = 3.0;             // rad/s de giro na velocidade de referência
    this.aderencia = 9;          // quão rápido o pneu "mata" o deslize lateral

    // Preenchido pela pista a cada quadro (ver Pista.colidir).
    this.naGrama = false;
  }

  // dt = tempo em segundos desde o último quadro (ver jogo.js).
  atualizar(dt, comandos) {
    // 1) Decompomos a velocidade em duas partes, relativas ao kart:
    //    - "frente": na direção para onde o bico aponta;
    //    - "lado": perpendicular a ela (o kart escorregando de lado).
    //    Isso é feito com o produto escalar entre a velocidade e cada direção.
    const fx = Math.cos(this.angulo), fy = Math.sin(this.angulo); // frente
    const lx = -fy, ly = fx;                                      // lado
    let frente = this.vx * fx + this.vy * fy;
    let lado = this.vx * lx + this.vy * ly;

    // 2) Motor e freio só agem na parte "frente".
    //    Na grama o motor não passa de 45% da velocidade máxima.
    const maxima = this.velocidadeMaxima * (this.naGrama ? 0.45 : 1);
    if (comandos.acelerar) {
      if (frente < maxima) frente = Math.min(maxima, frente + this.aceleracao * dt);
    } else if (comandos.frear) {
      // Andando para frente, "frear" é freio; parado ou para trás, vira ré.
      frente -= (frente > 0 ? this.forcaFreio : this.aceleracao * 0.6) * dt;
    } else {
      // Sem pedal: o atrito puxa a velocidade em direção a zero,
      // sem passar do zero (senão o kart ficaria oscilando).
      const reducao = this.atrito * dt;
      frente = Math.abs(frente) <= reducao ? 0 : frente - Math.sign(frente) * reducao;
    }
    // Acima do limite (ex.: entrou na grama embalado), o kart perde o
    // excesso rápido, mas sem um tranco de uma vez.
    if (frente > maxima) frente = maxima + (frente - maxima) * Math.exp(-3 * dt);
    frente = Math.max(-this.velocidadeMaximaRe, frente);

    // 3) Aderência: os pneus resistem a andar de lado. Multiplicar por
    //    exp(-aderencia * dt) reduz o deslize sempre na mesma proporção por
    //    segundo, não importa se o jogo roda a 30 ou a 144 quadros por segundo.
    //    Com aderência alta o kart "obedece" o volante; baixa, ele derrapa.
    //    (No marco 5, o drift vai diminuir esse valor de propósito.)
    lado *= Math.exp(-this.aderencia * dt);

    // 4) Recompomos o vetor velocidade a partir das duas partes.
    this.vx = fx * frente + lx * lado;
    this.vy = fy * frente + ly * lado;

    // 5) Volante. Um kart parado não gira no lugar: o giro é proporcional
    //    à velocidade até 120 px/s, e inverte quando está de ré
    //    (como num carro de verdade).
    const direcao = (comandos.direita ? 1 : 0) - (comandos.esquerda ? 1 : 0);
    const fatorVelocidade = Math.max(-1, Math.min(1, frente / 120));
    this.angulo += direcao * this.giro * fatorVelocidade * dt;
    // Repare: giramos o bico, mas a velocidade continua apontando para onde
    // estava. No próximo quadro essa diferença aparece como "lado" e a
    // aderência a corrige aos poucos — é isso que dá o leve escorregão.

    // 6) Movimento: posição nova = posição + velocidade × tempo.
    this.x += this.vx * dt;
    this.y += this.vy * dt;
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

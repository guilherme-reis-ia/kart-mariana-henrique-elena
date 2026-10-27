// efeitos.js — enfeites visuais que não mudam o jogo: marcas de pneu
// e partículas (fogo do turbo, terra da grama, faíscas do drift).
//
// Partícula = um pontinho com posição, velocidade e "vida" (segundos).
// A cada quadro ela anda, perde vida e some quando a vida acaba. Muitas
// partículas simples, juntas, parecem fumaça, fogo ou faísca.

const MAX_MARCAS = 1500;

class Efeitos {
  constructor() {
    this.marcas = [];      // segmentos [x1, y1, x2, y2] deixados pelos pneus
    this.particulas = [];
    this.rodasAnteriores = new Map(); // onde estavam as rodas de cada kart no quadro anterior
  }

  atualizar(dt, karts) {
    for (const k of karts) {
      const c = Math.cos(k.angulo), s = Math.sin(k.angulo);
      // Posição das rodas traseiras no mundo: no desenho do kart elas
      // ficam em (-11, ±11.5); giramos esse ponto pelo ângulo do kart.
      const rodas = [-11.5, 11.5].map((l) => ({ x: k.x - 11 * c - l * s, y: k.y - 11 * s + l * c }));

      // Marca o asfalto quando o pneu escorrega: drift, óleo ou curva
      // forte demais (velocidade lateral alta).
      const lateral = k.vx * -s + k.vy * c;
      const marcando = !k.naGrama && (k.derrapando || k.tempoOleo > 0 || Math.abs(lateral) > 70);
      const anteriores = this.rodasAnteriores.get(k);
      if (marcando && anteriores) {
        rodas.forEach((r, i) => this.marcas.push([anteriores[i].x, anteriores[i].y, r.x, r.y]));
      }
      this.rodasAnteriores.set(k, rodas);

      const atras = { x: k.x - 20 * c, y: k.y - 20 * s };
      if (k.tempoTurbo > 0) {
        for (let n = 0; n < 2; n++) {
          this.soltar(atras.x, atras.y, -c * 140, -s * 140, 0.35, Math.random() < 0.5 ? '#ffd60a' : '#ff6b1a', 5);
        }
      }
      if (k.naGrama && k.velocidade > 60 && Math.random() < 0.5) {
        this.soltar(atras.x, atras.y, -c * 60, -s * 60, 0.5, '#6b4f2a', 3);
      }
      if (k.derrapando && Math.random() < 0.7) {
        const r = rodas[Math.random() < 0.5 ? 0 : 1];
        this.soltar(r.x, r.y, -c * 80, -s * 80, 0.25, Math.random() < 0.5 ? '#ffffff' : '#7ecbff', 2);
      }
    }
    if (this.marcas.length > MAX_MARCAS) this.marcas.splice(0, this.marcas.length - MAX_MARCAS);

    for (const p of this.particulas) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vida -= dt;
    }
    this.particulas = this.particulas.filter((p) => p.vida > 0);
  }

  // Cria uma partícula com um pouco de aleatoriedade na direção,
  // para o efeito não parecer uma linha reta.
  soltar(x, y, vx, vy, vida, cor, tamanho) {
    this.particulas.push({
      x, y,
      vx: vx + (Math.random() - 0.5) * 80,
      vy: vy + (Math.random() - 0.5) * 80,
      vida, vidaTotal: vida, cor, tamanho,
    });
  }

  // As marcas vão por baixo dos karts; as partículas, por cima.
  desenharMarcas(ctx) {
    if (!this.marcas.length) return;
    ctx.strokeStyle = 'rgba(25, 25, 30, 0.35)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [x1, y1, x2, y2] of this.marcas) {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }

  desenharParticulas(ctx) {
    for (const p of this.particulas) {
      const resto = p.vida / p.vidaTotal; // 1 = acabou de nascer, 0 = sumindo
      ctx.globalAlpha = resto;
      ctx.fillStyle = p.cor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.tamanho * (0.5 + resto * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

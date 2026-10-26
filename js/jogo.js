// jogo.js — o "game loop": o coração que faz o jogo andar.
//
// Todo jogo em tempo real repete, várias vezes por segundo, o mesmo ciclo:
//   1. ler a entrada (teclado);
//   2. atualizar o mundo (física, regras);
//   3. desenhar o mundo na tela.
// O navegador nos chama ~60 vezes por segundo via requestAnimationFrame,
// sincronizado com a atualização do monitor.

const tela = document.getElementById('tela');
const ctx = tela.getContext('2d');
const LARGURA = tela.width;
const ALTURA = tela.height;

Entrada.iniciar();

const kart = new Kart({
  x: LARGURA / 2,
  y: ALTURA / 2,
  angulo: -Math.PI / 2, // começa apontando para cima
  cor: '#e63946',
  inicial: 'M',
});

let ultimoInstante = performance.now();
let fps = 60;

function quadro(agora) {
  // "Delta time": quanto tempo passou desde o quadro anterior, em segundos.
  // A física usa dt em todas as contas (velocidade × dt), então o kart anda
  // a mesma distância por segundo em um monitor de 60 Hz ou de 144 Hz.
  // Limitamos a 0,05 s: se a aba ficar em segundo plano e voltar, um dt
  // enorme faria o kart "teletransportar".
  const dt = Math.min((agora - ultimoInstante) / 1000, 0.05);
  ultimoInstante = agora;
  if (dt > 0) fps += (1 / dt - fps) * 0.05; // média suave, só para exibir

  atualizar(dt);
  desenhar();
  requestAnimationFrame(quadro);
}

function atualizar(dt) {
  kart.atualizar(dt, Entrada.comandos());
  manterDentroDaArena(kart);
}

// Por enquanto não há pista: só impedimos o kart de sair da tela,
// fazendo-o quicar nas bordas e perder parte da velocidade.
function manterDentroDaArena(k) {
  const margem = 20;
  const perda = 0.4; // fica com 40% da velocidade após a batida
  if (k.x < margem) { k.x = margem; k.vx = Math.abs(k.vx) * perda; }
  if (k.x > LARGURA - margem) { k.x = LARGURA - margem; k.vx = -Math.abs(k.vx) * perda; }
  if (k.y < margem) { k.y = margem; k.vy = Math.abs(k.vy) * perda; }
  if (k.y > ALTURA - margem) { k.y = ALTURA - margem; k.vy = -Math.abs(k.vy) * perda; }
}

function desenhar() {
  // Fundo: asfalto com uma grade leve, para dar noção de movimento.
  ctx.fillStyle = '#3a3f47';
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= LARGURA; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, ALTURA); }
  for (let y = 0; y <= ALTURA; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(LARGURA, y + 0.5); }
  ctx.stroke();

  kart.desenhar(ctx);

  // Painel de depuração simples
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(10, 10, 230, 64);
  ctx.fillStyle = '#fff';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Velocidade: ${Math.round(kart.velocidade)} px/s`, 20, 18);
  ctx.fillText(`FPS: ${Math.round(fps)}`, 20, 38);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('Setas ou WASD para dirigir', 20, 56);
}

requestAnimationFrame(quadro);

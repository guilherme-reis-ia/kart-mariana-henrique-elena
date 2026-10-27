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

let corrida;
let mostrarSetores = false;

// Por enquanto a corrida é sempre a mesma; no marco 4 os menus escolhem
// personagem e dificuldade.
function novaCorrida() {
  corrida = new Corrida({ dadosPista: PISTAS[0], jogador: PERSONAGENS[0], dificuldade: 'dificil' });
}

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
  if (Entrada.tocou('KeyC')) mostrarSetores = !mostrarSetores;
  if (Entrada.tocou('KeyR')) novaCorrida();
  if (Entrada.tocou('Enter') && corrida.estado === 'resultado') novaCorrida();
  corrida.atualizar(dt);
}

function desenhar() {
  corrida.desenhar(ctx, LARGURA, ALTURA, mostrarSetores);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`C: setores · R: reiniciar · FPS ${Math.round(fps)}`, 12, ALTURA - 10);
}

novaCorrida();
requestAnimationFrame(quadro);

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
const TOTAL_VOLTAS = 3;

Entrada.iniciar();

const pista = new Pista(PISTAS[0]);
let kart;
let camera;
let tempoCorrida;
let mostrarSetores = false;

function reiniciar() {
  // Começa um pouco antes da linha de chegada; a 1ª volta conta
  // quando ele a cruza.
  kart = new Kart({ ...pista.posicaoDeLargada(60), cor: '#e63946', inicial: 'M' });
  // Estado de corrida do kart (ver atualizarVoltas).
  kart.volta = 0;
  kart.proximoSetor = 0;
  kart.tempoFinal = null;
  camera = { x: kart.x, y: kart.y };
  tempoCorrida = 0;
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
  if (Entrada.tocou('KeyR')) reiniciar();

  // Depois da chegada o kart segue sozinho, sem comandos, até parar.
  const terminou = kart.tempoFinal !== null;
  kart.atualizar(dt, terminou ? {} : Entrada.comandos());
  const info = pista.colidir(kart);
  atualizarVoltas(kart, info);

  if (kart.volta >= 1 && !terminou) tempoCorrida += dt;
  atualizarCamera(dt);
}

// Contagem de voltas à prova de atalhos.
// A pista é dividida em setores numerados 0, 1, 2, ... a partir da linha de
// chegada. Cada kart guarda qual é o PRÓXIMO setor que precisa alcançar e só
// avança quando entra exatamente nele. Cortar caminho pula setores, e aí o
// kart fica "devendo" até voltar para buscá-los. A volta só conta ao entrar
// no setor 0 (cruzar a linha) depois de ter passado por todos, em ordem.
function atualizarVoltas(k, info) {
  if (info.setor !== k.proximoSetor) return;
  if (k.proximoSetor === 0) {
    k.volta++;
    if (k.volta > TOTAL_VOLTAS) k.tempoFinal = tempoCorrida;
  }
  k.proximoSetor = (k.proximoSetor + 1) % pista.numSetores;
}

// A câmera persegue um ponto um pouco À FRENTE do kart (na direção da
// velocidade), para o jogador ver melhor o que vem pela frente. Ela não
// pula para lá: a cada quadro anda uma fração da distância que falta,
// o que dá um movimento suave, sem trancos.
function atualizarCamera(dt) {
  const alvoX = kart.x + kart.vx * 0.35;
  const alvoY = kart.y + kart.vy * 0.35;
  const suavidade = 1 - Math.exp(-5 * dt);
  camera.x += (alvoX - camera.x) * suavidade;
  camera.y += (alvoY - camera.y) * suavidade;
}

function desenhar() {
  ctx.fillStyle = Pista.COR_FORA;
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  // Coordenadas do MUNDO: deslocamos o desenho todo para que o ponto da
  // câmera caia no centro da tela. Tudo desenhado entre save() e restore()
  // usa posições do mundo (pista, karts); o painel, depois, usa as da tela.
  ctx.save();
  ctx.translate(Math.round(LARGURA / 2 - camera.x), Math.round(ALTURA / 2 - camera.y));
  pista.desenhar(ctx);
  if (mostrarSetores) pista.desenharSetores(ctx, kart.proximoSetor);
  kart.desenhar(ctx);
  ctx.restore();

  desenharPainel();
}

function formatarTempo(segundos) {
  const min = Math.floor(segundos / 60);
  const seg = (segundos % 60).toFixed(2).padStart(5, '0');
  return `${min}:${seg}`;
}

function desenharPainel() {
  const volta = Math.min(Math.max(kart.volta, 1), TOTAL_VOLTAS);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(10, 10, 270, 110);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`Volta ${volta}/${TOTAL_VOLTAS}`, 20, 18);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`Tempo ${formatarTempo(tempoCorrida)}`, 20, 48);
  ctx.fillText(`${Math.round(kart.velocidade)} px/s${kart.naGrama ? '  (grama!)' : ''}`, 20, 70);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`C: setores · R: reiniciar · FPS ${Math.round(fps)}`, 20, 94);

  if (kart.tempoFinal !== null) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, ALTURA / 2 - 70, LARGURA, 140);
    ctx.fillStyle = '#ffd60a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.fillText('CHEGADA!', LARGURA / 2, ALTURA / 2 - 55);
    ctx.fillStyle = '#fff';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(`Tempo total: ${formatarTempo(kart.tempoFinal)} — R para correr de novo`, LARGURA / 2, ALTURA / 2 + 15);
  }
}

reiniciar();
requestAnimationFrame(quadro);

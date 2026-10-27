// som.js — todos os sons são gerados por código, com a Web Audio API.
//
// A ideia: ligamos "aparelhos" uns nos outros, como pedais de guitarra.
//   oscilador (gera uma onda, um tom) → filtro (deixa mais grave/abafado)
//   → ganho (volume) → caixa de som.
// Um bip é um oscilador ligado por um instante com o volume caindo.
// O ruído (chiado) vem de números aleatórios tocados como som; com um
// filtro varrendo as frequências, vira "vuuush" (turbo) ou "splash" (óleo).
//
// Navegadores só deixam tocar som depois que a pessoa interage com a
// página, por isso o áudio só é criado na primeira tecla (ver jogo.js).
// Se o navegador não tiver Web Audio, tudo aqui vira silêncio sem erro.

const Som = {
  ctx: null,
  ligado: true,
  volume: 0.35,

  iniciar() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const ContextoDeAudio = window.AudioContext || window.webkitAudioContext;
    if (!ContextoDeAudio) return;
    try {
      this.ctx = new ContextoDeAudio();
      this.mestre = this.ctx.createGain();
      this.mestre.gain.value = this.ligado ? this.volume : 0;
      this.mestre.connect(this.ctx.destination);

      // Motor: um oscilador "dente de serra" grave e abafado que fica
      // sempre ligado; só mudamos o volume e o tom conforme a velocidade.
      this.motorOsc = this.ctx.createOscillator();
      this.motorOsc.type = 'sawtooth';
      this.motorOsc.frequency.value = 50;
      const filtro = this.ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 500;
      this.motorGanho = this.ctx.createGain();
      this.motorGanho.gain.value = 0;
      this.motorOsc.connect(filtro).connect(this.motorGanho).connect(this.mestre);
      this.motorOsc.start();

      // 1 segundo de ruído branco, reaproveitado por todos os efeitos.
      this.ruidoBranco = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const dados = this.ruidoBranco.getChannelData(0);
      for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
    } catch (e) {
      this.ctx = null;
    }
  },

  alternar() {
    this.ligado = !this.ligado;
    if (this.mestre) this.mestre.gain.value = this.ligado ? this.volume : 0;
  },

  // intensidade: null = motor desligado; 0 = marcha lenta; 1 = velocidade máxima.
  motor(intensidade) {
    if (!this.ctx) return;
    const agora = this.ctx.currentTime;
    // setTargetAtTime muda o valor aos poucos (em ~50 ms), sem estalos.
    const volume = intensidade === null ? 0 : 0.05 + 0.06 * Math.min(1, intensidade);
    this.motorGanho.gain.setTargetAtTime(volume, agora, 0.05);
    if (intensidade !== null) {
      this.motorOsc.frequency.setTargetAtTime(45 + 110 * Math.min(1.4, intensidade), agora, 0.05);
    }
  },

  bip(frequencia, duracao = 0.15, tipo = 'square', volume = 0.25, atraso = 0) {
    if (!this.ctx) return;
    const inicio = this.ctx.currentTime + atraso;
    const osc = this.ctx.createOscillator();
    const ganho = this.ctx.createGain();
    osc.type = tipo;
    osc.frequency.value = frequencia;
    ganho.gain.setValueAtTime(volume, inicio);
    ganho.gain.exponentialRampToValueAtTime(0.001, inicio + duracao);
    osc.connect(ganho).connect(this.mestre);
    osc.start(inicio);
    osc.stop(inicio + duracao + 0.02);
  },

  ruido(duracao, freqInicial, freqFinal, volume = 0.3) {
    if (!this.ctx) return;
    const inicio = this.ctx.currentTime;
    const fonte = this.ctx.createBufferSource();
    fonte.buffer = this.ruidoBranco;
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.Q.value = 2;
    filtro.frequency.setValueAtTime(freqInicial, inicio);
    filtro.frequency.exponentialRampToValueAtTime(freqFinal, inicio + duracao);
    const ganho = this.ctx.createGain();
    ganho.gain.setValueAtTime(volume, inicio);
    ganho.gain.exponentialRampToValueAtTime(0.001, inicio + duracao);
    fonte.connect(filtro).connect(ganho).connect(this.mestre);
    fonte.start(inicio);
    fonte.stop(inicio + duracao);
  },

  // Sons com nome, usados pelo resto do jogo.
  menu() { this.bip(620, 0.06, 'square', 0.12); },
  contagem() { this.bip(440, 0.2, 'square', 0.22); },
  largada() { this.bip(880, 0.45, 'square', 0.25); },
  turbo() { this.ruido(0.5, 300, 3000, 0.5); },
  oleo() { this.ruido(0.4, 1500, 150, 0.5); },
  batida() {
    this.bip(80, 0.15, 'triangle', 0.5);
    this.ruido(0.1, 600, 200, 0.3);
  },
  volta() {
    this.bip(660, 0.12, 'square', 0.18);
    this.bip(990, 0.22, 'square', 0.18, 0.12);
  },
  chegada() {
    [523, 659, 784, 1047].forEach((f, i) => this.bip(f, i === 3 ? 0.6 : 0.2, 'square', 0.2, i * 0.14));
  },
};

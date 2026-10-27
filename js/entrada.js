// entrada.js — lê o teclado.
//
// Em vez de reagir a cada tecla no momento em que ela é apertada, guardamos
// o conjunto de teclas que estão pressionadas AGORA. A cada quadro, o jogo
// pergunta "a seta para cima está apertada?". Assim o kart responde de forma
// contínua enquanto a tecla fica segurada, e várias teclas funcionam juntas.

const Entrada = {
  teclas: new Set(),
  // Teclas que acabaram de ser apertadas neste quadro, para ações de um
  // toque só (escolher no menu, ligar/desligar algo), que não devem repetir
  // enquanto a tecla fica segurada. O jogo esvazia isto ao fim de cada quadro.
  toques: new Set(),

  // Teclas que o jogo usa: impedimos o comportamento padrão delas
  // (por exemplo, as setas e o Espaço rolariam a página).
  teclasDoJogo: new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
  ]),

  iniciar() {
    window.addEventListener('keydown', (e) => {
      this.teclas.add(e.code);
      if (!e.repeat) this.toques.add(e.code);
      if (this.teclasDoJogo.has(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.teclas.delete(e.code));
    // Se a janela perde o foco, o navegador não avisa que as teclas foram
    // soltas — sem isto o kart continuaria acelerando sozinho.
    window.addEventListener('blur', () => this.teclas.clear());
  },

  apertada(...codigos) {
    return codigos.some((c) => this.teclas.has(c));
  },

  // Verdadeiro se alguma dessas teclas foi apertada neste quadro.
  tocou(...codigos) {
    return codigos.some((c) => this.toques.has(c));
  },

  limparToques() {
    this.toques.clear();
  },

  // Traduz o teclado nos comandos que um kart entende. A IA (ia.js)
  // produz este mesmo formato de objeto, então o Kart não precisa
  // saber se quem o controla é uma pessoa ou o computador.
  comandos() {
    return {
      acelerar: this.apertada('ArrowUp', 'KeyW'),
      frear: this.apertada('ArrowDown', 'KeyS'),
      esquerda: this.apertada('ArrowLeft', 'KeyA'),
      direita: this.apertada('ArrowRight', 'KeyD'),
    };
  },
};

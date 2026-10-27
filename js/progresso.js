// progresso.js — quais fases já foram liberadas, salvo no navegador.
//
// localStorage guarda textos que sobrevivem ao fechar a página. Ele pode
// não existir ou dar erro (modo anônimo, arquivo aberto com certas
// configurações, armazenamento cheio), então todo acesso fica dentro de
// try/catch: sem ele, o jogo funciona igual, só não lembra o progresso.

const Progresso = {
  chave: 'familia-kart-progresso',
  fasesLiberadas: 1,

  carregar() {
    try {
      const salvo = JSON.parse(localStorage.getItem(this.chave));
      if (salvo && Number.isInteger(salvo.fasesLiberadas)) {
        this.fasesLiberadas = Math.max(1, Math.min(PISTAS.length, salvo.fasesLiberadas));
      }
    } catch (e) {
      // Sem armazenamento: seguimos só com a fase 1.
    }
  },

  salvar() {
    try {
      localStorage.setItem(this.chave, JSON.stringify({ fasesLiberadas: this.fasesLiberadas }));
    } catch (e) {
      // Idem: o progresso vale só enquanto a página estiver aberta.
    }
  },

  liberada(indicePista) {
    return indicePista < this.fasesLiberadas;
  },

  // Libera as fases até a de número n (1, 2, 3...). Devolve true se
  // alguma fase nova foi liberada agora.
  liberarAte(n) {
    n = Math.min(n, PISTAS.length);
    if (n <= this.fasesLiberadas) return false;
    this.fasesLiberadas = n;
    this.salvar();
    return true;
  },
};

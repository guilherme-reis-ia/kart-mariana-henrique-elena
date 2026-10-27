# Família Kart — Mariana, Henrique e Elena

Jogo de corrida de kart 2D visto de cima, no estilo Mario Kart, feito com
HTML5, JavaScript puro e Canvas 2D. Sem frameworks, sem bibliotecas, sem
etapa de build e sem arquivos de imagem ou som: tudo é desenhado e gerado
por código.

## Como rodar

- **No computador:** baixe ou clone esta pasta e abra o arquivo
  `index.html` no Chrome (duplo clique). Não precisa de servidor nem de
  instalação.
- **Online:** https://guilherme-reis-ia.github.io/kart-mariana-henrique-elena/

## Como jogar

| Tecla | Ação |
|---|---|
| ↑ / W | acelerar |
| ↓ / S | frear e, parado, dar ré |
| ← → / A D | virar (e escolher nos menus) |
| Espaço | drift: curva mais fechada, com leve perda de velocidade |
| P | pausar |
| M | ligar/desligar o som |
| R | reiniciar a corrida |
| Esc | voltar / sair da corrida |
| Enter | confirmar nos menus |
| C | mostrar os setores da pista (para entender a contagem de voltas) |

Menu → piloto → dificuldade → fase → corrida de 3 voltas → resultado.

- **Pilotos:** Mariana tem a maior velocidade máxima, Henrique a maior
  aceleração e Elena o melhor controle nas curvas.
- **Dificuldade:** no Fácil os adversários são mais lentos e erram curvas.
  No Difícil são rápidos e precisos. A física do seu kart é a mesma nas duas.
- **Fases:** chegar em 1º ou 2º libera a próxima. O progresso fica salvo no
  navegador (`localStorage`); para recomeçar do zero, apague a chave
  `familia-kart-progresso` em F12 → Application → Local Storage.
- **Na pista:** grama deixa o kart lento, óleo faz rodopiar e perder
  velocidade, placas laranja de turbo dão um empurrão.

## Como o código está organizado

Os arquivos são carregados em ordem pelo `index.html` (scripts comuns, sem
módulos, para funcionar abrindo o arquivo direto).

| Arquivo | Responsabilidade |
|---|---|
| `js/entrada.js` | teclado: teclas seguradas e toques únicos |
| `js/kart.js` | física (aceleração, atrito, aderência, drift, turbo, óleo) e desenho do kart |
| `js/personagens.js` | os três pilotos: cor, inicial e números de física |
| `js/pistas.js` | **dados** das pistas: é o único arquivo para editar ao criar uma pista |
| `js/pista.js` | transforma os dados em geometria: suavização, colisão com o muro, obstáculos, setores e desenho |
| `js/ia.js` | pilotos do computador e as dificuldades |
| `js/efeitos.js` | marcas de pneu e partículas |
| `js/som.js` | sons gerados com Web Audio |
| `js/corrida.js` | regras da corrida: largada, voltas, posições, colisão entre karts, HUD e resultado |
| `js/progresso.js` | fases liberadas, salvas no navegador |
| `js/telas.js` | menus e o que acontece depois de cada corrida |
| `js/jogo.js` | o game loop e a troca entre menus e corrida |

## Como criar uma pista nova

Tudo acontece em `js/pistas.js`. Cada pista é um objeto na lista `PISTAS`.
A ordem da lista é a ordem das fases.

1. **Copie** uma pista existente e cole no fim da lista (antes do `];`).
2. **Dê um nome** (`nome`) e escolha a **largura** do asfalto (`largura`, em
   pixels; 115 é estreita e 180 é larga) e a **faixa de grama** até o muro
   (`borda`).
3. **Desenhe o traçado central** em `pontos`: uma lista de `[x, y]`, na
   ordem em que se corre.
   - O **primeiro ponto é a linha de chegada**, e a corrida segue na direção
     do segundo ponto.
   - A pista é **fechada**: depois do último ponto ela volta sozinha ao
     primeiro.
   - O **y cresce para baixo**: `[1000, 200]` fica acima de `[1000, 800]`.
   - Não precisa de muitos pontos: o código suaviza as curvas entre eles.
     Mantenha os pontos com espaçamento parecido (por exemplo, a cada
     150–400 px); um salto grande logo depois de uma curva entorta a
     suavização.
   - Para uma curva redonda de raio R em volta de um centro (cx, cy), use
     pontos a cada 45°: `[cx + R, cy]`, `[cx + 0.707·R, cy + 0.707·R]`, etc.
   - **Trechos diferentes da pista** precisam ficar a pelo menos
     `largura + 2 × borda + 30` px um do outro, senão os muros se fundem.
4. **Escolha `setores`**: em quantos trechos a volta é dividida para impedir
   atalhos. Algo entre 12 e 20 funciona; pistas mais longas pedem mais.
5. **Obstáculos (opcional):** em `obstaculos`, uma lista de
   `{ tipo, x, y, raio }` com `tipo` igual a `'grama'`, `'oleo'` ou
   `'turbo'`. A placa de turbo se alinha sozinha com a pista.
6. **Teste:** abra o `index.html`. Para jogar a pista nova sem precisar
   liberá-la, coloque-a temporariamente como primeira da lista. Aperte **C**
   durante a corrida para ver os setores.

Exemplo mínimo (um retângulo de cantos arredondados):

```js
{
  nome: 'Minha Pista',
  largura: 160,
  borda: 60,
  setores: 12,
  pontos: [
    [500, 200], [900, 200], [1300, 200],
    [1500, 300], [1600, 500], [1500, 700],
    [1300, 800], [900, 800], [500, 800],
    [300, 700], [200, 500], [300, 300],
  ],
  obstaculos: [
    { tipo: 'turbo', x: 900, y: 200, raio: 30 },
    { tipo: 'oleo', x: 900, y: 820, raio: 24 },
  ],
},
```

## Como foi feito

O jogo foi construído em 6 marcos, cada um jogável: kart e game loop →
pista e voltas → adversários → personagens e menus → pistas 2 e 3 →
acabamento. O histórico de commits mostra cada etapa.

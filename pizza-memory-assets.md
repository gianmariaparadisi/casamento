# Assets PNG — Pizza de Memória

O jogo hoje desenha tudo via CSS (sem nenhum PNG). Todo asset abaixo é **opcional**: se o arquivo existir em `assets/img/pizza/<nome>`, o jogo pode passar a usá-lo; se não existir, continua caindo no desenho CSS atual (nada quebra). Essa é só a lista do que vale gerar, com nome exato e pasta, pra você jogar numa IA de imagem.

**Pasta de destino de tudo:** `assets/img/pizza/`

## Estilo geral (cole isso em todo prompt)

> Ilustração 2D estilo jogo cozy arcade de pizzaria, desenhada à mão, contornos suaves, cores pastel. Paleta: creme #FFF4DC, massa #F3C36B, molho de tomate #D8503D, pepperoni #B93435, queijo #FFE38A, verde sálvia #8EAD7B, verde manjericão #3F8A4C, lilás claro #D9B7D8, rosa suave #F3A6A6, terracota #C7653A, contorno marrom #6A3B2B. Sem realismo, sem 3D, sem textura fotográfica, sem neon. Fundo **transparente** (PNG-32 com alpha), sem sombra projetada externa (sombra pode existir só dentro do próprio elemento). Visto de cima ou de frente conforme indicado em cada item.

---

## 1. Base da pizza e bancada

| Arquivo | Tamanho | Descrição / prompt |
|---|---|---|
| `pizza-base.png` | 900×900px | Pizza redonda vista de cima, já com massa, borda irregular tipo feita à mão, molho de tomate visível na base e camada de queijo derretido por cima, **sem nenhum topping** — é a "tela em branco" onde os ingredientes entram. |
| `pizza-board.png` | 1000×1000px | Tábua de madeira redonda (laranja/terracota), vista de cima, textura de madeira leve, um pouco maior que a pizza pra aparecer a borda da tábua ao redor. |
| `cloche-cover.png` | 900×900px | Tampa/redoma lilás clara cobrindo uma pizza redonda, com uma alcinha/puxador branco no centro — usada pra "esconder" a pizza-modelo enquanto o jogador monta a dele. |
| `bench-grid-bg.png` | 1200×800px | Textura de bancada de pizzaria clara (bege/creme) com um grid leve desenhado, pra ficar atrás das pizzas na bancada. Formato retangular horizontal. |
| `counter-wall-bg.png` | 1200×400px | Parede de tijolinhos claros/pastel atrás do balcão, estilo cozy, formato retangular horizontal e baixo (fica atrás do cliente, no topo da tela). |

## 2. Ingredientes (toppings) — 10 arquivos

Cada um: **300×300px**, visto de cima, silhueta bem reconhecível mesmo pequeno (vai aparecer em ~40-60px na tela), cores fortes e diferentes entre si.

| Arquivo | Descrição / prompt |
|---|---|
| `ingredient-queijo.png` | Punhado de queijo derretido: manchas/fiapos amarelos irregulares, aspecto de queijo puxando. |
| `ingredient-pepperoni.png` | Rodela de pepperoni: círculo vermelho-escuro com pontinhos de gordura mais claros espalhados. |
| `ingredient-azeitona.png` | Rodela de azeitona preta/verde-escura em anel, com furinho claro no centro. |
| `ingredient-cogumelo.png` | Fatia de cogumelo em formato de meia-lua bege, com leve textura de lamelas. |
| `ingredient-manjericao.png` | Folha de manjericão verde-escura, formato de gota/folha, nervura central sutil. |
| `ingredient-cebola-roxa.png` | Anel fino de cebola roxa, tom lilás/roxo translúcido. |
| `ingredient-tomate.png` | Pedaço pequeno de tomate fresco vermelho-vivo, com sementinhas visíveis. |
| `ingredient-pimentao.png` | Tira fina de pimentão verde, formato alongado e levemente curvo. |
| `ingredient-milho.png` | Pequeno grão de milho amarelo-dourado, formato de gota arredondada. |
| `ingredient-abacaxi.png` | Pedacinho triangular de abacaxi amarelo-vivo, aspecto suculento. |

## 3. Caixas de ingredientes (balcão)

| Arquivo | Tamanho | Descrição / prompt |
|---|---|---|
| `ingredient-box-open.png` | 300×340px | Caixinha de ingrediente aberta/vazia: fundo creme/lilás claro, borda arredondada clara, sombra suave — moldura genérica onde o PNG do ingrediente entra por cima. |
| `ingredient-box-locked.png` | 300×340px | Mesma caixinha, mas fechada: tampa por cima e um cadeadinho simples no centro, tom acinzentado indicando bloqueado. |

## 4. Cliente (expressões)

Cada um: **400×400px**, rosto/avatar circular simples e fofo (cartoon), enquadramento de "selfie" (rosto centralizado).

| Arquivo | Descrição / prompt |
|---|---|
| `customer-waiting.png` | Cliente de expressão neutra/tranquila, esperando o pedido. |
| `customer-happy.png` | Cliente sorrindo, satisfeito. |
| `customer-great.png` | Cliente super feliz/eufórico, olhos brilhando, encantado com a pizza. |
| `customer-neutral.png` | Cliente com expressão de "meh", não impressionado. |
| `customer-angry.png` | Cliente bravo, sobrancelhas franzidas, bracinhos cruzados se der pra encaixar no enquadramento. |

## 5. Ícones de power-up e HUD

Cada um: **160×160px**, ícone simples, silhueta clara, mesma paleta.

| Arquivo | Descrição / prompt |
|---|---|
| `icon-powerup-peek.png` | Espiadinha: um olho aberto estilizado ou uma pequena lupa, tom lilás. |
| `icon-powerup-coringa.png` | Coringa: uma estrela ou carta-coringa estilizada, tom verde-manjericão. |
| `icon-powerup-extratime.png` | Tempo extra: ampulheta ou relógio simples com um "+" ao lado, tom queijo/amarelo. |
| `icon-life.png` | Vida cheia: fatia de pizza estilizada em formato de coração (massa + queijo), cores vivas. |
| `icon-life-lost.png` | Mesma fatia-coração, porém acinzentada/apagada, indicando vida perdida. |
| `icon-sound-on.png` | Alto-falante com ondinhas de som, estilo simples. |
| `icon-sound-off.png` | Mesmo alto-falante, sem ondinhas ou com um traço cortando. |

## 6. Selos de nível especial

Cada um: **200×200px**, ícone redondo/badge, cor de fundo terracota (#C7653A) com o desenho em branco/creme por cima.

| Arquivo | Descrição / prompt |
|---|---|
| `badge-relampago.png` | Raio estilizado — nível "Pedido relâmpago". |
| `badge-neblina.png` | Nuvenzinha/névoa estilizada — nível "Pizza com neblina". |
| `badge-exigente.png` | Estrela ou talher cruzado estilizado — nível "Cliente exigente". |
| `badge-surpresa.png` | Interrogação estilizada — nível "Ingrediente surpresa". |

## 7. Confete (opcional)

O confete hoje já reaproveita os PNGs dos ingredientes (seção 2) caindo animados — não precisa de arquivo extra. Se quiser confete "genérico" também:

| Arquivo | Tamanho | Descrição / prompt |
|---|---|---|
| `confetti-piece-01.png` a `confetti-piece-04.png` | 40×60px cada | Pedacinhos de confete retangulares/circulares em 4 variações de cor da paleta (rosa, lilás, verde-manjericão, terracota), levemente girados. |

---

### Resumo rápido de prioridade
Se quiser gerar aos poucos, essa é a ordem que mais muda a cara do jogo:
1. Os 10 ingredientes (seção 2) — é o que mais aparece na tela.
2. `pizza-base.png` + `pizza-board.png` (seção 1).
3. As expressões do cliente (seção 4).
4. Caixinhas de ingrediente (seção 3).
5. Ícones de power-up/HUD e selos de nível (seções 5 e 6) — mais decorativo.

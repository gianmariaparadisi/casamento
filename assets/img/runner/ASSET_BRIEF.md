# Briefing de assets — Corrida da Lua de Mel

Hoje o jogo usa **SVGs provisórios** que já estão no código (em `assets/img/runner/`). Quando você gerar os PNGs definitivos, suba-os **dentro dessa mesma pasta** (`assets/img/runner/`, não direto em `assets/img/`), usando exatamente os nomes abaixo — e me avise para eu trocar a extensão `.svg` por `.png` no código (é uma troca rápida, uma linha por imagem).

**Estilo geral para todos os prompts:** ilustração vetorial plana ("flat design"), tipo papercut/colagem de camadas, sem texturas finas nem gradientes complexos (a imagem aparece pequena na tela, detalhe fino se perde). Silhuetas limpas e reconhecíveis. Fundo **transparente** (PNG-24 com alpha) em todas as imagens, exceto onde indicado o contrário. Paleta de cor de cada destino está nos hex abaixo — use como referência, não precisa ser exato.

Cada item tem: nome do arquivo, descrição do conteúdo, proporção e tamanho sugerido para gerar.

---

## Camada compartilhada — Nuvens (super fundo, movem super lento)

| Arquivo | Conteúdo | Proporção | Tamanho sugerido |
|---|---|---|---|
| `clouds-1.svg` → `clouds-1.png` | Um agrupamento de 2–3 nuvens fofas, brancas/off-white, bordas suaves, estilo flat. Genérica — aparece em todos os destinos. | ~2.3:1 (larga e baixa) | 560×240px |
| `clouds-2.svg` → `clouds-2.png` | Variação do agrupamento de nuvens (formato/posição diferente da 1), mesmo estilo. | ~2.3:1 | 560×240px |

---

## 🇧🇷 Fernando de Noronha
Paleta: céu azul claro `#8FD3E8` → creme `#FDEFC4`; areia `#E8D2A0`.

| Arquivo | Conteúdo | Proporção | Tamanho sugerido |
|---|---|---|---|
| `noronha-backdrop-1.png` | Camada mais profunda — silhuetas distantes de morros/ilhotas (tipo Morro Dois Irmãos), bem clarinhas/translúcidas, sol suave, 1–2 passarinhos ao longe. Precisa ter variação ao longo de toda a largura (a imagem desliza uma vez do início ao fim do trecho). | ~5.1:1 (bem larga e baixa) | 2000×400px |
| `noronha-relief-1.png` | Relevo/penhascos verdes médios, mais perto que o backdrop. **Precisa encaixar lado a lado sem emenda visível** (a borda esquerda deve continuar a direita). | ~3.2:1 | 1920×600px |
| `noronha-mid-1.png` | Formação rochosa/arco de pedra na praia, vertical, pequena. | ~0.6:1 (mais alta que larga) | 360×600px |
| `noronha-mid-2.png` | Coqueiro(s) agrupado(s), vertical. | ~0.6:1 | 360×600px |
| `noronha-mid-3.png` | Moita/flor tropical, vertical, mais baixa. | ~0.6:1 | 360×600px |
| `noronha-fg-1.png` | Tufos de grama de praia / vegetação rasteira, em primeiro plano (passa rápido, na frente de tudo). | ~1.7:1 | 480×280px |
| `noronha-fg-2.png` | Pedaço de madeira de deriva ("driftwood") ou pedrinhas na areia, primeiro plano. | ~1.7:1 | 480×280px |

---

## 🇹🇭 Tailândia
Paleta: céu dourado `#FFD27A` → laranja `#FF9E5E`; terra `#C9A227`.

| Arquivo | Conteúdo | Proporção | Tamanho sugerido |
|---|---|---|---|
| `tailandia-backdrop-1.png` | Silhueta distante de colinas com selva e o topo de um templo dourado aparecendo, névoa quente ao fundo, sol baixo. | ~5.1:1 | 2000×400px |
| `tailandia-relief-1.png` | Colinas de selva em camadas, tom mais médio. Tiling sem emenda (esquerda = direita). | ~3.2:1 | 1920×600px |
| `tailandia-mid-1.png` | Telhado/torre de templo dourado, pequeno, vertical. | ~0.6:1 | 360×600px |
| `tailandia-mid-2.png` | Bananeira ou palmeira fina, vertical. | ~0.6:1 | 360×600px |
| `tailandia-mid-3.png` | Poste com lanternas penduradas, vertical. | ~0.6:1 | 360×600px |
| `tailandia-fg-1.png` | Talos de bambu ou grama alta, primeiro plano. | ~1.7:1 | 480×280px |
| `tailandia-fg-2.png` | Folhas de bananeira caídas / vegetação rasteira, primeiro plano. | ~1.7:1 | 480×280px |

---

## 🇿🇦 África do Sul
Paleta: céu laranja `#FF7E5F` → pêssego `#FEB47B`; terra `#7A5230`.

| Arquivo | Conteúdo | Proporção | Tamanho sugerido |
|---|---|---|---|
| `africa-backdrop-1.png` | Horizonte de savana ao pôr do sol, sol grande e baixo, silhueta distante de uma montanha/kopje, alguma ave voando. | ~5.1:1 | 2000×400px |
| `africa-relief-1.png` | Colinas onduladas de savana com acácias espalhadas, tom médio. Tiling sem emenda. | ~3.2:1 | 1920×600px |
| `africa-mid-1.png` | Acácia (árvore "guarda-chuva" africana), vertical. | ~0.6:1 | 360×600px |
| `africa-mid-2.png` | Baobá, vertical, tronco mais grosso. | ~0.6:1 | 360×600px |
| `africa-mid-3.png` | Cupinzeiro ou formação rochosa pequena, vertical. | ~0.6:1 | 360×600px |
| `africa-fg-1.png` | Touceiras de capim alto de savana, primeiro plano. | ~1.7:1 | 480×280px |
| `africa-fg-2.png` | Arbusto baixo/espinheiro, primeiro plano. | ~1.7:1 | 480×280px |

---

## 🏝️ Caribe
Paleta: céu turquesa `#4FC1E9` → verde-água `#B6E5D8`; areia `#E8C99A`.

| Arquivo | Conteúdo | Proporção | Tamanho sugerido |
|---|---|---|---|
| `caribe-backdrop-1.png` | Cadeia de ilhotas distantes no horizonte, água turquesa clara, névoa pastel suave. | ~5.1:1 | 2000×400px |
| `caribe-relief-1.png` | Pontas de baía/penínsulas com vegetação, tom médio. Tiling sem emenda. | ~3.2:1 | 1920×600px |
| `caribe-mid-1.png` | Coqueiro inclinado, vertical. | ~0.6:1 | 360×600px |
| `caribe-mid-2.png` | Cabana de praia / guarda-sol tiki, vertical. | ~0.6:1 | 360×600px |
| `caribe-mid-3.png` | Formação de coral/leque-do-mar, vertical, mais baixa. | ~0.6:1 | 360×600px |
| `caribe-fg-1.png` | Grama de praia / vegetação rasteira, primeiro plano. | ~1.7:1 | 480×280px |
| `caribe-fg-2.png` | Folhas de palmeira caídas na areia, primeiro plano. | ~1.7:1 | 480×280px |

---

## 🇪🇸 Maiorca
Paleta: céu azul `#3A5BA0` → laranja de fim de tarde `#E8784A`; pedra `#5E7FA3`.

| Arquivo | Conteúdo | Proporção | Tamanho sugerido |
|---|---|---|---|
| `maiorca-backdrop-1.png` | Litoral de penhascos mediterrâneos ao longe, sol baixo no horizonte (fim de tarde), tom azul-âmbar. | ~5.1:1 | 2000×400px |
| `maiorca-relief-1.png` | Colinas em terraços com penhascos de pedra, tom médio. Tiling sem emenda. | ~3.2:1 | 1920×600px |
| `maiorca-mid-1.png` | Cipreste fino, vertical. | ~0.6:1 | 360×600px |
| `maiorca-mid-2.png` | Moinho de vento branco pequeno, vertical. | ~0.6:1 | 360×600px |
| `maiorca-mid-3.png` | Muro de pedra em terraço com videira, vertical, mais baixa. | ~0.6:1 | 360×600px |
| `maiorca-fg-1.png` | Arbustos de lavanda, primeiro plano. | ~1.7:1 | 480×280px |
| `maiorca-fg-2.png` | Trecho de muro de pedra baixo, primeiro plano. | ~1.7:1 | 480×280px |

---

## Resumo rápido
- **Total: 37 imagens** (2 nuvens + 5 destinos × 7 camadas).
- Pastas: tudo dentro de `assets/img/runner/`.
- Todas com fundo transparente, exceto onde não fizer sentido (nenhuma aqui precisa de fundo sólido).
- `relief-1` de cada destino precisa **tile-ar sem emenda** na horizontal (lado esquerdo encaixa com o direito) — é a única camada com essa exigência, porque ela se repete lado a lado continuamente.
- `mid-*` e `fg-*` não precisam tile-ar (eles aparecem espaçados, não colados um no outro).
- `backdrop-1` não precisa tile-ar (ela deslinza uma única vez do início ao fim de cada trecho/destino), mas precisa ter variação de conteúdo ao longo de toda a largura.

Quando subir os PNGs com esses nomes nessa pasta, me avise que eu troco as referências no código de `.svg` para `.png`.

---

## Obstáculos e colecionáveis — assets SEPARADOS (não são decoração)

Confirmando: `mid-*` e `fg-*` acima são só estética de fundo, sem colisão. Os obstáculos e colecionáveis são outra categoria de asset, totalmente separada — hoje eles ainda nem têm imagem própria, são desenhados como emoji direto no canvas (placeholder). Esses sim precisam de arquivo próprio.

Estilo aqui é diferente do fundo: mais **sólido, contrastado e legível em décimos de segundo** (o jogador precisa reconhecer e decidir pular ou não quase instantaneamente) — pode ser mais "cartoon"/saturado que as camadas de paisagem. Arte deve preencher o quadro **de ponta a ponta, sem margem transparente sobrando**, porque a imagem é esticada exatamente no tamanho da caixa de colisão.

Cada destino tem 5 tipos:
- **low** = obstáculo baixo no chão, dá pra pular com um toque rápido.
- **tall** = obstáculo alto no chão, precisa de pulo seguro (mais alto).
- **trap** = obstáculo "armadilha" na altura da cabeça — o certo é **não** pular quando ele estiver passando.
- **collect** = item comum, pega correndo (sem precisar pular).
- **collect-bonus** = item bônus, só aparece a partir da 2ª volta, fica mais alto no ar e exige pulo pra pegar.

| Arquivo | Conteúdo | Proporção (L:A) | Tamanho sugerido |
|---|---|---|---|
| `noronha-obs-low-1.png` | Caranguejo, visto de lado/3-4, estilo flat. | 1:1 | 240×240 |
| `noronha-obs-tall-1.png` | Formação rochosa/pedra alta da praia. | ~1:3.7 (bem fina e alta) | 220×800 |
| `noronha-obs-trap-1.png` | Pássaro voando baixo. | ~1.25:1 | 240×190 |
| `noronha-collect-1.png` | Concha do mar. | 1:1 | 200×200 |
| `noronha-collect-bonus-1.png` | Coco. | 1:1 | 220×220 |
| `tailandia-obs-low-1.png` | Coco caído / fruta pequena no chão. | ~0.93:1 | 230×250 |
| `tailandia-obs-tall-1.png` | Torre/spire dourada de templo. | ~1:3 | 320×950 |
| `tailandia-obs-trap-1.png` | Lanterna de papel pendurada. | 1:1 | 220×220 |
| `tailandia-collect-1.png` | Flor de lótus. | 1:1 | 200×200 |
| `tailandia-collect-bonus-1.png` | Manga. | 1:1 | 220×220 |
| `africa-obs-low-1.png` | Escorpião. | 1:1 | 220×220 |
| `africa-obs-tall-1.png` | Árvore (acácia/baobá) como obstáculo. | ~1:3.3 | 280×930 |
| `africa-obs-trap-1.png` | Águia/gavião voando. | ~1.3:1 | 260×195 |
| `africa-collect-1.png` | Diamante/gema. | 1:1 | 200×200 |
| `africa-collect-bonus-1.png` | Borboleta. | 1:1 | 220×220 |
| `caribe-obs-low-1.png` | Lagosta/garra. | ~1.2:1 | 280×230 |
| `caribe-obs-tall-1.png` | Âncora de navio. | ~1:4.3 | 220×960 |
| `caribe-obs-trap-1.png` | Papagaio/arara voando. | ~1.25:1 | 250×200 |
| `caribe-collect-1.png` | Moeda de tesouro. | 1:1 | 200×200 |
| `caribe-collect-bonus-1.png` | Estrela-do-mar. | 1:1 | 220×220 |
| `maiorca-obs-low-1.png` | Cabra. | 1:1 | 300×300 |
| `maiorca-obs-tall-1.png` | Engrenagem/mecanismo de moinho antigo. | ~1:3.8 | 260×980 |
| `maiorca-obs-trap-1.png` | Pombo voando. | ~1.27:1 | 240×190 |
| `maiorca-collect-1.png` | Aliança de casamento. | 1:1 | 200×200 |
| `maiorca-collect-bonus-1.png` | Cacho de uvas. | 1:1 | 220×220 |

Total dessa categoria: **25 imagens** (5 tipos × 5 destinos). Somado às 37 de paisagem, dá **62 imagens** no total. Quando essas chegarem, eu troco o código pra desenhar a imagem em vez do emoji (é onde estão `drawObstacle()` e `drawCollectible()`).

# Briefing de assets — Corrida da Lua de Mel

Hoje o jogo usa **SVGs provisórios** que já estão no código (em `assets/img/runner/`) pra `backdrop`, `relief`, `clouds` e os obstáculos/colecionáveis. O `ground-1` é novo e não tem placeholder em SVG — até você subir o PNG, o jogo mostra uma cor lisa de chão no lugar. Quando você gerar os PNGs definitivos, suba-os **dentro dessa mesma pasta** (`assets/img/runner/`, não direto em `assets/img/`), usando exatamente os nomes abaixo — o jogo já está configurado pra carregar o PNG automaticamente assim que ele aparecer com o nome certo, sem precisar de nenhuma troca no código.

## Estilo (cole isso junto com a descrição de cada imagem)

Use como referência visual o estilo dos pôsteres de viagem retrô texturizados (savana com zebra/girafa, vila litorânea, vila mediterrânea, céu com nuvens, templo tailandês).

**Cole este bloco (em inglês) em todo prompt, antes da descrição do conteúdo:**

> Retro travel-poster illustration, textured flat-color style with fine paper-grain / halftone noise overlay across the whole image, like an old screen-printed poster. Bold, warm, saturated palette — burnt orange, mustard yellow, ochre, deep teal, olive green, terracotta, plum. A large solid-color sun or moon disc glowing softly in the sky. Depth created through color temperature, not outlines: distant elements in cooler, muted purplish-blue or teal tones; closer elements in warmer, more saturated tones with sharper edges. No black outlines — shapes are defined purely by flat color blocks meeting directly. Simplified, slightly geometric shapes for architecture (flat walls, simple domes/roofs, small square windows) and confidently simplified animals/plants (broad leaf shapes, simplified stripe/spot patterns). Single warm, low directional light. Slightly muted vintage color grading. No glossy/3D rendering, no photorealism.

Para as imagens que são **cenário completo** (backdrop, relief e chão): componha como nas referências — vista ampla, sol/lua grande no céu (no backdrop/relief), camadas de profundidade (montanhas/colinas atrás, mais claras e frias; elementos na frente, mais escuros e saturados).

Para as imagens que são **objeto isolado** (obstáculos, colecionáveis): mesma paleta/textura/regra de "sem contorno preto", mas só o objeto sozinho, recortado, **fundo transparente**, sem vinheta nem cenário em volta.

Paleta de cor de cada destino está nos hex abaixo — use como referência, não precisa ser exato.

## Transparência — o que pintar e o que deixar transparente, por camada

Isso vale igual pros 5 destinos (as excepções de água estão marcadas 💧 nas tabelas abaixo):

- **`backdrop-1`** (a mais ao fundo): **não pinte céu** — deixe a área de céu transparente, o gradiente de céu do jogo já aparece por trás. Pinte só o horizonte: silhueta de montanha/penhasco/skyline distante, sol/lua, 1 ou 2 detalhes (pássaro, névoa). Se o destino tiver mar (💧 Noronha, Caribe, Maiorca), pinte uma faixa de água logo abaixo do horizonte, ocupando a parte de baixo da imagem — essa faixa de água fica **opaca**, é a única parte "cheia" perto da borda inferior. Se não tiver mar (Tailândia, África), a parte de baixo também fica transparente.
- **`relief-1`** (penhasco/relevo, mais perto que o backdrop): mesma lógica — topo transparente (sem céu), só a silhueta do relevo pintada, mais próxima/saturada que no backdrop. Nos destinos com mar (💧), a faixa de água ocupa mais espaço aqui (já estamos mais perto da costa) e fica opaca até a borda inferior da imagem. **Não precisa encaixar sem emenda** — o jogo já disfarça a costura espelhando o desenho a cada outro "tile" (ver seção do chão abaixo pra entender a técnica).
- **`ground-1`** (chão, a camada mais próxima, embaixo dos pés do personagem): **100% opaca, sem transparência** — é uma textura de chão vista de cima/levemente inclinada, preenchendo o quadro todo de ponta a ponta (sem céu, sem água, sem objetos soltos em cima). Pense numa textura contínua de terreno, tipo papel de parede. Assim como o `relief-1`, **não precisa encaixar sem emenda visível** nas bordas — o jogo mesmo disfarça repetindo a textura alternando normal/espelhada lado a lado, então pequenas diferenças nas bordas não vão se notar.
- **`obs-low/tall/trap`** e **`collect/collect-bonus`**: só o objeto sozinho, fundo 100% transparente, sem chão nem cenário ao redor.
- **`clouds`**: só as nuvens, fundo 100% transparente.

Cada item tem: nome do arquivo, descrição do conteúdo, proporção e tamanho sugerido para gerar.

---

## Camada compartilhada — Nuvens (super fundo, movem super lento)

| Arquivo | Conteúdo | Proporção | Tamanho sugerido |
|---|---|---|---|
| `clouds-1.svg` → `clouds-1.png` | Um agrupamento de 2–3 nuvens fofas, brancas/off-white, bordas suaves, estilo flat. Genérica — aparece em todos os destinos. | ~2.3:1 (larga e baixa) | 560×240px |
| `clouds-2.svg` → `clouds-2.png` | Variação do agrupamento de nuvens (formato/posição diferente da 1), mesmo estilo. | ~2.3:1 | 560×240px |

---

## 🇧🇷 Fernando de Noronha
Paleta: céu azul `#8FD3E8` → creme `#FDEFC4`; baía turquesa/teal escuro; penhasco verde-escuro sobre rocha marrom; areia `#E8D2A0`.

**Referência específica de Noronha (a foto do morro com o pássaro preto):** picos rochosos altos cobertos de vegetação verde-escura caindo direto numa baía turquesa, ilhotas de pedra menores na água, faixa de areia clara na enseada, folhagem tropical larga emoldurando os cantos inferiores, e uma ave-de-rabo-forcado preta com mancha vermelha no peito voando. Use essa composição como base pro `backdrop-1` e pro `relief-1`.

| Arquivo | Conteúdo | Proporção | Tamanho sugerido |
|---|---|---|---|
| `noronha-backdrop-1.png` 💧 | Céu transparente (sem pintar). Só o horizonte: picos rochosos altos cobertos de mata, ilhotas de pedra. Da linha do horizonte pra baixo, pinte uma faixa **opaca** de água turquesa (a baía), ocupando a parte inferior da imagem. Bem clarinho/com névoa. Precisa ter variação ao longo de toda a largura (a imagem desliza uma vez do início ao fim do trecho). | ~5.1:1 (bem larga e baixa) | 2000×400px |
| `noronha-relief-1.png` 💧 | Topo transparente. Os mesmos penhascos, mais perto e saturados que o backdrop. Faixa de água turquesa opaca ocupando boa parte da metade inferior (mais perto da costa que no backdrop). Não precisa encaixar sem emenda — o jogo disfarça a repetição espelhando. | ~3.2:1 | 1920×600px |
| `noronha-ground-1.png` | Textura de areia clara de praia, vista de cima, com grão fino e algumas marcas suaves (pegadas leves, ondulações de vento), 100% opaca preenchendo o quadro todo. Sem água, sem pedras grandes, sem objetos soltos. | ~12.8:1 (bem larga e baixa) | 1280×100px |

---

## 🇹🇭 Tailândia
Paleta: céu dourado `#FFD27A` → laranja `#FF9E5E`; terra `#C9A227`.

| Arquivo | Conteúdo | Proporção | Tamanho sugerido |
|---|---|---|---|
| `tailandia-backdrop-1.png` | Céu transparente. Só o horizonte: colinas com selva e o topo de um templo dourado aparecendo, sol baixo. Sem água — parte de baixo da imagem também fica transparente. | ~5.1:1 | 2000×400px |
| `tailandia-relief-1.png` | Topo transparente. Colinas de selva em camadas, tom mais médio, sem água. Não precisa encaixar sem emenda — o jogo disfarça a repetição espelhando. | ~3.2:1 | 1920×600px |
| `tailandia-ground-1.png` | Textura de terra batida dourada/ocre, tipo caminho de templo, vista de cima, com pequenas pedrinhas ou folhas secas espalhadas, 100% opaca preenchendo o quadro todo. | ~12.8:1 | 1280×100px |

---

## 🇿🇦 África do Sul
Paleta: céu laranja `#FF7E5F` → pêssego `#FEB47B`; terra `#7A5230`.

| Arquivo | Conteúdo | Proporção | Tamanho sugerido |
|---|---|---|---|
| `africa-backdrop-1.png` | Céu transparente. Só o horizonte: silhueta distante de montanha/kopje, alguma ave voando, sol grande e baixo. Sem água — parte de baixo transparente. | ~5.1:1 | 2000×400px |
| `africa-relief-1.png` | Topo transparente. Colinas onduladas de savana com acácias espalhadas, tom médio, sem água. Não precisa encaixar sem emenda — o jogo disfarça a repetição espelhando. | ~3.2:1 | 1920×600px |
| `africa-ground-1.png` | Textura de terra rachada de savana, marrom-avermelhada, vista de cima, com rachaduras finas e algumas pedrinhas, 100% opaca preenchendo o quadro todo. | ~12.8:1 | 1280×100px |

---

## 🏝️ Caribe
Paleta: céu turquesa `#4FC1E9` → verde-água `#B6E5D8`; areia `#E8C99A`.

| Arquivo | Conteúdo | Proporção | Tamanho sugerido |
|---|---|---|---|
| `caribe-backdrop-1.png` 💧 | Céu transparente. Horizonte com cadeia de ilhotas distantes. Da linha do horizonte pra baixo, faixa **opaca** de água turquesa clara ocupando a parte inferior, névoa pastel suave. | ~5.1:1 | 2000×400px |
| `caribe-relief-1.png` 💧 | Topo transparente. Pontas de baía/penínsulas com vegetação, tom médio. Faixa de água turquesa opaca ocupando boa parte da metade inferior. Não precisa encaixar sem emenda — o jogo disfarça a repetição espelhando. | ~3.2:1 | 1920×600px |
| `caribe-ground-1.png` | Textura de areia clara/quente, vista de cima, com pequenos fragmentos de concha e coral espalhados, 100% opaca preenchendo o quadro todo. | ~12.8:1 | 1280×100px |

---

## 🇪🇸 Maiorca
Paleta: céu azul `#3A5BA0` → laranja de fim de tarde `#E8784A`; pedra `#5E7FA3`.

| Arquivo | Conteúdo | Proporção | Tamanho sugerido |
|---|---|---|---|
| `maiorca-backdrop-1.png` 💧 | Céu transparente. Horizonte de penhascos mediterrâneos ao longe, sol baixo (fim de tarde). Da linha do horizonte pra baixo, uma faixa **opaca**, mais fina que em Noronha/Caribe, de mar Mediterrâneo (o trecho aqui é caminho de penhasco, não praia — então a água aparece só lá no fundo, não domina a imagem). | ~5.1:1 | 2000×400px |
| `maiorca-relief-1.png` 💧 | Topo transparente. Colinas em terraços com penhascos de pedra, tom médio. Pode mostrar uma lasca de mar entre os penhascos, mas a maior parte da imagem é pedra/terraço, não água. Não precisa encaixar sem emenda — o jogo disfarça a repetição espelhando. | ~3.2:1 | 1920×600px |
| `maiorca-ground-1.png` | Textura de pedra/calçada cinza-azulada em terraço, com linhas de argamassa entre as placas, vista de cima, 100% opaca preenchendo o quadro todo. | ~12.8:1 | 1280×100px |

---

## Resumo rápido
- **Total: 17 imagens** (2 nuvens + 5 destinos × 3 camadas: backdrop, relief, ground).
- Pastas: tudo dentro de `assets/img/runner/`.
- `backdrop-1` e `relief-1` ficam com céu/topo transparente (regras na seção "Transparência" acima); `ground-1` é 100% opaco.
- `relief-1` e `ground-1` de cada destino se repetem lado a lado continuamente, mas **não precisam encaixar sem emenda** — o jogo mesmo disfarça a costura alternando uma cópia normal e uma espelhada a cada tile.
- `backdrop-1` não repete (ela deslinza uma única vez do início ao fim de cada trecho/destino), mas precisa ter variação de conteúdo ao longo de toda a largura.

Quando subir os PNGs com esses nomes nessa pasta, o jogo troca pra eles automaticamente — não precisa de nada no código.

---

## Obstáculos e colecionáveis — assets SEPARADOS (não são decoração)

Os obstáculos e colecionáveis são uma categoria de asset totalmente separada das camadas de cenário acima, sem relação com elas — hoje eles ainda nem têm imagem própria, são desenhados como emoji direto no canvas (placeholder). Esses sim precisam de arquivo próprio.

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
| `noronha-obs-trap-1.png` | Ave-de-rabo-forcado preta com mancha vermelha no peito, voando baixo (igual à da referência). | ~1.25:1 | 240×190 |
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

Total dessa categoria: **25 imagens** (5 tipos × 5 destinos). Somado às 17 de paisagem, dá **42 imagens** no total. Quando essas chegarem, eu troco o código pra desenhar a imagem em vez do emoji (é onde estão `drawObstacle()` e `drawCollectible()`).

# Radar Marca — Site "Radar Vivo Contínuo" (versão Fable)

Versão WOW/vanguarda do site, construída a partir do brief `../brief-fable-radar-vivo.md`.
**Projeto isolado** — não altera nada do site atual.

## O conceito

Um único radar em `<canvas>` fixo atravessa a página inteira e **transforma-se ao longo do scroll**:

> **v4.1 "Radar Primeiro" (2026-06-12)** — inversão de ênfase: a **vigilância é a
> protagonista** (hero, 1ª venda, SEO, FAQ) e o registo passa a complemento.
> Os nomes das marcas vivem agora **dentro do radar** na secção de vigilância,
> sincronizados com a lista de deteções. Spec:
> `../docs/superpowers/specs/2026-06-12-vigilancia-primeiro-design.md`

| Cena | Secção | O que o radar faz |
|---|---|---|
| 01 | Hero | Ecrã inteiro, sweep vivo, blip dourado "a sua marca", parallax ao cursor. Copy liderado pela vigilância |
| 02 | A Tese | Recua para fundo; um blip fica **vermelho** ("pedido colidente · sem aviso") |
| 03 | Vigilância | **A cena-espetáculo.** O radar ancora num palco largo com rasto fosforescente, faíscas e anéis vivos; os nomes das marcas são **descobertos letra a letra** pelo feixe, com linha de dados centro→blip. Quando o feixe apanha o conflito, **o tempo abranda**: a mira fecha-se sobre o blip vermelho, o palco entra em modo alerta (vinheta vermelha + tremor) e surge o cartão "⚠ CONFLITO DETETADO · alerta enviado <48h" — depois o varrimento retoma, em loop. A lista de deteções acende em sincronia com o feixe; crosshair interativo ao cursor (desktop). Pricebox ~€2/mês |
| 04 | Registo | Cena discreta atrás do cartão de orçamento à medida (sem preço fixo — pede-se orçamento individualizado); enquadrado como "o ponto de partida" |
| 05 | Funil | O **feixe estende-se** e a timeline de 3 nós acende em sequência |
| 06–07 | Confiança/FAQ | Acalma para textura ambiente |
| 08 | CTA final | Re-forma-se e o blip "a sua marca" **trava a verde — protegida** |

Extras: barra de progresso dourada, HUD live-ops (canto inferior esquerdo, aparece após o hero), mini-nav fixa, ticker em loop contínuo, CTAs magnéticos.

## Stack

- HTML/CSS/JS num único `index.html` — **estático puro, zero build**
- GSAP 3 + ScrollTrigger **self-hosted** (`js/`) — com **fallback completo**: sem JS, todo o conteúdo fica visível
- JS principal externo em `js/main.js` (permite CSP sem `unsafe-inline` para scripts)
- Fonts **self-hosted** em `fonts/` (Inter Tight, Instrument Serif, JetBrains Mono) — zero pedidos a terceiros no load
- `prefers-reduced-motion`: radar estático discreto, sem animações, conteúdo todo legível

## Publicar (ptisp ou qualquer alojamento estático)

Fazer upload do **conteúdo desta pasta** para a raiz do alojamento. Mais nada.

## Verificado

- Sem erros de consola (Chromium, desktop 1440×900 e mobile 390×844)
- Todas as cenas do radar testadas com scroll real
- Factos de negócio: vigilância €295,20 (único preço no site); registo apresentado como orçamento individualizado (v6, 2026-07-06)
- Painel "ao vivo" mantém etiquetas DEMO / dados ilustrativos
- SEO/JSON-LD/OG/sitemap/robots/páginas legais preservados

> **v6 "Foco na Vigilância" (2026-07-06)** — o preço do registo saiu do site; o registo
> passa a "orçamento à medida" pedido pelo formulário (chips de intenção). Hardening de
> segurança: CSP via meta, referrer policy, GSAP+fonts self-hosted, honeypot anti-spam,
> `.well-known/security.txt`, metas de segurança nas páginas legais.

> **v7 "Luz em vez de efeitos" (2026-09-24)** — evolução visual cinematográfica, sem tocar em
> textos, estrutura, preços, FAQ, formulário, links, metas ou logo. Spec:
> `../docs/superpowers/specs/2026-09-24-radar-cine-design.md`.
> - O varrimento do radar passa a ser a fonte de luz da página (tungsténio #F1E4C3 + bloom);
>   o âmbar (#D9A441 / #F2C56B) fica reservado a CTAs e alertas; o vermelho e o verde saíram
>   (estados calmos em steel #8EA9D6). Vinheta e grão de película estático (`brand/grain.svg`).
> - **GSAP + ScrollTrigger removidos** (−116 KB): reveals por IntersectionObserver, entrada do hero
>   em CSS, Ato II da tese em `position: sticky`, timeline por IO. Sem loops além do varrimento.
> - Cartões de preço, consola, FAQ e formulário em painéis opacos e visíveis desde o primeiro paint;
>   contadores de preço removidos; contraste AA em todo o texto (Lighthouse a11y 100).
> - Botão de som e áudio sintetizado removidos. Capítulos numerados por CSS counters; HUD como claquete.
> - Lighthouse mobile: performance 95→99, acessibilidade 96→100, LCP 2,9 s→2,1 s.

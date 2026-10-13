# Radar Marca — Site 5.0 "Claro" (2026-10-13)

Homepage nova, construída para conversão. Fonte: `6.Novo Site Radar Marca 5.0/alternativa-A-claro/`
(análise do site anterior e alternativa B em `6.Novo Site Radar Marca 5.0/analise/`).

## O conceito

A sala de operações só existe no primeiro ecrã. À esquerda: título, preço (€295,20, pagamento único,
10 anos), condições e o campo "nome da marca" que pré-preenche o formulário. À direita: **o alerta real**
que o cliente recebe (email com os campos do pedido parecido) com um radar compacto por cima que deteta
o pedido em ~1,3 s e faz o alerta "chegar" (~2,5 s após o load). Depois disso o radar repete em silêncio.

A partir do hero o site é navy sobre papel (creme): como funciona (3 passos) → porquê existe (tese,
linha do tempo dos 2 meses de oposição, comparação de custo) → preço (vigilância em destaque, registo
€200 + IVA + taxas INPI em segundo) → o que fazemos / não fazemos → FAQ → formulário curto.

Face ao v7 saíram: radar de 10 ecrãs, HUD, barra de progresso, letterbox, scroll preso (tese sticky),
ticker, consola "842/s", seis etiquetas "demo". Fica uma única nota "exemplo" no alerta ilustrativo.
Página com 6,5 ecrãs em desktop (antes 10); a mensagem-chave chega aos ~2,5 s (antes 7,7–8,8 s).

## Stack

- HTML/CSS num único `index.html` + JS externo em `js/main.js` — **estático puro, zero build, zero bibliotecas**
- CSP via meta (`script-src 'self'`), referrer policy, honeypot anti-spam, `.well-known/security.txt`
- Fonts **self-hosted** em `fonts/` (Inter Tight, Instrument Serif, JetBrains Mono) — zero pedidos a terceiros no load
- Radar em `<canvas>` com `requestAnimationFrame`; `prefers-reduced-motion` → frame estático; sem JS → conteúdo todo visível
- Formulário: Formspree `xbdwbqov` (fetch + JSON), campos iguais ao anterior (name, email, telefone, marca, interesse, mensagem)
- `flyer.html` + `js/flyer.js` e a pasta `social/` não fazem parte da homepage (pipeline de redes sociais)

## Publicar

GitHub Pages, branch `master` deste repo, CNAME `www.radarmarca.pt`. Processo e cache-busting em
`3.Novo Site Radar Marca 4.0/docs/DEPLOY.md`. **Sempre que `js/main.js` mudar, bumpar o `?v=` no `<script>`**
(o Cloudflare cacheia `.js` durante 4 h).

## Verificado (2026-10-13)

- Chromium real, desktop 1440×900 e mobile 390×844: sem erros de consola, sem pedidos falhados, sem overflow horizontal
- Factos de negócio inalterados: vigilância €295,20 (pagamento único, 10 anos); registo €200 + IVA, taxas INPI à parte
- SEO/JSON-LD/OG/sitemap/robots/páginas legais/llms.txt preservados; `?v=20261013` no `main.js`

## Histórico

- **v7 "Luz em vez de efeitos" (2026-09-24)** — radar cinematográfico de 10 ecrãs, GSAP removido. Commits `e11ad2c` + `e5463e2`.
- **v6 "Foco na Vigilância" (2026-07-06)** — preço do registo sai do site; hardening de segurança.
- **v4.1 "Radar Primeiro" (2026-06-12)** — vigilância como protagonista.

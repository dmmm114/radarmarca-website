# Radar Marca — Site

Tudo o que precisa para colocar online.

## Estrutura

```
site/
├── index.html              ← Página principal
├── explainer.html          ← Vídeo explicativo (HTML animado + som sintético)
├── animations.jsx          ← Motor de animação do explainer
├── explainer-scenes.jsx    ← Cenas + banda sonora do explainer
├── termos.html             ← Termos e Condições
├── privacidade.html        ← Política de Privacidade
├── reclamacoes.html        ← Reclamações e RAL
├── logo-white.png          ← Logo (legacy, usado nas páginas legais)
└── brand/                  ← Assets oficiais da marca
    ├── lockup-horizontal-on-navy.svg
    ├── symbol-on-navy.svg
    └── favicon-32.svg
```

## Como publicar

1. Faça upload da pasta `site/` (conteúdo, não a pasta em si) para a raíz do seu alojamento.
2. O ficheiro `index.html` será servido automaticamente em `radarmarca.pt`.
3. As páginas legais ficam em `radarmarca.pt/termos.html`, `radarmarca.pt/privacidade.html`, `radarmarca.pt/reclamacoes.html`.

Funciona em qualquer alojamento estático: Netlify, Vercel, GitHub Pages, Cloudflare Pages, ou hosting tradicional (cPanel/FTP).

## Notas

- O painel **"Operação em tempo real"** mostra dados **simulados** (etiqueta "Demo" visível). Substituir por dados reais requer um backend que processe o BPI publicado pelo INPI.
- O **explainer** (clicar "Ver o radar em movimento") é um vídeo HTML/SVG animado com som sintetizado em tempo real. Funciona offline, sem YouTube. Para activar som, clicar no botão "Activar som" no canto superior direito do vídeo.
- Fontes carregadas via Google Fonts (Instrument Serif, Inter Tight, JetBrains Mono) — necessitam ligação à internet.
- Animações respeitam `prefers-reduced-motion`.

# Artblock Brasil

> 🇧🇷 Fork do [artblock](https://github.com/vuciv/artblock) original, adaptado para exibir obras de arte brasileiras de museus públicos.

**Todo anúncio da internet, substituído por arte brasileira.**

O Artblock Brasil é uma extensão para Chrome que detecta anúncios, conteúdo patrocinado, widgets de afiliados e lixo promocional nas páginas que você visita e os substitui por obras de dois acervos públicos brasileiros:

- 🏛 **Brasiliana Museus** — pintura, fotografia, documentos históricos e muito mais
- 🏛 **Museu Histórico Nacional (IBRAM)** — séculos de arte e história do Brasil

## Funcionalidades

- Detecta Google Ads, DoubleClick, Amazon, Taboola/Outbrain, MGID, RevContent, conteúdo patrocinado, widgets de afiliados e prompts de paywall
- Categorias: Modernismo, Academismo, Paisagem, História, Fotografia
- Nunca exibe a mesma imagem duas vezes na mesma sessão
- Passe o mouse sobre qualquer slot substituído para ver título, artista, data e museu de origem
- Badge na barra de ferramentas conta quantos anúncios foram substituídos na aba atual

## Instalação

### Chrome Web Store / Firefox Add-ons

_(Em breve.)_

### Modo desenvolvedor (sem loja)

**Chrome / Edge / Brave**

1. Clone este repositório: `git clone https://github.com/seu-usuario/artblock.git`
2. Abra `chrome://extensions`, ative o **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação** e selecione a pasta do repositório
4. Acesse qualquer site com anúncios — as substituições acontecem automaticamente

**Firefox**

1. Clone o repositório
2. Execute `./build.sh` — gera `artblock-firefox-v1.0.0.zip`
3. Abra `about:debugging#/runtime/this-firefox` → **Carregar extensão temporária** → selecione o zip (ou o `manifest.firefox.json` do repositório)

## Gerando pacotes de lançamento

Gera `artblock-brasil-chrome-vX.Y.Z.zip` e `artblock-brasil-firefox-vX.Y.Z.zip`, prontos para upload nas respectivas lojas.

## Como funciona

- `content/detector.js` varre o DOM em busca de contêineres de anúncios via seletores CSS e heurísticas de tamanho IAB, ignorando correspondências aninhadas para substituir apenas o slot mais externo.
- `content/observer.js` monitora anúncios injetados dinamicamente via `MutationObserver`.
- `content/replacer.js` substitui cada slot detectado por uma `<img>` dimensionada para caber, com tooltip ao passar o mouse mostrando os metadados da obra.
- `background/index.js` busca metadados das obras nas APIs públicas do Tainacan (Brasiliana Museus e IBRAM) e os armazena em cache por proporção de aspecto no `chrome.storage.local`, para que as substituições sejam instantâneas e não se repitam na sessão.

## Privacidade

O Artblock Brasil não coleta **nada**. Sem analytics, sem contas, sem telemetria, sem histórico de navegação. As únicas requisições externas são para as APIs públicas dos museus brasileiros, e essas requisições carregam apenas um termo de busca genérico. Veja [PRIVACY.md](./PRIVACY.md).

## Créditos

Obras e imagens provenientes dos acervos abertos da [Brasiliana Museus](https://brasiliana.museus.gov.br) e do [Museu Histórico Nacional / IBRAM](https://mhn.acervos.museus.gov.br). Todos os metadados e imagens pertencem às respectivas instituições.

Fork baseado no projeto original [vuciv/artblock](https://github.com/vuciv/artblock) — MIT License.

## Licença

[MIT](./LICENSE)

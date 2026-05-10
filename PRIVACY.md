# Artblock Brasil — Política de Privacidade

*Última atualização: 2026-04-19*

## Resumo

**O Artblock Brasil não coleta, armazena nem transmite nenhuma informação pessoal, histórico de navegação ou dados do usuário.** Tudo o que ele faz acontece localmente no seu navegador.

## O que o Artblock Brasil faz

O Artblock Brasil é uma extensão para Chrome que substitui anúncios e conteúdo patrocinado nas páginas que você visita por obras de arte de dois acervos públicos brasileiros:

- Brasiliana Museus — [brasiliana.museus.gov.br](https://brasiliana.museus.gov.br)
- Museu Histórico Nacional (IBRAM) — [mhn.acervos.museus.gov.br](https://mhn.acervos.museus.gov.br)

## Dados que coletamos

**Nenhum.**

Especificamente:

- Nenhuma informação de identificação pessoal (nome, e-mail, endereço, CPF).
- Nenhum dado de saúde, financeiro, de autenticação ou de localização.
- Nenhum histórico de navegação. Nunca registramos, armazenamos ou enviamos as URLs das páginas que você visita.
- Nenhuma atividade do usuário. Não rastreamos cliques, teclas digitadas, rolagem ou movimentos do mouse.
- Nenhum conteúdo de página. A extensão lê o DOM da página que você está visualizando apenas para identificar elementos com aparência de anúncio (por nome de classe, ID do elemento ou tipo de tag) e substituí-los. Essa leitura é feita localmente no seu navegador e nunca é transmitida para nenhum lugar.
- Nenhum analytics, telemetria, conta ou pixel de rastreamento.

## Dados armazenados localmente no seu dispositivo

O Artblock Brasil utiliza as APIs de armazenamento de extensões do Chrome para salvar:

- Suas próprias configurações — se a extensão está ativa e qual categoria de arte você escolheu (`chrome.storage.sync`, portanto acompanha você entre instalações do Chrome com a mesma conta Google).
- Um cache local de metadados de obras (título, artista, URL da imagem) obtidos das APIs públicas acima (`chrome.storage.local`), para que a extensão não precise consultar essas APIs a cada carregamento de página.
- Um contador de sessão com quantos anúncios foram substituídos na sessão atual do navegador, para o badge na barra de ferramentas (`chrome.storage.session`).

Nada disso é transmitido para fora do seu dispositivo.

## Requisições de rede que o Artblock Brasil faz

As únicas requisições de rede que o Artblock Brasil realiza são para as duas APIs públicas de museus listadas acima e para os arquivos de imagem das obras nos CDNs dessas instituições. Essas requisições contêm apenas um termo de busca genérico (ex.: `"modernismo"`, `"paisagem"`) e um número de página de resultados. Elas não incluem nenhum identificador, cookie ou informação sobre você ou o site que você está visitando.

## Terceiros

O Artblock Brasil não compartilha, vende nem transfere nenhum dado a terceiros, pois simplesmente não coleta dados para compartilhar.

## Alterações nesta política

Caso esta política seja alterada, a versão revisada será publicada na URL onde você está lendo isto, com a data de "Última atualização" atualizada no topo.

## Contato

Dúvidas: abra uma issue no repositório do Artblock Brasil no GitHub.

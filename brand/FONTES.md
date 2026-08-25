# Fontes da marca Kronos

## Hierarquia oficial

- Principal — **Intro Pro**: interface, navegação, textos, formulários e controles.
- Secundária — **Univers**: títulos, chamadas, números de destaque e assinatura da marca.

Essa hierarquia está centralizada nas variáveis `--font-primary` e `--font-secondary` de `src/app/globals.css`.

## Arquivos necessários para renderização exata

O material original recebido contém a especificação visual das fontes, mas não inclui arquivos `.woff2`, `.woff`, `.otf` ou `.ttf`. Para distribuição web, adicionar aqui somente arquivos devidamente licenciados, preferencialmente em WOFF2:

- `IntroPro-Regular.woff2`
- `IntroPro-Medium.woff2`
- `IntroPro-SemiBold.woff2`
- `IntroPro-Bold.woff2`
- `Univers-Regular.woff2`
- `Univers-Medium.woff2`
- `Univers-Bold.woff2`

Enquanto esses arquivos não estiverem disponíveis, o sistema mantém a mesma hierarquia com fallbacks de proporção normal, sem recorrer a fontes condensadas.

# Operacao de Conteudo AD Suzano

Este projeto passa a ter duas camadas:

1. `Portal de analise`
   Alimentado por robos da FPFS, agenda semanal e cruzamentos estatisticos.

2. `Portal institucional`
   Espelho do site `https://adsuzano.com.br/`, com estrutura pronta para migracao operacional.

## Fontes por area

`API / automacao`

- Jogos
- Campeonatos
- Ranking
- Atletas e estatisticas
- Videos e fotos quando houver fonte publica consistente

`Input manual`

- Sobre
- Diretoria
- Campos
- Transparencia
- Textos de destaque da home
- Ordenacao editorial de videos, fotos e noticias

`Hibrido`

- Patrocinadores: manual para cadastro, logo e prioridade; automatizado para exibir
- Contato: formulario visual no portal e integracao posterior com e-mail, CRM ou WhatsApp
- Matricula: CTA publico hoje, integracao com formulario proprio depois

## Scripts

`npm run sync:club-site`
Sincroniza o espelho de paginas e conteudo publico do site institucional atual para `src/data/clubSite.js`.

`npm run update:fpfs`
Atualiza categorias, jogos, rankings e base da FPFS usada pelo portal de analise.

`npm run update:news`
Atualiza o radar de noticias.

## Caminho recomendado

1. Curto prazo: manter o espelho sincronizado por scraping controlado.
2. Medio prazo: mover institucional para um CMS leve com cadastro manual.
3. Longo prazo: separar API esportiva, CMS institucional e automacoes editoriais.

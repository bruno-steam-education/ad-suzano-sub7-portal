# AD Suzano Sub-7 Portal

Portal em React para acompanhar o AD Suzano Sub-7 no Campeonato Paulista de Futsal A2.

## Rodar localmente

```bash
npm install
npm run dev
```

## Publicar no GitHub Pages

O projeto ja esta configurado para GitHub Pages com Vite usando `base: './'`.

1. Suba o repositorio no GitHub.
2. Em `Settings > Pages`, escolha `GitHub Actions`.
3. O workflow `.github/workflows/pages.yml` fara build e publicacao a cada push na branch `main`.

## Atualizar dados

Edite os arquivos em `src/data/`:

- `season.js`: jogos, resultados, proximos confrontos e fonte FPFS.
- `players.js`: atletas, indicadores manuais e videos do YouTube.

O portal calcula automaticamente forma recente, tabela simplificada, relacoes indiretas entre adversarios e chance de vitoria.

## Noticias e clima

- O card "Hoje em Suzano" usa a API publica Open-Meteo no navegador.
- O workflow `.github/workflows/update-news.yml` roda todos os dias as 06:30 de Sao Paulo (`09:30 UTC`) e executa `npm run update:news`.
- O script `scripts/update-news.mjs` busca feeds RSS publicos, gera pelo menos 10 itens semanais em `src/data/news.js` e publica o Pages na mesma execucao.
- A interface usa Motion (`motiondivision/motion`) para microinteracoes e transicoes leves em React.

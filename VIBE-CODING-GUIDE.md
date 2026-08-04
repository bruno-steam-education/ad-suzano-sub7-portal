# 🚀 Vibe Coding & Agent Handover Guide: AD Suzano Futsal Portal

> **Instruções para IAs, Assistentes de Vibe Coding e Desenvolvedores**
> Este documento contém toda a arquitetura, regras de negócio, fluxos de automação e procedimentos de build/deploy para que qualquer IA possa continuar a evolução do projeto sem sobressaltos.

---

## 📌 1. Visão Geral do Projeto

O **AD Suzano Sub-7 & Base Portal** (`ad-suzano-sub7-portal`) é uma aplicação web construída com **React 19**, **Vite 7** e **Vanilla CSS**, criada para servir ao mesmo tempo como:
1. **Site Institucional Oficial do Clube AD Suzano**: Página de entrada (`/`) aberta para a torcida e imprensa, com história, diretoria, elencos do Sub-7 ao Sub-18, escolinha de futsal, fotos/vídeos e patrocinadores.
2. **Ambiente de Análises Táticas (`/#/analise`)**: Portal de inteligência competitiva com tabelas espelho da FPFS, cruzamento indireto contra adversários em comum e robôs de estimativa de vitória.
3. **Área Restrita da Comissão Técnica (Senha `Ad001`)**: Ambiente protegido por senha que oculta do público externo (e de adversários) as projeções de risco de queda, cotas de eficiência por categoria do Art. 135 do RGC e teto matemático.

---

## 🛠️ 2. Stack Tecnológica e Bibliotecas

- **Frontend**: React 19 + Vite 7 (módulos ES nativos, `base: './'`).
- **Animações / UX**: `motion/react` (Framer Motion).
- **Ícones**: `lucide-react`.
- **Automação & Scraping**: Node.js (v24), Cheerio 1.2, Fast-XML-Parser 5.8.
- **Estilização**: Vanilla CSS3 com variáveis CSS (`src/styles.css`), flexbox, CSS grid, glassmorphism e gradients HSL/HEX customizados.
- **Hospedagem & CI/CD**: GitHub Pages (Repositório Público com suporte duplo a branch `gh-pages` e GitHub Actions Workflow).

---

## 📁 3. Estrutura de Arquivos e Responsabilidades

```
c:\Programas\AD Suzano/
├── .github/workflows/         # Workflows de automação e deploy do GitHub Actions
│   ├── pages.yml              # Build e deploy automático no GitHub Pages (branch gh-pages + API)
│   ├── update-news.yml        # Cron diário (06:30/18:30 SP) para atualizar notícias e re-deploy
│   └── update-fpfs-efficiency.yml # Cron a cada 6h para atualizar súmulas FPFS
├── public/                    # Ativos estáticos e PWA
│   ├── ad-suzano-logo.png     # Escudo oficial do clube
│   ├── manifest.webmanifest   # Manifesto PWA
│   └── sw.js                  # Service Worker robusto para suporte offline
├── scripts/                   # Automações Node.js para ingestão de dados
│   ├── audit-robots.mjs       # Audit de integridade dos 8 robôs (<36h)
│   ├── sync-club-site.mjs     # Scraping do site institucional com tratamento seguro de erros (403)
│   ├── update-fpfs.mjs        # Raspagem das súmulas online da FPFS (8 categorias)
│   └── update-news.mjs        # Sincronização de RSS feeds de notícias
├── src/
│   ├── assets/                # Logos e imagens tratadas
│   ├── components/
│   │   ├── AccessModal.jsx            # Modal de autenticação por senha (Ad001)
│   │   ├── ProtectedSection.jsx       # Wrapper que bloqueia conteúdo tático no modo público
│   │   ├── CategoryEfficiencyHeader.jsx # Painel de metas de pontos e cotas Art. 135 RGC
│   │   └── EfficiencyFormulaModal.jsx # Modal explicativo do cálculo da cota
│   ├── data/
│   │   ├── categories.js      # Metadados das categorias (Sub-7 ao Sub-18)
│   │   ├── clubSite.js        # Dados sincronizados do site institucional (9k+ linhas)
│   │   ├── fpfsCategories.js  # Resultados, tabelas e próximos jogos da FPFS
│   │   ├── news.js            # Notícias atualizadas do clube
│   │   ├── schedule.js        # Calendário de treinos e avisos semanais
│   │   └── season.js          # Confrontos indiretos, locais e fonte FPFS
│   ├── services/
│   │   ├── pwa.js             # Registro do Service Worker e detecção mobile/PWA
│   │   └── weather.js         # API de clima de Suzano (Open-Meteo)
│   ├── utils/
│   │   ├── analysis.js        # Robô de previsão de partidas e histórico
│   │   └── efficiencyRanking.js # Algoritmo de cálculo de risco e metas de acesso
│   ├── clubSite.jsx           # Componente da experiência do Site Oficial do Clube
│   ├── main.jsx               # Ponto de entrada, roteador e shell da aplicação
│   └── styles.css             # Design System completo e temas
├── package.json               # Dependências e scripts de execução
├── vite.config.js             # Configuração do Vite (`base: './'`)
└── VIBE-CODING-GUIDE.md       # Este documento de instrução
```

---

## 🔑 4. Arquitetura de Roteamento e Proteção por Senha

### A. Sistema de Roteamento (`parseAppHash` em `src/main.jsx`)
- **Padrão (Sem Hash `/` ou `/#/portal/home`)**: Renderiza a `ClubSiteExperience` (Site Institucional Oficial do Clube).
- **Rota `/#/analise`**: Renderiza a `App` no modo de análise tática (Painel de Categorias, FPFS, Tabelas e Robô).

### B. Sistema de Proteção da Comissão Técnica (`sessionStorage`)
- **Senha Padrão**: `Ad001` (definida em `src/components/AccessModal.jsx`).
- **Estado de Autenticação**:
  - Salvo em `sessionStorage.getItem('ad-suzano-staff-auth') === 'true'`.
  - No topo do modo de análise, o componente `StaffAccessBar` exibe o status de acesso e botões para login/logout ou retorno ao site oficial.
- **Bloqueio de Seções (`ProtectedSection.jsx`)**:
  - Quando em modo público, o wrapper substitui painéis pesados por um **Card de Bloqueio Elegante** com mensagem tática e botão *"Digitar Senha de Acesso"*.
  - Componentes protegidos: `CategoryEfficiencyHeader`, `CategoryNextGamesV2` (Robô de Previsão), `TitleProjection`, `AccessProjection`, `WeeklyDesk` e `CategoryRobotAudit`.

---

## 🔄 5. Ingestão de Dados e Scripts de Automação

Para rodar ou atualizar manualmente os dados do projeto via terminal:

```bash
# 1. Atualizar súmulas e classificação oficial da FPFS (8 categorias)
npm run update:fpfs

# 2. Atualizar notícias e feeds do clube
npm run update:news

# 3. Sincronizar dados do site institucional (tratamento seguro contra 403)
npm run sync:club-site

# 4. Auditar a integridade dos robôs de inteligência (verifica idade < 36h)
npm run audit:robots
```

> ⚠️ **Atenção ao `sync-club-site.mjs`**: O servidor institucional pode retornar HTTP 403 para robôs de scraping. O script foi projetado para capturar essa exceção de forma graciosa e **preservar os dados existentes** em `src/data/clubSite.js`, evitando zerar a base ou quebrar o pipeline do GitHub Actions.

---

## 🚀 6. Processo Completo de Build e Deploy no GitHub Pages

### A. Pré-requisitos de Infraestrutura no GitHub
1. Repositório **PÚBLICO**: O repositório `bruno-steam-education/ad-suzano-sub7-portal` **deve permanecer público** no plano gratuito do GitHub para que o serviço do GitHub Pages permaneça ativo.
2. Branch **`gh-pages`**: O workflow compila e faz push dos arquivos de produção para a branch `gh-pages`.
3. Configuração em `Settings > Pages`:
   - **Source**: `Deploy from a branch`
   - **Branch**: `gh-pages` / `/ (root)`

### B. Comando de Build Local
```bash
npm run build
```
O build gera os artefatos minificados na pasta `dist/`.

### C. Publicação via Git
Para enviar atualizações para a nuvem de forma segura:

```bash
# 1. Adicionar arquivos modificados
git add .

# 2. Criar commit descritivo (seguir padrão Conventional Commits)
git commit -m "feat(modulo): breve descricao da melhoria"

# 3. Fazer rebase com a branch remota para incorporar automacoes dos bots
git pull --rebase origin main

# 4. Enviar para o repositório principal (dispara o GitHub Actions)
git push origin main
```

O GitHub Actions executará o workflow `.github/workflows/pages.yml`, publicando a nova versão em ~30 segundos no endereço oficial:
👉 **`https://bruno-steam-education.github.io/ad-suzano-sub7-portal/`**

---

## 🎨 7. Guia de Estilo e Diretrizes para o Vibe Coding (UI/UX)

Quando for solicitar ou realizar alterações de interface:

1. **Paleta de Cores e Contraste**:
   - Azul Principal AD Suzano: `#071739` / `#0c2356` / `#071a3d`
   - Vermelho Destaque AD Suzano: `#ef4444` / `#dc2626` / `#d92332`
   - Texto sobre fundo escuro: **Sempre usar branco puro (`#ffffff`)** ou cinza claro (`#f1f5f9` / `#cbd5e1`). Nunca usar tons cinza-escuros ou vermelhos escuros sobre fundo azul marinho.
2. **Botões e CTAs**:
   - Usar degradês vivos (`linear-gradient(135deg, #ef4444 0%, #dc2626 100%)`) com bordas suaves e sombras com brilho.
   - Para botões secundários sobre fundo escuro, usar estilo **Frosted Glass** (`rgba(255, 255, 255, 0.15)` com borda `rgba(255, 255, 255, 0.3)` e texto branco).
3. **Animações e Micro-interações**:
   - Utilizar componentes de `motion/react` (`motion.div`, `motion.button`, `motion.a`).
   - Aplicar `whileHover={{ scale: 1.03 }}` e `whileTap={{ scale: 0.97 }}` para dar sensação tátil de aplicativo premium.

---

## 📋 8. Checklist Rápido para Continuar o Projeto

- [ ] Executar `npm install` ao clonar o repositório.
- [ ] Executar `npm run dev` para iniciar o servidor local do Vite em `http://localhost:5173`.
- [ ] Testar a rota do site do clube (`http://localhost:5173/#/portal/home`) e a rota de análises (`http://localhost:5173/#/analise`).
- [ ] Testar a senha `Ad001` para desbloqueio da comissão técnica.
- [ ] Rodar `npm run audit:robots` e `npm run build` antes de qualquer commit.
- [ ] Fazer `git pull --rebase origin main` antes de dar `git push`.

---
*Documento gerado para orientação de Agentes de IA e Vibe Coding - AD Suzano Futsal.*

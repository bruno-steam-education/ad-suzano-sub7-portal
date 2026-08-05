import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  ArrowLeft,
  ArrowRight,
  BadgeInfo,
  CalendarDays,
  Camera,
  CircleHelp,
  FileText,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Image as ImageIcon,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Medal,
  Phone,
  PlayCircle,
  Pause,
  Radio,
  Search,
  Shield,
  SkipBack,
  SkipForward,
  Square,
  Star,
  Trophy,
  Users,
  Menu,
  Pencil,
  Save,
  Trash2,
  Upload,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion } from 'motion/react';
import suzanoLogo from './assets/ad-suzano-logo.png';
import { clubSiteData } from './data/clubSite';
import { fpfsCategories } from './data/fpfsCategories';
import { youthLeagueCategories } from './data/youthLeagueCategories';
import { newsItems } from './data/news';
import { technicalStaffByCategory, technicalStaffDirectory } from './data/technicalStaff';
import { athleteSeasonStats } from './data/athleteSeasonStats';
import { athleteRoster } from './data/athleteRoster';
import { AthleteAdminProvider, useAthleteAdmin } from './components/AthleteAdminContext';
import StaffOperationsPanel from './components/StaffOperationsPanel';

const SUPPORTER_PLAYLIST_ID = 'PLgwEymErdv_CKVwcZ7xY7IZ7nnRnc1TqM';
const SUPPORTER_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${SUPPORTER_PLAYLIST_ID}`;

const PAGE_LABELS = {
  home: 'Home',
  sobre: 'Sobre',
  diretoria: 'Diretoria',
  patrocinadores: 'Patrocinadores',
  trofeus: 'Trofeus',
  atletas: 'Atletas',
  jogos: 'Jogos',
  campeonatos: 'Campeonatos',
  ranking: 'Ranking',
  noticias: 'Noticias',
  videos: 'Videos',
  fotos: 'Fotos',
  matricula: 'Matricula',
  transparencia: 'Transparencia',
  contato: 'Contato',
  campos: 'Campos',
  pesquisar: 'Pesquisar',
  operacao: 'Operacao',
  enquetes: 'Enquetes',
  acessibilidade: 'Acessibilidade',
  cookies: 'Política de Cookies',
  privacidade: 'Política de Privacidade',
  'termos-uso': 'Termos de Uso',
};

function pageFromPath(path = 'home') {
  const cleanPath = String(path).replace(/^\/+|\/+$/g, '') || 'home';
  const [page, slug] = cleanPath.split('/');
  return { page: page || 'home', slug: slug || '' };
}

function textOnly(label = '') {
  return String(label).replace(/\s+/g, ' ').trim();
}

function athleteIdFromUrl(url = '') {
  return url.split('/').pop();
}

function pageUrl(path) {
  return `#/portal/${path}`;
}

function internalizeClubUrl(url = '') {
  if (!url) return pageUrl('home');
  const parsed = new URL(url, 'https://adsuzano.com.br');
  if (parsed.hostname === 'adsuzano.com.br' || parsed.hostname === 'www.adsuzano.com.br') {
    const path = parsed.pathname.replace(/^\/+|\/+$/g, '');
    if (!path) return pageUrl('home');
    if (path === 'pre/matricula') return pageUrl('matricula');
    return pageUrl(path);
  }
  return url;
}

function externalLinkProps(href = '') {
  return href.startsWith('#') ? {} : { target: '_blank', rel: 'noreferrer' };
}

function pageKeyFromUrl(url = '') {
  const pathname = new URL(url, 'https://adsuzano.com.br').pathname.replace(/^\/+|\/+$/g, '');
  const parts = pathname.split('/');
  if (!parts[0]) return 'home';
  if (parts[0] === 'pre' && parts[1] === 'matricula') return 'matricula';
  return parts[0];
}

function groupPlayersByInitial(players = []) {
  return players.reduce((acc, player) => {
    const key = player.name?.slice(0, 1)?.toUpperCase() || '#';
    acc[key] = acc[key] ?? [];
    acc[key].push(player);
    return acc;
  }, {});
}

function flattenPlayers() {
  return athleteRoster.categories.flatMap((category) =>
    category.players.map((player) => ({
      ...player,
      category: category.label,
    })),
  );
}

export function ClubSiteExperience({ path = 'home' }) {
  return (
    <AthleteAdminProvider>
      <ClubSiteContent path={path} />
    </AthleteAdminProvider>
  );
}

function ClubSiteContent({ path = 'home' }) {
  const route = pageFromPath(path);
  const { isAdmin, profilesById } = useAthleteAdmin();
  const allPlayers = flattenPlayers().filter((player) => {
    const profile = profilesById.get(athleteIdFromUrl(player.url));
    return isAdmin || profile?.is_active !== false;
  });
  const activePlayer = route.page === 'atletas' && route.slug
    ? allPlayers.find((player) => athleteIdFromUrl(player.url) === route.slug)
    : null;

  const activeLabel = PAGE_LABELS[route.page] ?? 'Portal';
  const institutionalLinks = clubSiteData.mainLinks.map((link) => {
    return {
      ...link,
      page: pageKeyFromUrl(link.url),
    };
  });

  return (
    <main className="club-shell">
      <ClubUtilityBar />
      <ClubHeader activePage={route.page} links={institutionalLinks} />
      <section className="club-frame">
        <div className="club-breadcrumb">
          <a href="#/analise">
            <BarChart3 size={16} />
            Acessar Ambiente de Análises Táticas
          </a>
          <span>{activeLabel}</span>
        </div>
        {route.page === 'home' && <ClubHomePage />}
        {route.page === 'sobre' && <ClubAboutPage />}
        {route.page === 'diretoria' && <ClubBoardPage />}
        {route.page === 'patrocinadores' && <ClubSponsorsPage />}
        {route.page === 'trofeus' && <ClubCampaignsPage />}
        {route.page === 'enquetes' && <ClubPollsPage />}
        {route.page === 'campos' && <ClubOfficialFieldsPage />}
        {route.page === 'transparencia' && <ClubTransparencyPage />}
        {route.page === 'noticias' && <ClubNewsPage />}
        {route.page === 'videos' && !route.slug && <ClubMediaPage title="Vídeos" icon={PlayCircle} items={clubSiteData.videos.items} />}
        {route.page === 'videos' && route.slug && <ClubContentDetailPage title="Vídeo" icon={PlayCircle} item={clubSiteData.videos.items.find((item) => athleteIdFromUrl(item.url) === route.slug)} backPath="videos" />}
        {route.page === 'fotos' && !route.slug && <ClubMediaPage title="Fotos" icon={Camera} items={clubSiteData.photos.items} />}
        {route.page === 'fotos' && route.slug && <ClubContentDetailPage title="Foto" icon={Camera} item={clubSiteData.photos.items.find((item) => athleteIdFromUrl(item.url) === route.slug)} backPath="fotos" />}
        {route.page === 'contato' && <ClubContactPage />}
        {route.page === 'pesquisar' && <ClubSearchPage />}
        {route.page === 'matricula' && <ClubRegistrationPage />}
        {route.page === 'campeonatos' && !route.slug && <ClubOfficialChampionshipsPage />}
        {route.page === 'campeonatos' && route.slug && <ClubListDetailPage title="Campeonato" item={clubSiteData.championships.items.find((item) => athleteIdFromUrl(item.url) === route.slug)} backPath="campeonatos" />}
        {route.page === 'jogos' && !route.slug && <ClubOfficialGamesPage />}
        {route.page === 'jogos' && route.slug && <ClubListDetailPage title="Jogo" item={clubSiteData.games.items.find((item) => athleteIdFromUrl(item.url) === route.slug)} backPath="jogos" />}
        {route.page === 'ranking' && <ClubOfficialRankingPage />}
        {route.page === 'operacao' && <ClubOperationsPage />}
        {route.page === 'acessibilidade' && <ClubEmptyPage icon={BadgeInfo} title="Acessibilidade" text="O portal utiliza navegação por teclado, foco visível e textos alternativos nos elementos essenciais." />}
        {route.page === 'cookies' && <ClubEmptyPage icon={FileText} title="Política de Cookies" text="Este portal utiliza apenas armazenamento necessário para preferências locais e acesso ao painel técnico." />}
        {route.page === 'privacidade' && <ClubEmptyPage icon={Shield} title="Política de Privacidade" text="Os dados informados no contato são usados somente para iniciar a conversa solicitada com a AD Suzano." />}
        {route.page === 'termos-uso' && <ClubEmptyPage icon={FileText} title="Termos de Uso" text="Conteúdo institucional e esportivo da AD Suzano. As fontes oficiais permanecem indicadas em cada área." />}
        {route.page === 'atletas' && !activePlayer && <ClubAthletesPage categories={athleteRoster.categories} />}
        {route.page === 'atletas' && activePlayer && <ClubAthleteDetailPage player={activePlayer} />}
      </section>
      <ClubFooter />
    </main>
  );
}

function ClubUtilityBar() {
  return (
    <div className="club-utility">
      <div className="club-utility-inner">
        <nav>
          {clubSiteData.topLinks.map((link) => (
            <a
              key={link.label}
              href={internalizeClubUrl(link.url)}
              {...externalLinkProps(internalizeClubUrl(link.url))}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="club-utility-actions">
          <a className="club-utility-athlete-portal" href="/portal-do-atleta">
            <Users size={14} />
            <span>Portal do Atleta</span>
          </a>
          <a className="club-utility-analysis" href="#/analise">
            <span>Ambiente de Análises</span>
          </a>
          <a href={pageUrl('matricula')}>Matrícula Escolinha</a>
        </div>
      </div>
    </div>
  );
}

function ClubHeader({ activePage, links }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryPages = new Set(['home', 'atletas', 'jogos', 'campeonatos', 'ranking']);
  const primaryLinks = links.filter((link) => primaryPages.has(link.page));
  const moreLinks = links.filter((link) => !primaryPages.has(link.page));

  return (
    <header className="club-header">
      <div className="club-header-inner">
        <motion.a className="club-brand" href={pageUrl('home')} whileTap={{ scale: 0.98 }}>
          <img src={suzanoLogo} alt="AD Suzano" />
          <div>
            <strong>AD Suzano</strong>
            <span>Site Oficial • Futsal</span>
          </div>
        </motion.a>
        <button
          className="club-menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="club-main-navigation"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => {
            setMenuOpen((open) => !open);
            setMoreOpen(false);
          }}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
          <span>Menu</span>
        </button>
        <nav id="club-main-navigation" className={`club-main-nav ${menuOpen ? 'is-open' : ''}`}>
          {primaryLinks.map((link) => (
            <motion.a
              className={activePage === link.page ? 'active' : ''}
              href={pageUrl(link.page)}
              key={link.label}
              onClick={() => {
                setMenuOpen(false);
                setMoreOpen(false);
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
            >
              {link.label}
            </motion.a>
          ))}
          <div className="club-overflow-menu">
            <button
              className="club-overflow-toggle"
              type="button"
              aria-expanded={moreOpen}
              aria-controls="club-overflow-navigation"
              onClick={() => setMoreOpen((open) => !open)}
            >
              <Menu size={18} />
              <span>Mais</span>
            </button>
            <div id="club-overflow-navigation" className={`club-more-menu-panel ${moreOpen || menuOpen ? 'is-open' : ''}`}>
              {moreLinks.map((link) => (
                <a
                  className={activePage === link.page ? 'active' : ''}
                  href={pageUrl(link.page)}
                  key={link.label}
                  onClick={() => {
                    setMenuOpen(false);
                    setMoreOpen(false);
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </nav>
        <div className="club-header-actions">
          <motion.a className="club-nav-analysis-cta" href="#/analise" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <span>Ambiente de Análises</span>
          </motion.a>
          <motion.a className="club-search-link" href={pageUrl('pesquisar')} aria-label="Pesquisar no site" whileHover={{ y: -2 }} whileTap={{ scale: 0.94 }}>
            <Search size={18} />
          </motion.a>
        </div>
      </div>
    </header>
  );
}

function ClubHomePage() {
  return (
    <div className="club-page">
      <motion.section
        className="club-home-hero"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <motion.div className="club-hero-left" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <div className="club-hero-badge">
            <Shield size={16} />
            <span>Associação Desportiva Suzano • Futsal Paulista A2</span>
          </div>
          <h1>Tradição, Raça e Formação em Suzano</h1>
          <p>
            Seja bem-vindo ao site oficial da AD Suzano. Acompanhe nossas equipes no Campeonato Paulista,
            conheça nossa comissão técnica, elencos de base e escolinha oficial de futsal.
          </p>
          <div className="club-home-actions">
            <motion.a className="club-analysis-hero-btn" href="#/analise" whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
              <BarChart3 size={19} />
              <span>Ambiente de Análises Táticas</span>
            </motion.a>
            <motion.a className="club-primary-cta" href={pageUrl('atletas')} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
              <Users size={18} />
              <span>Ver Elencos</span>
            </motion.a>
            <motion.a className="club-secondary-cta" href={pageUrl('matricula')} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
              <Medal size={18} />
              <span>Escolinha de Futsal</span>
            </motion.a>
            <motion.a className="club-athlete-portal-cta" href="/portal-do-atleta" whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
              <Users size={18} />
              <span>Portal do Atleta</span>
            </motion.a>
          </div>
        </motion.div>
        <motion.div className="club-highlight-card" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <div className="club-crest-showcase">
            <img src={suzanoLogo} alt="AD Suzano Futsal Crest" />
          </div>
          <strong>AD Suzano Futsal</strong>
          <p>
            Representando o município de Suzano com excelência, ética esportiva e compromisso com o desenvolvimento de atletas desde a Iniciação até a Base.
          </p>
          <motion.a className="club-analysis-link-card" href="#/analise" whileHover={{ x: 4 }}>
            <span>Acessar Painel de Jogos e Tabelas FPFS</span>
            <ArrowRight size={16} />
          </motion.a>
        </motion.div>
      </motion.section>

      <section className="club-stats-strip">
        <div className="club-stat-box">
          <strong>8 Categorias</strong>
          <span>Iniciação e Base (Sub-7 ao Sub-18)</span>
        </div>
        <div className="club-stat-box">
          <strong>FPFS A2</strong>
          <span>Divisão Especial de Futsal Paulista</span>
        </div>
        <div className="club-stat-box">
          <strong>Suzano-SP</strong>
          <span>Ginásio Municipal & Centro de Treinamento</span>
        </div>
        <div className="club-stat-box">
          <strong>Escolinha Oficial</strong>
          <span>Formação Cidadã e Atletas do Futuro</span>
        </div>
      </section>

      <section className="club-athlete-portal-showcase" aria-labelledby="athlete-portal-title">
        <div className="club-athlete-portal-copy">
          <span className="club-section-eyebrow">PORTAL DO ATLETA · AD SUZANO</span>
          <h2 id="athlete-portal-title">Tudo o que o atleta precisa, em um só lugar.</h2>
          <p>Um espaço feito para acompanhar a rotina, reconhecer a evolução e aproximar atleta, comissão técnica e família.</p>
          <a className="club-athlete-portal-link" href="/portal-do-atleta">Entrar no Portal do Atleta <ArrowRight size={17} /></a>
        </div>
        <motion.div className="club-athlete-dashboard-mockup" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.45 }}>
          <div className="club-mockup-topbar"><span><span className="club-mockup-dot" /> Portal do Atleta</span><small>AD SUZANO · SUB-7</small></div>
          <div className="club-mockup-profile"><div className="club-mockup-avatar"><Users size={28} /></div><div><small>ATLETA EM FOCO</small><strong>Bruno Domênico</strong><span>Perfil preparado para evolução</span></div><div className="club-mockup-rating"><strong>92%</strong><small>presença</small></div></div>
          <div className="club-mockup-metrics"><div><CalendarDays size={16} /><strong>18</strong><span>treinos</span></div><div><Trophy size={16} /><strong>07</strong><span>jogos</span></div><div><BarChart3 size={16} /><strong>+12%</strong><span>evolução</span></div></div>
          <div className="club-mockup-lower"><div><small>PRÓXIMO COMPROMISSO</small><strong>Treino da categoria</strong><span>Quarta-feira · 18h30</span></div><div className="club-mockup-feedback"><CheckCircle2 size={16} /><span>Feedback do treinador disponível</span></div></div>
        </motion.div>
      </section>

      <ClubSection
        eyebrow="Quem Somos"
        title="História e Identidade da AD Suzano"
        actionHref={pageUrl('sobre')}
        actionLabel="Saiba mais sobre o clube"
      >
        <div className="club-about-summary-grid">
          <article className="club-about-text-card">
            <h3>Nossa Missão no Esporte</h3>
            <p>
              A Associação Desportiva Suzano é referência no futsal paulista, unindo alta performance competitiva no Campeonato Paulista A2
              com um trabalho sólido de formação humana e cidadã para centenas de jovens atletas.
            </p>
            <div className="club-about-bullets">
              <div>
                <Shield size={16} />
                <span>Tradição no Campeonato Paulista da FPFS</span>
              </div>
              <div>
                <Users size={16} />
                <span>Comissão técnica qualificada e multidisciplinar</span>
              </div>
              <div>
                <Medal size={16} />
                <span>Escolinha oficial para iniciação esportiva infantil</span>
              </div>
            </div>
          </article>
          <article className="club-about-info-card">
            <div className="info-item">
              <Phone size={18} />
              <div>
                <small>Contato Oficial</small>
                <strong>(11) 98207-0735</strong>
              </div>
            </div>
            <div className="info-item">
              <Shield size={18} />
              <div>
                <small>CNPJ Institucional</small>
                <strong>17.823.783/0001-06</strong>
              </div>
            </div>
            <div className="info-item">
              <MapPin size={18} />
              <div>
                <small>Município</small>
                <strong>Suzano - São Paulo</strong>
              </div>
            </div>
          </article>
        </div>
      </ClubSection>

      <ClubSection
        eyebrow="Elencos"
        title="Nossas Categorias no Paulista A2"
        actionHref={pageUrl('atletas')}
        actionLabel="Ver atletas cadastrados"
      >
        <div className="club-category-showcase-grid">
          {['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10', 'Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'].map((cat) => (
            <a className="club-category-card" key={cat} href={pageUrl('atletas')}>
              <Shield size={20} />
              <strong>{cat}</strong>
              <span>Paulista A2 FPFS</span>
            </a>
          ))}
        </div>
      </ClubSection>

      <ClubSection
        eyebrow="Vídeos"
        title="AD Suzano TV"
        actionHref={pageUrl('videos')}
        actionLabel="Mais vídeos"
      >
        <div className="club-card-grid">
          {clubSiteData.home.videos.map((item) => (
            <a className="club-media-card" href={internalizeClubUrl(item.url)} key={item.url} {...externalLinkProps(internalizeClubUrl(item.url))}>
              <PlayCircle size={18} />
              <strong>{item.title}</strong>
            </a>
          ))}
        </div>
      </ClubSection>

      <ClubSection
        eyebrow="Fotos"
        title="Galeria de Fotos"
        actionHref={pageUrl('fotos')}
        actionLabel="Mais fotos"
      >
        <div className="club-card-grid">
          {clubSiteData.home.photos.map((item) => (
            <a className="club-media-card" href={internalizeClubUrl(item.url)} key={item.url} {...externalLinkProps(internalizeClubUrl(item.url))}>
              <ImageIcon size={18} />
              <strong>{item.title}</strong>
            </a>
          ))}
        </div>
      </ClubSection>

      <ClubSection eyebrow="Patrocinadores" title="Parceiros Oficiais do Clube">
        <div className="club-sponsor-grid">
          {clubSiteData.home.sponsorImages.map((item) => (
            <article className="club-sponsor-card" key={item.name}>
              <img src={item.image} alt={item.name} />
              <strong>{item.name}</strong>
            </article>
          ))}
        </div>
      </ClubSection>
    </div>
  );
}

const portalDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

function formatPortalDate(date = '') {
  if (!date) return 'Data não informada';
  return portalDateFormatter.format(new Date(`${date}T12:00:00`));
}

function formatPortalCheckedAt(date = '') {
  if (!date) return 'Aguardando atualização';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(date));
}

function suzanoStanding(category) {
  return category?.standings?.find((standing) => /SUZANO/i.test(standing.team));
}

function positionText(standing) {
  return Number.isFinite(standing?.position) ? `${standing.position}ª posição` : 'posição indisponível';
}

function youthAchievementText(category) {
  const achievement = category?.achievement;
  if (!achievement) return 'resultado final em conferência';
  const series = textOnly(achievement.series);
  return `${achievement.label}${series ? ` ${series.toLowerCase()}` : ''}`;
}

function youthDecisionText(category) {
  const achievement = category?.achievement;
  if (!achievement) return '';
  const scope = achievement.played > 1 ? 'placar agregado da decisão' : 'placar da decisão';
  return `${scope}: ${achievement.scoreLabel}`;
}

function opponentOf(game) {
  if (!game) return '';
  return /SUZANO/i.test(game.home) ? game.away : game.home;
}

function gameResultForSuzano(game) {
  if (!Number.isFinite(game?.homeGoals) || !Number.isFinite(game?.awayGoals)) return '';
  const isHome = /SUZANO/i.test(game.home);
  const goalsFor = isHome ? game.homeGoals : game.awayGoals;
  const goalsAgainst = isHome ? game.awayGoals : game.homeGoals;
  const result = goalsFor > goalsAgainst ? 'Vitória' : goalsFor === goalsAgainst ? 'Empate' : 'Derrota';
  return `${result} · ${goalsFor} x ${goalsAgainst}`;
}

function uniqueOfficialVenues() {
  const venueMap = new Map();
  fpfsCategories.forEach((category) => {
    [...(category.playedGames ?? []), ...(category.upcomingGames ?? [])].forEach((game) => {
      const venue = textOnly(game.venue);
      if (!venue) return;
      const current = venueMap.get(venue) ?? { name: venue, matches: 0, categories: new Set() };
      current.matches += 1;
      current.categories.add(category.category);
      venueMap.set(venue, current);
    });
  });
  return [...venueMap.values()]
    .map((venue) => ({ ...venue, categories: [...venue.categories] }))
    .sort((a, b) => b.matches - a.matches || a.name.localeCompare(b.name, 'pt-BR'));
}

export function SupporterRadio() {
  const frameRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [awaitingSound, setAwaitingSound] = useState(true);
  const [stopped, setStopped] = useState(false);
  const [trackTitle, setTrackTitle] = useState('Grito da Torcida AD Suzano');

  const playerUrl = useMemo(() => {
    const params = new URLSearchParams({
      list: SUPPORTER_PLAYLIST_ID,
      autoplay: '1',
      mute: '1',
      loop: '1',
      controls: '0',
      enablejsapi: '1',
      playsinline: '1',
      rel: '0',
      origin: window.location.origin,
    });
    return `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
  }, []);

  const sendPlayerCommand = useCallback((command, args = []) => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({
      event: 'command',
      func: command,
      args,
    }), '*');
  }, []);

  useEffect(() => {
    const receivePlayerUpdate = (event) => {
      if (!String(event.origin).includes('youtube')) return;
      let payload;
      try {
        payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      const info = payload?.info;
      const title = info?.videoData?.title;
      if (title) setTrackTitle(title);
      if (info?.playerState === 1) {
        setPlaying(true);
        setStopped(false);
      } else if (info?.playerState === 2 && !awaitingSound) {
        setPlaying(false);
      }
    };

    window.addEventListener('message', receivePlayerUpdate);
    return () => window.removeEventListener('message', receivePlayerUpdate);
  }, [awaitingSound]);

  useEffect(() => {
    if (!awaitingSound) return undefined;

    const unlockSound = () => {
      sendPlayerCommand('unMute');
      sendPlayerCommand('playVideo');
      setMuted(false);
      setAwaitingSound(false);
      setPlaying(true);
      setStopped(false);
      window.removeEventListener('pointerdown', unlockSound, true);
      window.removeEventListener('keydown', unlockSound, true);
    };

    const timer = window.setTimeout(() => {
      sendPlayerCommand('mute');
      sendPlayerCommand('playVideo');
    }, 450);
    window.addEventListener('pointerdown', unlockSound, true);
    window.addEventListener('keydown', unlockSound, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', unlockSound, true);
      window.removeEventListener('keydown', unlockSound, true);
    };
  }, [awaitingSound, sendPlayerCommand]);

  const togglePlayback = () => {
    if (stopped || !playing) {
      setPlaying(true);
      setStopped(false);
      sendPlayerCommand('playVideo');
      return;
    }
    setPlaying(false);
    sendPlayerCommand('pauseVideo');
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    sendPlayerCommand(nextMuted ? 'mute' : 'unMute');
  };

  const stopPlayback = () => {
    sendPlayerCommand('stopVideo');
    setPlaying(false);
    setStopped(true);
  };

  const changeTrack = (command) => {
    sendPlayerCommand(command);
    setPlaying(true);
    setStopped(false);
    window.setTimeout(() => sendPlayerCommand('playVideo'), 120);
  };

  return (
    <motion.div
      className={`supporter-radio ${playing ? 'is-live' : ''}`}
      aria-label="Rádio Grito da Torcida AD Suzano"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="supporter-radio-station">
        <span className="supporter-radio-icon"><Radio size={16} /></span>
        <div className="supporter-radio-now">
          <span className={`supporter-radio-kicker ${awaitingSound ? 'is-awaiting' : ''}`}><i /> {awaitingSound ? 'Toque na página para liberar o som' : 'Rádio da torcida'}</span>
          <strong title={trackTitle}>{stopped ? 'Rádio parada' : awaitingSound ? 'Reprodução iniciada sem som' : trackTitle}</strong>
        </div>
      </div>
      <div className="supporter-radio-controls">
        <button type="button" onClick={() => changeTrack('previousVideo')} aria-label="Música anterior" title="Música anterior">
          <SkipBack size={15} />
        </button>
        <button type="button" className="supporter-radio-primary" onClick={togglePlayback} aria-label={playing ? 'Pausar rádio' : 'Tocar rádio'} title={playing ? 'Pausar' : 'Tocar'}>
          {playing ? <Pause size={16} /> : <PlayCircle size={16} />}
        </button>
        <button type="button" onClick={stopPlayback} aria-label="Parar rádio" title="Stop">
          <Square size={13} />
        </button>
        <button type="button" onClick={() => changeTrack('nextVideo')} aria-label="Próxima música" title="Próxima música">
          <SkipForward size={15} />
        </button>
        <button type="button" onClick={toggleMute} aria-label={muted ? 'Ativar som' : 'Silenciar rádio'} title={muted ? 'Ativar som' : 'Silenciar'}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
      <a className="supporter-radio-playlist-link" href={SUPPORTER_PLAYLIST_URL} target="_blank" rel="noreferrer" aria-label="Abrir playlist completa no YouTube" title="Abrir playlist no YouTube">
        Playlist
      </a>
      <iframe
        className="supporter-radio-player"
        ref={frameRef}
        src={playerUrl}
        title="Player do Grito da Torcida AD Suzano"
        allow="autoplay; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => {
          frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'supporter-radio' }), '*');
          sendPlayerCommand('mute');
          if (playing) sendPlayerCommand('playVideo');
        }}
      />
    </motion.div>
  );
}

function ClubAboutPage() {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Sobre" title={clubSiteData.about.name} subtitle={clubSiteData.about.tagline || 'escolinha'} />
      <div className="club-two-col">
        <article className="club-surface club-logo-card">
          <img src={suzanoLogo} alt="AD Suzano" />
        </article>
        <article className="club-surface club-info-list">
          <div>
            <Phone size={18} />
            <span>{clubSiteData.about.phone || '11982070735'}</span>
          </div>
          <div>
            <Shield size={18} />
            <span>CNPJ: {clubSiteData.about.cnpj || '17.823.783/0001-06'}</span>
          </div>
          <div>
            <Star size={18} />
            <span>Redes sociais institucionais integradas ao novo portal.</span>
          </div>
        </article>
      </div>
    </div>
  );
}

function ClubBoardPage() {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Diretoria" title="Equipe técnica e coordenação" subtitle={`${technicalStaffDirectory.length} profissionais organizados entre Iniciação e Base.`} />
      <div className="club-card-grid">
        {technicalStaffDirectory.map((member) => (
          <article className="club-person-card" key={`${member.name}-${member.role}`} title={member.fullName}>
            <Users size={18} />
            <strong>{member.name}</strong>
            <span>{member.role}</span>
            <small>{member.categories}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function ClubSponsorsPage() {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Patrocinadores" title="Parceiros e marcas" subtitle={`${clubSiteData.sponsors.items.length} parceiros cadastrados no portal institucional.`} />
      <div className="club-sponsor-grid">
        {clubSiteData.sponsors.items.map((item) => (
          <article className="club-sponsor-card" key={item.name}>
            <img src={item.image} alt={item.name} />
            <strong>{item.name}</strong>
          </article>
        ))}
      </div>
      {!!clubSiteData.sponsors.external.length && (
        <div className="club-link-list">
          {clubSiteData.sponsors.external.map((item) => (
            <a href={item.url} key={item.url} target="_blank" rel="noreferrer">{item.label}</a>
          ))}
        </div>
      )}
    </div>
  );
}

function ClubFieldsPage() {
  const fields = clubSiteData.fields.items.length
    ? clubSiteData.fields.items
    : [
        { name: 'Ginásio Municipal de Esportes Sumiyoshi Nakaharada', address: 'Rua Santa Rita de Cássia, 173 - Vila Japão, Itaquaquecetuba - SP, 08581-150' },
        { name: 'Ginásio Municipal Profº Roberto David', address: 'Rua Agnaldo Cursino 267, Sesc - Suzano/SP' },
      ];

  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Campos" title="Locais oficiais" subtitle="Endereços e pontos de operação do clube." />
      <div className="club-card-grid">
        {fields.map((item) => (
          <article className="club-surface club-place-card" key={item.name}>
            <MapPin size={18} />
            <strong>{item.name}</strong>
            <span>{item.address}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function ClubMediaPage({ title, icon: Icon, items }) {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow={title} title={title} subtitle={`${items.length} registros disponíveis na galeria institucional.`} />
      <div className="club-card-grid">
        {items.map((item) => (
          <a className="club-media-card" href={internalizeClubUrl(item.url)} key={item.url} {...externalLinkProps(internalizeClubUrl(item.url))}>
            <Icon size={18} />
            <strong>{item.title}</strong>
          </a>
        ))}
      </div>
    </div>
  );
}

function ClubContentDetailPage({ title, icon: Icon, item, backPath }) {
  if (!item) {
    return <ClubEmptyPage icon={Icon} title={`${title} não encontrado`} text="Este conteúdo não está disponível na base sincronizada." />;
  }

  const youtubeSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(`AD Suzano ${item.title}`)}`;
  return (
    <div className="club-page">
      <div className="club-breadcrumb-inline">
        <a href={pageUrl(backPath)}><ArrowLeft size={16} />Voltar para {backPath}</a>
      </div>
      <article className="club-surface club-content-detail">
        <Icon size={24} />
        <span>{title}</span>
        <h1>{item.title}</h1>
        {title === 'Vídeo' ? (
          <a className="club-primary-cta" href={youtubeSearch} target="_blank" rel="noreferrer"><PlayCircle size={18} />Procurar vídeo no YouTube</a>
        ) : (
          <p>Registro sincronizado da galeria institucional da AD Suzano.</p>
        )}
      </article>
    </div>
  );
}

function ClubListDetailPage({ title, item, backPath }) {
  if (!item) {
    return <ClubEmptyPage icon={CalendarDays} title={`${title} não encontrado`} text="Este registro não está disponível na base sincronizada." />;
  }

  return (
    <div className="club-page">
      <div className="club-breadcrumb-inline">
        <a href={pageUrl(backPath)}><ArrowLeft size={16} />Voltar para {backPath}</a>
      </div>
      <article className="club-surface club-content-detail">
        <CalendarDays size={24} />
        <span>{item.status || item.tag || title}</span>
        <h1>{item.raw || item.title || title}</h1>
        <a className="club-primary-cta" href="#/analise"><BarChart3 size={18} />Ver dados no ambiente de análises</a>
      </article>
    </div>
  );
}

function ClubContactPage() {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fields = clubSiteData.contact.fields;
    const missingField = fields.find((field) => !String(formData.get(field) ?? '').trim());
    if (missingField) {
      setFeedback(`Preencha o campo “${missingField}” para continuar.`);
      return;
    }

    const message = [
      `Olá, AD Suzano! Meu nome é ${formData.get('Nome Completo')}.`,
      `E-mail: ${formData.get('E-mail')}`,
      `WhatsApp: ${formData.get('WhatsApp')}`,
      `Mensagem: ${formData.get('Sua Mensagem')}`,
    ].join('\n');
    setFeedback('Mensagem preparada. O WhatsApp oficial será aberto em uma nova aba.');
    window.open(`https://wa.me/5511982070735?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Contato" title="Envie uma mensagem" subtitle="Preencha os dados e continue a conversa pelo WhatsApp oficial da AD Suzano." />
      <form className="club-contact-form" onSubmit={handleSubmit}>
        {clubSiteData.contact.fields.map((field) => (
          <label key={field}>
            <span>{field} *</span>
            {field === 'Sua Mensagem' ? <textarea name={field} rows={6} placeholder="Mensagem..." /> : <input name={field} placeholder={field} type={field === 'E-mail' ? 'email' : 'text'} />}
          </label>
        ))}
        {feedback && <p className="club-form-feedback" role="status">{feedback}</p>}
        <button type="submit">
          <Mail size={18} />
          {clubSiteData.contact.buttonLabel}
        </button>
      </form>
    </div>
  );
}

function ClubSearchPage() {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const allPlayers = flattenPlayers();
  const searchableItems = useMemo(() => [
    ...Object.entries(PAGE_LABELS).map(([page, label]) => ({ label, href: pageUrl(page), type: 'Página' })),
    ...allPlayers.map((player) => ({ label: `${player.name} · ${player.category}`, href: pageUrl(`atletas/${athleteIdFromUrl(player.url)}`), type: 'Atleta' })),
    ...fpfsCategories.map((category) => ({ label: `${category.category} · Paulista A2`, href: pageUrl('ranking'), type: 'Categoria' })),
    ...newsItems.map((item) => ({ label: item.title, href: item.url, type: 'Notícia' })),
    ...uniqueOfficialVenues().map((venue) => ({ label: venue.name, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, SP`)}`, type: 'Ginásio' })),
    ...clubSiteData.home.videos.map((item) => ({ label: item.title, href: internalizeClubUrl(item.url), type: 'Vídeo' })),
    ...clubSiteData.home.photos.map((item) => ({ label: item.title, href: internalizeClubUrl(item.url), type: 'Foto' })),
  ], []);
  const results = searchableItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Pesquisar" title="Busca no portal" subtitle="Encontre páginas, atletas, categorias, notícias, ginásios, vídeos e fotos cadastrados." />
      <form className="club-search-panel" onSubmit={(event) => { event.preventDefault(); setHasSearched(true); }}>
        <input aria-label="Termo de busca" placeholder={clubSiteData.search.placeholder} value={query} onChange={(event) => { setQuery(event.target.value); setHasSearched(false); }} />
        <button type="submit">
          <Search size={18} />
          Buscar
        </button>
        {hasSearched && (
          <div className="club-search-results" aria-live="polite">
            {results.length ? results.map((item) => (
              <a href={item.href} key={`${item.type}-${item.label}`} target={item.href.startsWith('#') ? undefined : '_blank'} rel={item.href.startsWith('#') ? undefined : 'noreferrer'}>
                <span>{item.type}</span>
                <strong>{item.label}</strong>
              </a>
            )) : <p>Nenhum resultado encontrado para “{query}”.</p>}
          </div>
        )}
      </form>
    </div>
  );
}

function ClubRegistrationPage() {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Matrícula" title="Pré-matrícula" subtitle="Fale diretamente com a equipe responsável pela Escolinha AD Suzano." />
      <div className="club-surface club-cta-block">
        <p>
          Solicite informações sobre turmas, horários, categorias e documentação pelo WhatsApp oficial do clube.
        </p>
        <a className="club-primary-cta" href="https://wa.me/5511982070735?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20a%20matr%C3%ADcula%20na%20Escolinha%20AD%20Suzano." target="_blank" rel="noreferrer">
          Solicitar matrícula pelo WhatsApp
        </a>
      </div>
    </div>
  );
}

function ClubChampionshipsPage() {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Campeonatos" title="Competições cadastradas" subtitle="Espelho textual do catálogo atual do site." />
      <div className="club-card-grid">
        {clubSiteData.championships.items.map((item) => (
          <a className="club-surface club-list-card" href={internalizeClubUrl(item.url)} key={item.url} {...externalLinkProps(internalizeClubUrl(item.url))}>
            <span>{item.status}</span>
            <strong>{item.raw}</strong>
          </a>
        ))}
      </div>
    </div>
  );
}

function ClubGamesPage() {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Jogos" title="Agenda esportiva" subtitle="Lista sincronizada a partir do espelho institucional atual." />
      <div className="club-card-grid">
        {clubSiteData.games.items.map((item) => (
          <a className="club-surface club-list-card" href={internalizeClubUrl(item.url)} key={item.url} {...externalLinkProps(internalizeClubUrl(item.url))}>
            <span>{item.tag}</span>
            <strong>{item.raw}</strong>
          </a>
        ))}
      </div>
    </div>
  );
}

function ClubRankingPage() {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Ranking" title="Artilheiros" subtitle="Quadro preparado para virar ranking dinâmico por API própria." />
      <div className="club-table-wrap">
        <table className="club-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Atleta</th>
              <th>Função</th>
              <th>Partidas</th>
              <th>Gols</th>
            </tr>
          </thead>
          <tbody>
            {clubSiteData.ranking.topScorers.map((item) => (
              <tr key={item.url}>
                <td>{item.position}</td>
                <td><a href={pageUrl(`atletas/${athleteIdFromUrl(item.url)}`)}>{item.athlete}</a></td>
                <td>{item.role}</td>
                <td>{item.matches ?? '-'}</td>
                <td>{item.goals ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ATHLETE_CATEGORY_ORDER = ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10', 'Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'];

function normalizeAthleteCategory(label = '') {
  return String(label).replace(/Sub-0?(\d+)/i, 'Sub-$1');
}

const ATHLETE_ATTRIBUTES = [
  { label: 'Velocidade', short: 'VEL' },
  { label: 'Chute', short: 'CHU' },
  { label: 'Condução', short: 'CON' },
  { label: 'Defesa', short: 'DEF' },
];

function seasonStatsFor(player) {
  return athleteSeasonStats.athletes[athleteIdFromUrl(player.url)] ?? {};
}

function athleteProfileFor(player, profilesById) {
  return profilesById.get(athleteIdFromUrl(player.url)) ?? null;
}

function athleteDisplayData(player, profile) {
  const detail = player.detail ?? {};
  return {
    athleteId: athleteIdFromUrl(player.url),
    fullName: profile?.full_name || detail.name || player.name,
    age: profile?.age ?? detail.age ?? null,
    height: profile?.height_cm ?? null,
    weight: profile?.weight_kg ?? null,
    coach: profile?.coach ?? null,
    photoUrl: profile?.photo_url ?? null,
    role: profile?.role ?? null,
    speed: profile?.speed ?? null,
    shot: profile?.shot ?? null,
    ballControl: profile?.ball_control ?? null,
    defense: profile?.defense ?? null,
  };
}

function combinedSeasonStats(player, profile, events = []) {
  const official = seasonStatsFor(player);
  const additions = events.reduce((totals, event) => ({
    appearances: totals.appearances + (event.games ?? 0),
    goals: totals.goals + (event.goals ?? 0),
    assists: totals.assists + (event.assists ?? 0),
    steals: totals.steals + (event.steals ?? 0),
    yellowCards: totals.yellowCards + (event.yellow_cards ?? 0),
    redCards: totals.redCards + (event.red_cards ?? 0),
    goalsConceded: totals.goalsConceded + (event.goals_conceded ?? 0),
    saves: totals.saves + (event.saves ?? 0),
  }), {
    appearances: 0, goals: 0, assists: 0, steals: 0,
    yellowCards: 0, redCards: 0, goalsConceded: 0, saves: 0,
  });

  const total = (key) => {
    const base = official[key];
    const added = additions[key];
    return base == null && added === 0 ? null : (Number(base) || 0) + added;
  };

  return {
    ...official,
    role: profile?.role ?? official.role ?? 'player',
    appearances: total('appearances'),
    goals: total('goals'),
    assists: total('assists'),
    steals: total('steals'),
    yellowCards: total('yellowCards'),
    redCards: total('redCards'),
    goalsConceded: total('goalsConceded'),
    saves: total('saves'),
    manualUpdateCount: events.length,
  };
}

function AthleteCardStats({ stats }) {
  const goalkeeper = stats.role === 'goalkeeper';
  const metrics = goalkeeper
    ? [
        { emoji: '🥅', label: 'Gols sofridos', value: stats.goalsConceded, title: 'Gols sofridos na temporada. A súmula não individualiza esse dado quando há mais de um goleiro.' },
        { emoji: '🧤', label: 'Defesas', value: stats.saves, title: 'Defesas realizadas na temporada. Este dado não consta na súmula oficial.' },
        { emoji: '🟨', label: 'Amarelos', value: stats.yellowCards, title: 'Cartões amarelos registrados nas súmulas oficiais.' },
        { emoji: '🟥', label: 'Vermelhos', value: stats.redCards, title: 'Cartões vermelhos registrados nas súmulas oficiais.' },
      ]
    : [
        { emoji: '⚽', label: 'Gols', value: stats.goals, title: 'Gols registrados nas súmulas oficiais da temporada.' },
        { emoji: '🅰️', label: 'Assistências', value: stats.assists, title: 'Assistências na temporada. Este dado não consta na súmula oficial.' },
        { emoji: '🟨', label: 'Amarelos', value: stats.yellowCards, title: 'Cartões amarelos registrados nas súmulas oficiais.' },
        { emoji: '🟥', label: 'Vermelhos', value: stats.redCards, title: 'Cartões vermelhos registrados nas súmulas oficiais.' },
      ];

  return (
    <div className="athlete-card-season-stats" aria-label="Indicadores oficiais da temporada">
      {metrics.map((metric) => (
        <div key={metric.label} title={metric.title} tabIndex="0">
          <span aria-hidden="true">{metric.emoji}</span>
          <strong>{metric.value ?? '—'}</strong>
          <small>{metric.label}</small>
        </div>
      ))}
    </div>
  );
}

function AthleteCollectibleCard({ player, category, detailed = false, onEdit, onArchive }) {
  const { isAdmin, profilesById, eventsByAthleteId } = useAthleteAdmin();
  const athleteId = athleteIdFromUrl(player.url);
  const profile = athleteProfileFor(player, profilesById);
  const display = athleteDisplayData(player, profile);
  const fullName = display.fullName;
  const normalizedCategory = normalizeAthleteCategory(category);
  const staff = technicalStaffByCategory[normalizedCategory];
  const stats = combinedSeasonStats(player, profile, eventsByAthleteId.get(athleteId) ?? []);
  const attributeValues = [display.speed, display.shot, display.ballControl, display.defense];
  const content = (
    <motion.article
      className={`athlete-collectible-card ${detailed ? 'is-detailed' : ''}`}
      whileHover={detailed ? undefined : { y: -8, rotateX: 1.5, rotateY: -1.5 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      <div className="athlete-card-shine" aria-hidden="true" />
      <header className="athlete-card-topline">
        <div>
          <span>ELENCO 2026</span>
          <strong>{normalizedCategory}</strong>
        </div>
        <img src={suzanoLogo} alt="" />
      </header>

      <div className={`athlete-photo-placeholder ${display.photoUrl ? 'has-photo' : ''}`} aria-label={`Foto de ${fullName}`}>
        {display.photoUrl ? (
          <img src={display.photoUrl} alt={fullName} />
        ) : (
          <>
            <Users size={detailed ? 68 : 50} />
            <span>Foto do atleta</span>
            <small>Aguardando envio</small>
          </>
        )}
      </div>

      <div className="athlete-card-identity">
        <small>Nome completo</small>
        <h2>{fullName}</h2>
      </div>

      <div className="athlete-card-bio">
        <div><span>Idade</span><strong>{display.age ?? 'Aguardando'}</strong></div>
        <div><span>Altura</span><strong>{display.height ? `${display.height} cm` : 'Aguardando'}</strong></div>
        <div><span>Peso</span><strong>{display.weight ? `${display.weight} kg` : 'Aguardando'}</strong></div>
      </div>

      <div className="athlete-card-coach">
        <span>Treinador</span>
        <strong title={display.coach || staff?.coachFullName}>{display.coach || staff?.coach || 'A confirmar'}</strong>
        {staff && <small>{staff.department}: {staff.coordinator}</small>}
      </div>

      <AthleteCardStats stats={stats} />

      <div className="athlete-card-attributes" aria-label="Atributos técnicos aguardando dados">
        {ATHLETE_ATTRIBUTES.map((attribute, index) => (
          <div key={attribute.short} title={attribute.label}>
            <strong>{attributeValues[index] ?? '--'}</strong>
            <span>{attribute.short}</span>
          </div>
        ))}
      </div>

      <footer>
        <span>Perfil preparado para avaliação</span>
        {!detailed && <ArrowRight size={16} />}
      </footer>
    </motion.article>
  );

  const adminControls = isAdmin ? (
    <div className="athlete-admin-card-controls" aria-label={`Administrar ${fullName}`}>
      <button type="button" onClick={() => onEdit?.(player)} title="Editar atleta">
        <Pencil size={16} /> <span>Editar</span>
      </button>
      <button className="is-danger" type="button" onClick={() => onArchive?.(player)} title="Arquivar atleta">
        <Trash2 size={16} /> <span>Arquivar</span>
      </button>
    </div>
  ) : null;

  if (detailed) return <div className="athlete-card-shell is-detailed">{adminControls}{content}</div>;
  return (
    <div className="athlete-card-shell">
      {adminControls}
      <a className="athlete-card-link" href={pageUrl(`atletas/${athleteId}`)} aria-label={`Abrir perfil de ${fullName}`}>
        {content}
      </a>
    </div>
  );
}

function StaffLoginModal({ open, onClose }) {
  const { login } = useAthleteAdmin();
  const [account, setAccount] = useState('technical');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAccount('technical');
      setPassword('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(account, password);
      onClose();
    } catch (loginError) {
      setError(loginError.message === 'Invalid login credentials'
        ? 'Senha incorreta. Confira e tente novamente.'
        : 'Não foi possível entrar agora. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="athlete-admin-modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.section className="athlete-admin-login" role="dialog" aria-modal="true" aria-labelledby="staff-login-title" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <button className="athlete-admin-modal-close" type="button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        <span className="athlete-admin-modal-icon"><LockKeyhole size={25} /></span>
        <small>ÁREA RESTRITA</small>
        <h2 id="staff-login-title">Equipe AD Suzano</h2>
        <p>Escolha seu perfil. Coordenação e Administração possuem acesso financeiro.</p>
        <form onSubmit={submit}>
          <div className="staff-account-choice" role="radiogroup" aria-label="Perfil de acesso">
            <button type="button" role="radio" aria-checked={account === 'technical'} className={account === 'technical' ? 'is-active' : ''} onClick={() => setAccount('technical')}>
              <Users size={18} /><span><strong>Comissão Técnica</strong><small>Atletas e frequência</small></span>
            </button>
            <button type="button" role="radio" aria-checked={account === 'coordinator'} className={account === 'coordinator' ? 'is-active' : ''} onClick={() => setAccount('coordinator')}>
              <Shield size={18} /><span><strong>Coordenação</strong><small>Comissão e financeiro</small></span>
            </button>
            <button type="button" role="radio" aria-checked={account === 'administrator'} className={account === 'administrator' ? 'is-active' : ''} onClick={() => setAccount('administrator')}>
              <LockKeyhole size={18} /><span><strong>Administrador</strong><small>Visão geral e relatórios</small></span>
            </button>
          </div>
          <label htmlFor="staff-password">Senha de acesso</label>
          <input id="staff-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required />
          {error ? <div className="athlete-admin-form-error" role="alert">{error}</div> : null}
          <button className="athlete-admin-primary-btn" type="submit" disabled={submitting || !password}>
            <LogIn size={17} /> {submitting ? 'Entrando...' : 'Entrar no modo de edição'}
          </button>
        </form>
      </motion.section>
    </div>
  );
}

const EMPTY_STAT_ADDITIONS = {
  games: '', goals: '', assists: '', steals: '', yellow_cards: '', red_cards: '',
  goals_conceded: '', saves: '', source: 'manual', note: '',
};

function optionalNumber(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function AthleteEditModal({ player, category, onClose }) {
  const { profilesById, saveAthlete } = useAthleteAdmin();
  const profile = player ? athleteProfileFor(player, profilesById) : null;
  const display = player ? athleteDisplayData(player, profile) : null;
  const normalizedCategory = normalizeAthleteCategory(category || 'Sub-7');
  const staff = technicalStaffByCategory[normalizedCategory];
  const [form, setForm] = useState(null);
  const [stats, setStats] = useState(EMPTY_STAT_ADDITIONS);
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player || !display) return;
    setForm({
      full_name: display.fullName,
      category: normalizedCategory,
      role: display.role || 'player',
      age: display.age ?? '',
      height_cm: display.height ?? '',
      weight_kg: display.weight ?? '',
      coach: display.coach || staff?.coach || '',
      speed: display.speed ?? '',
      shot: display.shot ?? '',
      ball_control: display.ballControl ?? '',
      defense: display.defense ?? '',
    });
    setStats(EMPTY_STAT_ADDITIONS);
    setPhoto(null);
    setError('');
  }, [display?.athleteId, player, profile?.updated_at, normalizedCategory, staff?.coach]);

  if (!player || !form) return null;

  const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateStats = (event) => setStats((current) => ({ ...current, [event.target.name]: event.target.value }));
  const statFields = form.role === 'goalkeeper'
    ? [['games', 'Jogos'], ['goals_conceded', 'Gols sofridos'], ['saves', 'Defesas'], ['yellow_cards', 'Cartões amarelos'], ['red_cards', 'Cartões vermelhos']]
    : [['games', 'Jogos'], ['goals', 'Gols'], ['assists', 'Assistências'], ['steals', 'Roubadas de bola'], ['yellow_cards', 'Cartões amarelos'], ['red_cards', 'Cartões vermelhos']];

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await saveAthlete({
        profile: {
          athlete_id: display.athleteId,
          full_name: form.full_name.trim(),
          category: form.category,
          role: form.role,
          age: optionalNumber(form.age),
          height_cm: optionalNumber(form.height_cm),
          weight_kg: optionalNumber(form.weight_kg),
          coach: form.coach.trim() || null,
          speed: optionalNumber(form.speed),
          shot: optionalNumber(form.shot),
          ball_control: optionalNumber(form.ball_control),
          defense: optionalNumber(form.defense),
          photo_path: profile?.photo_path ?? null,
          photo_url: profile?.photo_url ?? null,
        },
        stats: { ...stats, athlete_id: display.athleteId },
        photo,
      });
      onClose();
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível salvar as alterações.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="athlete-admin-modal-overlay" role="presentation">
      <motion.section className="athlete-editor-modal" role="dialog" aria-modal="true" aria-labelledby="athlete-editor-title" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
        <header>
          <div><small>COMISSÃO TÉCNICA</small><h2 id="athlete-editor-title">Editar atleta</h2><p>{display.fullName}</p></div>
          <button className="athlete-admin-modal-close" type="button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </header>
        <form onSubmit={submit}>
          <section className="athlete-editor-section">
            <div className="athlete-editor-section-title"><Pencil size={18} /><div><strong>Dados do card</strong><span>Esses campos substituem as informações visíveis do perfil.</span></div></div>
            <div className="athlete-editor-grid">
              <label className="is-wide">Nome completo<input name="full_name" value={form.full_name} onChange={updateForm} required /></label>
              <label>Categoria<select name="category" value={form.category} onChange={updateForm}>{ATHLETE_CATEGORY_ORDER.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
              <label>Posição<select name="role" value={form.role} onChange={updateForm}><option value="player">Jogador</option><option value="goalkeeper">Goleiro</option></select></label>
              <label>Idade<input name="age" type="number" min="1" max="100" value={form.age} onChange={updateForm} /></label>
              <label>Altura (cm)<input name="height_cm" type="number" min="50" max="250" step="0.1" value={form.height_cm} onChange={updateForm} /></label>
              <label>Peso (kg)<input name="weight_kg" type="number" min="5" max="200" step="0.1" value={form.weight_kg} onChange={updateForm} /></label>
              <label className="is-wide">Treinador<input name="coach" value={form.coach} onChange={updateForm} /></label>
              <label>Velocidade<input name="speed" type="number" min="0" max="99" value={form.speed} onChange={updateForm} /></label>
              <label>Chute<input name="shot" type="number" min="0" max="99" value={form.shot} onChange={updateForm} /></label>
              <label>Condução<input name="ball_control" type="number" min="0" max="99" value={form.ball_control} onChange={updateForm} /></label>
              <label>Defesa<input name="defense" type="number" min="0" max="99" value={form.defense} onChange={updateForm} /></label>
            </div>
          </section>

          <section className="athlete-editor-section">
            <div className="athlete-editor-section-title"><Upload size={18} /><div><strong>Foto do atleta</strong><span>JPG, PNG ou WebP com até 5 MB.</span></div></div>
            <label className="athlete-photo-upload"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} /><Upload size={19} /><span>{photo?.name || (profile?.photo_url ? 'Trocar foto atual' : 'Escolher foto')}</span></label>
          </section>

          <section className="athlete-editor-section is-additive">
            <div className="athlete-editor-section-title"><BarChart3 size={18} /><div><strong>Adicionar à temporada</strong><span>Os valores abaixo são somados ao histórico. Totais anteriores nunca são substituídos.</span></div></div>
            <div className="athlete-stat-add-grid">
              {statFields.map(([name, label]) => <label key={name}>{label}<input name={name} type="number" min="0" step="1" value={stats[name]} onChange={updateStats} placeholder="+0" /></label>)}
            </div>
            <div className="athlete-editor-grid">
              <label>Origem<select name="source" value={stats.source} onChange={updateStats}><option value="manual">Lançamento manual</option><option value="sumula">Súmula oficial</option><option value="avaliacao">Avaliação técnica</option></select></label>
              <label className="is-wide">Observação<input name="note" value={stats.note} onChange={updateStats} placeholder="Ex.: jogo contra adversário, rodada ou motivo do ajuste" /></label>
            </div>
          </section>

          {error ? <div className="athlete-admin-form-error" role="alert">{error}</div> : null}
          <footer className="athlete-editor-actions">
            <button type="button" onClick={onClose}>Cancelar</button>
            <button className="athlete-admin-primary-btn" type="submit" disabled={submitting}><Save size={17} />{submitting ? 'Salvando...' : 'Salvar alterações'}</button>
          </footer>
        </form>
      </motion.section>
    </div>
  );
}

function ClubAthletesPage({ categories }) {
  const { isAdmin, isCoordinator, isAdministrator, logout, archiveAthlete, profilesById, loading, error } = useAthleteAdmin();
  const [loginOpen, setLoginOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [feedback, setFeedback] = useState('');
  const visibleCategories = categories.map((category) => ({
    ...category,
    players: category.players.filter((player) => isAdmin || athleteProfileFor(player, profilesById)?.is_active !== false),
  }));
  const orderedCategories = [...visibleCategories].sort((a, b) => (
    ATHLETE_CATEGORY_ORDER.indexOf(normalizeAthleteCategory(a.label)) - ATHLETE_CATEGORY_ORDER.indexOf(normalizeAthleteCategory(b.label))
  ));
  const [activeCategory, setActiveCategory] = useState(normalizeAthleteCategory(orderedCategories[0]?.label));
  const selectedCategory = orderedCategories.find((category) => normalizeAthleteCategory(category.label) === activeCategory) ?? orderedCategories[0];
  const athleteCount = visibleCategories.reduce((total, category) => total + category.players.length, 0);
  const operationsCategories = orderedCategories.map((category) => ({
    label: normalizeAthleteCategory(category.label),
    athletes: category.players.map((player) => ({
      id: athleteIdFromUrl(player.url),
      name: athleteDisplayData(player, athleteProfileFor(player, profilesById)).fullName,
    })),
  }));

  const handleArchive = async (player) => {
    const athleteId = athleteIdFromUrl(player.url);
    const profile = athleteProfileFor(player, profilesById);
    const display = athleteDisplayData(player, profile);
    if (!window.confirm(`Arquivar o card de ${display.fullName}? Ele sairá do site público, mas o histórico será preservado.`)) return;
    try {
      await archiveAthlete({
        athlete_id: athleteId,
        full_name: display.fullName,
        category: normalizeAthleteCategory(selectedCategory?.label),
        role: display.role || 'player',
        age: display.age,
        height_cm: display.height,
        weight_kg: display.weight,
        coach: display.coach,
        photo_path: profile?.photo_path ?? null,
        photo_url: profile?.photo_url ?? null,
        speed: display.speed,
        shot: display.shot,
        ball_control: display.ballControl,
        defense: display.defense,
      });
      setFeedback(`${display.fullName} foi arquivado. O histórico continua preservado.`);
    } catch (archiveError) {
      setFeedback(archiveError.message || 'Não foi possível arquivar o atleta.');
    }
  };

  return (
    <div className="club-page athlete-gallery-page">
      <section className="athlete-gallery-hero">
        <div>
          <span>ELENCO AD SUZANO · TEMPORADA 2026</span>
          <h1>Galeria de Atletas</h1>
          <p>{athleteCount} perfis organizados por categoria. Fotos, medidas e atributos técnicos serão incorporados conforme a comissão enviar os dados.</p>
          <div className="athlete-admin-entry">
            {isAdmin ? (
              <>
                <span><LockKeyhole size={16} /> {isAdministrator ? 'Modo Administrador ativo' : isCoordinator ? 'Modo Coordenação ativo' : 'Modo Comissão Técnica ativo'}</span>
                <button type="button" onClick={logout}><LogOut size={16} /> Sair</button>
              </>
            ) : (
              <button type="button" onClick={() => setLoginOpen(true)}><LogIn size={16} /> Comissão Técnica</button>
            )}
          </div>
        </div>
        <div className="athlete-gallery-hero-mark">
          <strong>{selectedCategory?.players.length ?? 0}</strong>
          <span>atletas no {activeCategory}</span>
        </div>
      </section>

      {loading ? <div className="athlete-admin-feedback">Conectando ao banco de atletas...</div> : null}
      {error ? <div className="athlete-admin-feedback is-error">{error}</div> : null}
      {feedback ? <div className="athlete-admin-feedback" role="status">{feedback}<button type="button" onClick={() => setFeedback('')} aria-label="Fechar aviso"><X size={15} /></button></div> : null}

      {isAdmin ? <StaffOperationsPanel categories={operationsCategories} /> : null}

      <nav className="athlete-category-tabs" aria-label="Categorias de atletas" role="tablist">
        {orderedCategories.map((category) => {
          const label = normalizeAthleteCategory(category.label);
          const selected = activeCategory === label;
          return (
            <button
              type="button"
              role="tab"
              aria-selected={selected}
              className={selected ? 'is-active' : ''}
              onClick={() => setActiveCategory(label)}
              key={category.label}
            >
              <strong>{label}</strong>
              <span>{category.players.length} atletas</span>
            </button>
          );
        })}
      </nav>

      <section className="athlete-card-section" role="tabpanel" aria-label={`Atletas ${activeCategory}`}>
        <div className="athlete-card-section-head">
          <div><span>Categoria selecionada</span><h2>{activeCategory}</h2></div>
          <p>Selecione um card para abrir a ficha individual.</p>
        </div>
        <div className="athlete-collectible-grid">
          {selectedCategory?.players.map((player, index) => (
            <motion.div key={player.url} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.025, 0.3) }}>
              <AthleteCollectibleCard player={player} category={selectedCategory.label} onEdit={setEditingPlayer} onArchive={handleArchive} />
            </motion.div>
          ))}
        </div>
      </section>
      <StaffLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <AthleteEditModal player={editingPlayer} category={selectedCategory?.label} onClose={() => setEditingPlayer(null)} />
    </div>
  );
}

function ClubAthleteDetailPage({ player }) {
  const { profilesById, eventsByAthleteId, archiveAthlete } = useAthleteAdmin();
  const [editing, setEditing] = useState(false);
  const athleteId = athleteIdFromUrl(player.url);
  const profile = athleteProfileFor(player, profilesById);
  const display = athleteDisplayData(player, profile);
  const fullName = display.fullName;
  const stats = combinedSeasonStats(player, profile, eventsByAthleteId.get(athleteId) ?? []);
  const goalkeeper = stats.role === 'goalkeeper';
  const detailMetrics = goalkeeper
    ? [
        ['Jogos disputados', stats.appearances, '🎽'],
        ['Gols sofridos', stats.goalsConceded, '🥅'],
        ['Defesas realizadas', stats.saves, '🧤'],
        ['Cartões amarelos', stats.yellowCards, '🟨'],
        ['Cartões vermelhos', stats.redCards, '🟥'],
      ]
    : [
        ['Jogos disputados', stats.appearances, '🎽'],
        ['Gols', stats.goals, '⚽'],
        ['Assistências', stats.assists, '🅰️'],
        ['Roubadas de bola', stats.steals, '🛡️'],
        ['Cartões amarelos', stats.yellowCards, '🟨'],
        ['Cartões vermelhos', stats.redCards, '🟥'],
      ];
  const latestSource = stats.latestSourceUrl;
  const archiveFromDetail = async () => {
    if (!window.confirm(`Arquivar o card de ${fullName}? O histórico será preservado.`)) return;
    await archiveAthlete({
      athlete_id: athleteId,
      full_name: fullName,
      category: normalizeAthleteCategory(player.category),
      role: display.role || stats.role || 'player',
      age: display.age,
      height_cm: display.height,
      weight_kg: display.weight,
      coach: display.coach,
      photo_path: profile?.photo_path ?? null,
      photo_url: profile?.photo_url ?? null,
      speed: display.speed,
      shot: display.shot,
      ball_control: display.ballControl,
      defense: display.defense,
    });
    window.location.hash = '#/portal/atletas';
  };
  return (
    <div className="club-page athlete-profile-page">
      <div className="club-breadcrumb-inline">
        <a href={pageUrl('atletas')}><ArrowLeft size={16} />Voltar para a galeria</a>
      </div>
      <section className="athlete-profile-layout">
        <AthleteCollectibleCard player={player} category={player.category} detailed onEdit={() => setEditing(true)} onArchive={archiveFromDetail} />
        <article className="athlete-profile-notes">
          <span>FICHA INDIVIDUAL</span>
          <h1>{fullName}</h1>
          <p>{goalkeeper ? 'Indicadores oficiais do goleiro' : 'Indicadores oficiais do atleta'} na temporada 2026, consolidados a partir das súmulas do Campeonato Paulista A2.</p>
          <div className="athlete-profile-stat-grid">
            {detailMetrics.map(([label, value, emoji]) => (
              <div key={label} title={`${label} na temporada 2026`}>
                <span aria-hidden="true">{emoji}</span>
                <strong>{value ?? '—'}</strong>
                <small>{label}</small>
              </div>
            ))}
          </div>
          <div className="athlete-profile-source">
            <BadgeInfo size={19} />
            <div>
              <strong>{stats.officialName ? `Vínculo oficial confirmado · ${stats.sourceGameCount} súmula(s)` : 'Atleta ainda não vinculado à súmula'}</strong>
              <span>Jogos, gols e cartões vêm da súmula oficial. “—” indica dado não publicado pela fonte ou ainda não confirmado.</span>
              {latestSource && <a href={latestSource} target="_blank" rel="noreferrer">Abrir súmula oficial de referência <ExternalLink size={13} /></a>}
            </div>
          </div>
          <div className="athlete-profile-checklist">
            <div><CheckCircle2 size={18} /><span>{stats.appearances ?? 0} participação(ões) localizada(s) nas súmulas</span></div>
            <div><Clock3 size={18} /><span>Foto oficial aguardando envio</span></div>
            <div><CheckCircle2 size={18} /><span>Treinador e coordenação cadastrados por categoria</span></div>
            <div><Clock3 size={18} /><span>Dados físicos aguardando envio</span></div>
            <div><Clock3 size={18} /><span>Velocidade, chute, condução e defesa aguardando avaliação</span></div>
          </div>
          <div className="athlete-profile-status">
            <strong>Dados auditáveis · temporada 2026</strong>
            <span>Atualização semanal automática, toda segunda-feira às 9h. {stats.manualUpdateCount ? `${stats.manualUpdateCount} lançamento(s) manual(is) preservado(s) no histórico.` : 'Nenhum lançamento manual registrado.'}</span>
          </div>
        </article>
      </section>
      <AthleteEditModal player={editing ? player : null} category={player.category} onClose={() => setEditing(false)} />
    </div>
  );
}

function YouthAchievementsShowcase({ compact = false }) {
  const champions = youthLeagueCategories.filter((category) => category.achievement?.status === 'champion');
  const runnersUp = youthLeagueCategories.filter((category) => category.achievement?.status === 'runner-up');

  return (
    <section className={`club-achievement-showcase ${compact ? 'is-compact' : ''}`}>
      <div className="club-achievement-heading">
        <span className="club-achievement-icon"><Trophy size={27} /></span>
        <div>
          <span>DESTAQUE DA TEMPORADA</span>
          <h2>AD Suzano no pódio em todas as seis categorias</h2>
          <p>Campanha encerrada com três títulos e três vice-campeonatos na Copa da Juventude Gold 2026.</p>
        </div>
      </div>
      <div className="club-achievement-totals" aria-label="Resumo das conquistas">
        <div className="is-gold"><strong>{champions.length}</strong><span>campeões</span></div>
        <div className="is-silver"><strong>{runnersUp.length}</strong><span>vice-campeões</span></div>
        <div><strong>{youthLeagueCategories.length}</strong><span>finais disputadas</span></div>
      </div>
      <div className="club-achievement-list">
        {youthLeagueCategories.map((category) => (
          <a
            className={category.achievement?.status === 'champion' ? 'is-champion' : 'is-runner-up'}
            href={category.achievement?.sourceUrl || category.url}
            target="_blank"
            rel="noreferrer"
            key={category.category}
          >
            <Medal size={17} />
            <span>{category.category}</span>
            <strong>{youthAchievementText(category)}</strong>
            <small>{youthDecisionText(category)}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

function ClubCampaignsPage() {
  const paulistaGames = fpfsCategories.reduce((total, category) => total + (category.record?.played ?? 0), 0);
  const youthGames = youthLeagueCategories.reduce((total, category) => total + (category.record?.played ?? 0), 0);

  return (
    <div className="club-page">
      <ClubIntroCard
        eyebrow="Troféus e campanhas"
        title="Histórico competitivo disponível"
        subtitle="Campanhas verificadas nas fontes oficiais; títulos só aparecem quando houver registro confirmado."
      />
      <div className="club-data-summary-grid">
        <article className="club-data-summary-card is-live">
          <Clock3 size={22} />
          <span>Em andamento</span>
          <h2>Campeonato Paulista A2</h2>
          <strong>{fpfsCategories.length} categorias · {paulistaGames} jogos</strong>
          <p>Campanhas atualizadas pela Súmula Online da FPFS.</p>
          <a href={pageUrl('ranking')}>Ver classificação por categoria <ArrowRight size={16} /></a>
        </article>
        <article className="club-data-summary-card is-finished">
          <CheckCircle2 size={22} />
          <span>Encerrada</span>
          <h2>Copa da Juventude Gold 2026</h2>
          <strong>3 títulos · 3 vice-campeonatos</strong>
          <p>{youthLeagueCategories.length} categorias, {youthGames} jogos e presença no pódio em todas as finais.</p>
          <a href={youthLeagueCategories[0]?.url} target="_blank" rel="noreferrer">Consultar fonte oficial <ExternalLink size={16} /></a>
        </article>
      </div>
      <YouthAchievementsShowcase />
      <div className="club-campaign-grid">
        {fpfsCategories.map((category) => {
          const standing = suzanoStanding(category);
          const record = category.record ?? {};
          return (
            <article className="club-campaign-card" key={category.category}>
              <div><span>Paulista A2</span><strong>{category.category}</strong></div>
              <b>{standing?.positionLabel ?? '—'}</b>
              <p>{record.points ?? 0} pontos · {record.played ?? 0} jogos · saldo {record.goalDifference > 0 ? '+' : ''}{record.goalDifference ?? 0}</p>
              <a href={category.url} target="_blank" rel="noreferrer">Tabela oficial <ExternalLink size={14} /></a>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ClubPollsPage() {
  const [followedCategory, setFollowedCategory] = useState(() => window.localStorage.getItem('ad-suzano-follow-category') || 'Sub-7');
  const selectedData = fpfsCategories.find((category) => category.category === followedCategory) ?? fpfsCategories[0];
  const nextGame = selectedData?.upcomingGames?.[0];

  const selectCategory = (category) => {
    setFollowedCategory(category);
    window.localStorage.setItem('ad-suzano-follow-category', category);
  };

  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Enquetes" title="Qual categoria você acompanha?" subtitle="Escolha sua categoria preferida para receber um atalho personalizado neste dispositivo." />
      <section className="club-surface club-poll-panel">
        <div className="club-poll-options" role="group" aria-label="Escolher categoria acompanhada">
          {fpfsCategories.map((category) => (
            <button
              type="button"
              className={followedCategory === category.category ? 'is-selected' : ''}
              aria-pressed={followedCategory === category.category}
              onClick={() => selectCategory(category.category)}
              key={category.category}
            >
              {category.category}
            </button>
          ))}
        </div>
        <div className="club-poll-result" aria-live="polite">
          <CircleHelp size={24} />
          <div>
            <span>Sua categoria</span>
            <h2>{followedCategory}</h2>
            {nextGame ? (
              <p>Próximo jogo em {formatPortalDate(nextGame.date)}, às {nextGame.time}, contra {opponentOf(nextGame)}.</p>
            ) : (
              <p>Não há próximo jogo oficial publicado para esta categoria.</p>
            )}
          </div>
          <a className="club-primary-cta" href="#/analise">Abrir análise da categoria</a>
        </div>
        <small>A seleção fica salva somente neste aparelho e não é apresentada como pesquisa oficial do clube.</small>
      </section>
    </div>
  );
}

function ClubOfficialFieldsPage() {
  const venues = uniqueOfficialVenues();
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Campos" title="Ginásios da temporada 2026" subtitle={`${venues.length} locais encontrados nas partidas oficiais do Paulista A2.`} />
      <div className="club-venue-grid">
        {venues.map((venue) => (
          <article className="club-venue-card" key={venue.name}>
            <MapPin size={20} />
            <div>
              <strong>{venue.name}</strong>
              <span>{venue.matches} jogos na base · {venue.categories.join(', ')}</span>
            </div>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, SP`)}`} target="_blank" rel="noreferrer">
              Abrir mapa <ExternalLink size={14} />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}

function ClubTransparencyPage() {
  const fpfsCheckedAt = fpfsCategories[0]?.checkedAt;
  const youthCheckedAt = youthLeagueCategories[0]?.checkedAt;
  const fpfsGames = fpfsCategories.reduce((total, category) => total + (category.playedGames?.length ?? 0), 0);
  const youthGames = youthLeagueCategories.reduce((total, category) => total + (category.playedGames?.length ?? 0), 0);
  const rgcUrl = 'https://www.federacaopaulistadefutsal.com.br/novo/wp-content/uploads/2026/02/001_2026-RGC-REGULAMENTO-GERAL-DE-COMPETICOES-2026-2.pdf';

  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Transparência" title="Fontes, atualização e critérios" subtitle="Saiba de onde vêm os números publicados no portal e o que não é calculado sem comprovação." />
      <div className="club-transparency-grid">
        <a className="club-source-card" href={rgcUrl} target="_blank" rel="noreferrer">
          <FileText size={22} /><span>Regulamento</span><strong>RGC FPFS 2026</strong><p>Regras gerais e Art. 135 sobre o Ranking de Eficiência Anual.</p><ExternalLink size={15} />
        </a>
        <a className="club-source-card" href={fpfsCategories[0]?.url} target="_blank" rel="noreferrer">
          <BarChart3 size={22} /><span>Fonte primária</span><strong>FPFS Súmula Online</strong><p>{fpfsGames} jogos em oito categorias. Consulta: {formatPortalCheckedAt(fpfsCheckedAt)}.</p><ExternalLink size={15} />
        </a>
        <a className="club-source-card" href={youthLeagueCategories[0]?.url} target="_blank" rel="noreferrer">
          <Medal size={22} /><span>Fonte primária</span><strong>Liga da Juventude</strong><p>{youthGames} jogos preservados. Consulta: {formatPortalCheckedAt(youthCheckedAt)}.</p><ExternalLink size={15} />
        </a>
      </div>
      <section className="club-surface club-method-card">
        <h2>Compromissos editoriais</h2>
        <div className="club-method-list">
          <p><CheckCircle2 size={18} /><span>Jogos sem placar confirmado não entram como resultado.</span></p>
          <p><CheckCircle2 size={18} /><span>Partidas passadas sem súmula não aparecem na agenda futura.</span></p>
          <p><CheckCircle2 size={18} /><span>Posição de uma categoria não é apresentada como Ranking Anual do clube.</span></p>
          <p><CheckCircle2 size={18} /><span>O portal não publica percentual de título, acesso ou vitória sem modelo e fonte suficientes.</span></p>
        </div>
      </section>
    </div>
  );
}

function ClubNewsPage() {
  const matchReports = fpfsCategories.map((category) => {
    const game = [...(category.playedGames ?? [])].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    return game && {
      id: `match-${category.category}-${game.date}`,
      title: `${category.category}: ${gameResultForSuzano(game)} contra ${opponentOf(game)}`,
      category: category.category,
      date: game.date,
      source: 'FPFS Súmula Online',
      url: game.summaryUrl || category.gamesUrl,
      summary: `Partida realizada em ${formatPortalDate(game.date)}, no ${game.venue}.`,
      impact: `${category.record.points} pontos em ${category.record.played} jogos, ${category.record.goalsFor} gols marcados e saldo ${category.record.goalDifference > 0 ? '+' : ''}${category.record.goalDifference}.`,
    };
  }).filter(Boolean);
  const externalNews = newsItems.filter((item) => item.source !== 'FPFS Súmula Online');
  const stories = [...matchReports, ...externalNews].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Notícias" title="Boletim AD Suzano" subtitle={`${stories.length} atualizações formadas por resultados oficiais e notícias com fonte identificada.`} />
      <div className="club-news-grid">
        {stories.map((story, index) => (
          <article className={`club-news-card ${index === 0 ? 'is-featured' : ''}`} key={story.id ?? story.url}>
            <div className="club-news-meta"><span>{story.category}</span><time>{formatPortalDate(story.date)}</time></div>
            <h2>{story.title}</h2>
            <p>{story.summary}</p>
            {story.impact && <strong>{story.impact}</strong>}
            <a href={story.url} target="_blank" rel="noreferrer">Abrir fonte · {story.source} <ExternalLink size={14} /></a>
          </article>
        ))}
      </div>
    </div>
  );
}

function ClubOfficialChampionshipsPage() {
  const youthChampions = youthLeagueCategories.filter((category) => category.achievement?.status === 'champion');
  const youthRunnersUp = youthLeagueCategories.filter((category) => category.achievement?.status === 'runner-up');

  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Campeonatos" title="Competições oficiais de 2026" subtitle="Paulista A2 em andamento e Copa da Juventude encerrada, com campanhas separadas por categoria." />
      <div className="club-data-summary-grid">
        <article className="club-data-summary-card is-live">
          <Clock3 size={22} /><span>Em andamento</span><h2>Campeonato Paulista A2</h2>
          <strong>{fpfsCategories.length} categorias</strong><p>Sub-7 ao Sub-18, com tabela e agenda atualizadas.</p>
          <a href={fpfsCategories[0]?.url} target="_blank" rel="noreferrer">Fonte FPFS <ExternalLink size={15} /></a>
        </article>
        <article className="club-data-summary-card is-finished">
          <CheckCircle2 size={22} /><span>Encerrada</span><h2>Copa da Juventude Gold</h2>
          <strong>{youthChampions.length} títulos · {youthRunnersUp.length} vice-campeonatos</strong><p>Sub-7 ao Sub-14: seis finais e seis presenças no pódio.</p>
          <a href={youthLeagueCategories[0]?.url} target="_blank" rel="noreferrer">Fonte Liga da Juventude <ExternalLink size={15} /></a>
        </article>
      </div>
      <YouthAchievementsShowcase compact />
      <div className="club-competition-category-grid">
        {fpfsCategories.map((category) => {
          const youth = youthLeagueCategories.find((item) => item.category === category.category);
          const paulistaStanding = suzanoStanding(category);
          const achievement = youth?.achievement;
          return (
            <article className={`club-competition-category ${achievement ? `is-${achievement.status}` : ''}`} key={category.category}>
              <header>
                <strong>{category.category}</strong>
                {achievement && <span className="club-category-medal"><Medal size={15} /> {youthAchievementText(youth)}</span>}
              </header>
              <div>
                <span>Paulista A2</span>
                <b>{category.record.points} pontos <i>|</i> {positionText(paulistaStanding)}</b>
                <small>{category.record.played} jogos na classificação atual</small>
              </div>
              <div>
                <span>Copa da Juventude</span>
                {youth ? (
                  <>
                    <b>{youth.record.points} pontos <i>|</i> {youthAchievementText(youth)}</b>
                    <small>{youthDecisionText(youth)}</small>
                    <a href={achievement?.sourceUrl || youth.url} target="_blank" rel="noreferrer">Ver fase final oficial <ExternalLink size={13} /></a>
                  </>
                ) : <b>Não disputada</b>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ClubOfficialGamesPage() {
  const upcoming = fpfsCategories.flatMap((category) => (category.upcomingGames ?? []).map((game) => ({ ...game, category: category.category, sourceUrl: category.gamesUrl })))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const recent = fpfsCategories.flatMap((category) => [...(category.playedGames ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2)
    .map((game) => ({ ...game, category: category.category, sourceUrl: category.gamesUrl })))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Jogos" title="Central de partidas" subtitle={`${upcoming.length} jogos futuros confirmados e os dois resultados mais recentes de cada categoria.`} />
      <ClubSection eyebrow="Agenda oficial" title="Próximos jogos">
        <div className="club-games-grid">
          {upcoming.map((game) => (
            <article className="club-game-card" key={`${game.category}-${game.date}-${game.time}`}>
              <div className="club-game-date"><strong>{formatPortalDate(game.date)}</strong><span>{game.time}</span></div>
              <div><span>{game.category} · Paulista A2</span><h3>{game.home} <b>x</b> {game.away}</h3><p><MapPin size={14} /> {game.venue}</p></div>
              <a href={game.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Abrir agenda oficial ${game.category}`}><ExternalLink size={17} /></a>
            </article>
          ))}
        </div>
      </ClubSection>
      <ClubSection eyebrow="Súmulas oficiais" title="Resultados recentes">
        <div className="club-results-list">
          {recent.map((game) => (
            <a href={game.summaryUrl || game.sourceUrl} target="_blank" rel="noreferrer" key={`${game.category}-${game.date}-${game.home}-${game.away}`}>
              <span>{game.category}</span><time>{formatPortalDate(game.date)}</time><strong>{game.home} {game.homeGoals} x {game.awayGoals} {game.away}</strong><em>{gameResultForSuzano(game)}</em>
            </a>
          ))}
        </div>
      </ClubSection>
    </div>
  );
}

function ClubOfficialRankingPage() {
  const ranking = fpfsCategories.map((category) => ({ category, standing: suzanoStanding(category) }))
    .sort((a, b) => (a.standing?.position ?? 999) - (b.standing?.position ?? 999));
  const youthRanking = youthLeagueCategories.map((category) => ({ category, standing: suzanoStanding(category) }));

  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Ranking" title="Desempenho por categoria" subtitle="Posições oficiais da fase atual do Paulista A2; este quadro não representa o Ranking de Eficiência Anual do clube." />
      <div className="club-ranking-kpis">
        <div><span>Melhor posição atual</span><strong>{ranking[0]?.category.category} · {ranking[0]?.standing?.positionLabel ?? '—'}</strong></div>
        <div><span>Categorias monitoradas</span><strong>{ranking.length}</strong></div>
        <div><span>Última atualização</span><strong>{formatPortalCheckedAt(fpfsCategories[0]?.checkedAt)}</strong></div>
      </div>
      <div className="club-table-wrap">
        <table className="club-table club-ranking-table">
          <thead><tr><th>Categoria</th><th>Posição</th><th>Pts</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>Saldo</th><th>Aproveit.</th><th>Fonte</th></tr></thead>
          <tbody>
            {ranking.map(({ category, standing }) => {
              const record = category.record;
              const efficiency = record.played ? Math.round((record.points / (record.played * 3)) * 100) : 0;
              return (
                <tr key={category.category}>
                  <td><strong>{category.category}</strong></td><td>{standing?.positionLabel ?? '—'}</td><td>{record.points}</td><td>{record.played}</td><td>{record.wins}</td><td>{record.draws}</td><td>{record.losses}</td><td>{record.goalsFor}</td><td>{record.goalsAgainst}</td><td className={record.goalDifference >= 0 ? 'is-positive' : 'is-negative'}>{record.goalDifference > 0 ? '+' : ''}{record.goalDifference}</td><td>{efficiency}%</td><td><a href={category.url} target="_blank" rel="noreferrer">FPFS</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ClubSection eyebrow="Competição encerrada" title="Copa da Juventude Gold 2026">
        <div className="club-campaign-grid">
          {youthRanking.map(({ category, standing }) => (
            <article className={`club-campaign-card is-${category.achievement?.status}`} key={category.category}>
              <div><span>Copa da Juventude</span><strong>{category.category}</strong></div><b>{youthAchievementText(category)}</b>
              <p>{category.record.points} pontos · {category.record.played} jogos · {positionText(standing)} na primeira fase</p>
              <a href={category.achievement?.sourceUrl || category.url} target="_blank" rel="noreferrer">Fase final oficial <ExternalLink size={14} /></a>
            </article>
          ))}
        </div>
      </ClubSection>
      <div className="club-editorial-note"><FileText size={20} /><div><strong>Importante</strong><p>As posições acima são de cada campeonato e categoria. O acesso entre divisões depende do Ranking de Eficiência Anual regulamentar, que não deve ser confundido com esta tabela.</p></div></div>
    </div>
  );
}

function ClubOperationsPage() {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Operação" title="Plano de alimentação" subtitle="O caminho para virar fornecedor digital do clube já está organizado." />
      <div className="club-card-grid">
        {clubSiteData.contentPlan.map((item) => (
          <article className="club-surface club-plan-card" key={item.area}>
            <span>{item.mode}</span>
            <strong>{item.area}</strong>
            <p>{item.details}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ClubEmptyPage({ icon: Icon, title, text }) {
  return (
    <div className="club-page">
      <div className="club-empty-state">
        <Icon size={22} />
        <h1>{title}</h1>
        <p>{text || 'Sem conteúdo publicado nesta página por enquanto.'}</p>
      </div>
    </div>
  );
}

function ClubSection({ eyebrow, title, actionHref, actionLabel, children }) {
  return (
    <section className="club-section">
      <div className="club-section-head">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {actionHref && <a href={actionHref}>{actionLabel}</a>}
      </div>
      {children}
    </section>
  );
}

function ClubIntroCard({ eyebrow, title, subtitle }) {
  return (
    <section className="club-surface club-intro-card">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </section>
  );
}

function ClubFooter() {
  return (
    <footer className="club-footer">
      <div className="club-footer-brand">
        <img src={suzanoLogo} alt="AD Suzano" />
        <div>
          <strong>AD Suzano 2026</strong>
          <span>Criado por Bruno STEAM</span>
        </div>
      </div>
      <div className="club-footer-links">
        {clubSiteData.footerLinks.map((link) => (
          <a href={internalizeClubUrl(link.url)} key={link.label} {...externalLinkProps(internalizeClubUrl(link.url))}>{link.label}</a>
        ))}
      </div>
      <div className="club-footer-social">
        {clubSiteData.socialLinks.map((link) => (
          <a href={link.url} key={link.url} target="_blank" rel="noreferrer">{link.label.includes('http') ? new URL(link.url).hostname : link.label}</a>
        ))}
      </div>
    </footer>
  );
}

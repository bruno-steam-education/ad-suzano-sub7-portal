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
  return clubSiteData.athletes.categories.flatMap((category) =>
    category.players.map((player) => ({
      ...player,
      category: category.label,
    })),
  );
}

export function ClubSiteExperience({ path = 'home' }) {
  const route = pageFromPath(path);
  const allPlayers = flattenPlayers();
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
        {route.page === 'atletas' && !activePlayer && <ClubAthletesPage categories={clubSiteData.athletes.categories} />}
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

function AthleteCollectibleCard({ player, category, detailed = false }) {
  const detail = player.detail ?? {};
  const fullName = detail.name || player.name;
  const normalizedCategory = normalizeAthleteCategory(category);
  const staff = technicalStaffByCategory[normalizedCategory];
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

      <div className="athlete-photo-placeholder" aria-label={`Espaço reservado para a foto de ${fullName}`}>
        <Users size={detailed ? 68 : 50} />
        <span>Foto do atleta</span>
        <small>Aguardando envio</small>
      </div>

      <div className="athlete-card-identity">
        <small>Nome completo</small>
        <h2>{fullName}</h2>
      </div>

      <div className="athlete-card-bio">
        <div><span>Idade</span><strong>{detail.age || 'Aguardando'}</strong></div>
        <div><span>Altura</span><strong>Aguardando</strong></div>
        <div><span>Peso</span><strong>Aguardando</strong></div>
      </div>

      <div className="athlete-card-coach">
        <span>Treinador</span>
        <strong title={staff?.coachFullName}>{staff?.coach ?? 'A confirmar'}</strong>
        {staff && <small>{staff.department}: {staff.coordinator}</small>}
      </div>

      <div className="athlete-card-attributes" aria-label="Atributos técnicos aguardando dados">
        {ATHLETE_ATTRIBUTES.map((attribute) => (
          <div key={attribute.short} title={attribute.label}>
            <strong>--</strong>
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

  if (detailed) return content;
  return (
    <a className="athlete-card-link" href={pageUrl(`atletas/${athleteIdFromUrl(player.url)}`)} aria-label={`Abrir perfil de ${fullName}`}>
      {content}
    </a>
  );
}

function ClubAthletesPage({ categories }) {
  const orderedCategories = [...categories].sort((a, b) => (
    ATHLETE_CATEGORY_ORDER.indexOf(normalizeAthleteCategory(a.label)) - ATHLETE_CATEGORY_ORDER.indexOf(normalizeAthleteCategory(b.label))
  ));
  const [activeCategory, setActiveCategory] = useState(normalizeAthleteCategory(orderedCategories[0]?.label));
  const selectedCategory = orderedCategories.find((category) => normalizeAthleteCategory(category.label) === activeCategory) ?? orderedCategories[0];
  const athleteCount = categories.reduce((total, category) => total + category.players.length, 0);

  return (
    <div className="club-page athlete-gallery-page">
      <section className="athlete-gallery-hero">
        <div>
          <span>ELENCO AD SUZANO · TEMPORADA 2026</span>
          <h1>Galeria de Atletas</h1>
          <p>{athleteCount} perfis organizados por categoria. Fotos, medidas e atributos técnicos serão incorporados conforme a comissão enviar os dados.</p>
        </div>
        <div className="athlete-gallery-hero-mark">
          <strong>{selectedCategory?.players.length ?? 0}</strong>
          <span>atletas no {activeCategory}</span>
        </div>
      </section>

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
              <AthleteCollectibleCard player={player} category={selectedCategory.label} />
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ClubAthleteDetailPage({ player }) {
  const fullName = player.detail?.name || player.name;
  return (
    <div className="club-page athlete-profile-page">
      <div className="club-breadcrumb-inline">
        <a href={pageUrl('atletas')}><ArrowLeft size={16} />Voltar para a galeria</a>
      </div>
      <section className="athlete-profile-layout">
        <AthleteCollectibleCard player={player} category={player.category} detailed />
        <article className="athlete-profile-notes">
          <span>FICHA INDIVIDUAL</span>
          <h1>{fullName}</h1>
          <p>O perfil já está estruturado para receber a fotografia oficial, idade, altura, peso, treinador e avaliações técnicas.</p>
          <div className="athlete-profile-checklist">
            <div><CheckCircle2 size={18} /><span>Nome completo e categoria cadastrados</span></div>
            <div><Clock3 size={18} /><span>Foto oficial aguardando envio</span></div>
            <div><CheckCircle2 size={18} /><span>Treinador e coordenação cadastrados por categoria</span></div>
            <div><Clock3 size={18} /><span>Dados físicos aguardando envio</span></div>
            <div><Clock3 size={18} /><span>Velocidade, chute, condução e defesa aguardando avaliação</span></div>
          </div>
          <div className="athlete-profile-status">
            <strong>Perfil em preparação</strong>
            <span>Nenhum valor técnico será publicado antes da confirmação da comissão.</span>
          </div>
        </article>
      </section>
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
          <span>Criado por {clubSiteData.creator.label}</span>
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

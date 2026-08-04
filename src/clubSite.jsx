import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  ArrowLeft,
  ArrowRight,
  BadgeInfo,
  CalendarDays,
  Camera,
  CircleHelp,
  FileText,
  Image as ImageIcon,
  Mail,
  MapPin,
  Medal,
  Phone,
  PlayCircle,
  Search,
  Shield,
  Star,
  Trophy,
  Users,
  Menu,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import suzanoLogo from './assets/ad-suzano-logo.png';
import { clubSiteData } from './data/clubSite';

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
        {route.page === 'trofeus' && <ClubEmptyPage icon={Trophy} title="Trófeus" text={clubSiteData.trophies.emptyText} />}
        {route.page === 'enquetes' && <ClubEmptyPage icon={CircleHelp} title="Enquetes" text="Nenhuma enquete ativa no momento." />}
        {route.page === 'campos' && <ClubFieldsPage />}
        {route.page === 'transparencia' && <ClubEmptyPage icon={FileText} title="Transparência" text={clubSiteData.transparency.emptyText} />}
        {route.page === 'noticias' && <ClubEmptyPage icon={BadgeInfo} title="Notícias" text={clubSiteData.news.emptyText} />}
        {route.page === 'videos' && !route.slug && <ClubMediaPage title="Vídeos" icon={PlayCircle} items={clubSiteData.videos.items} />}
        {route.page === 'videos' && route.slug && <ClubContentDetailPage title="Vídeo" icon={PlayCircle} item={clubSiteData.videos.items.find((item) => athleteIdFromUrl(item.url) === route.slug)} backPath="videos" />}
        {route.page === 'fotos' && !route.slug && <ClubMediaPage title="Fotos" icon={Camera} items={clubSiteData.photos.items} />}
        {route.page === 'fotos' && route.slug && <ClubContentDetailPage title="Foto" icon={Camera} item={clubSiteData.photos.items.find((item) => athleteIdFromUrl(item.url) === route.slug)} backPath="fotos" />}
        {route.page === 'contato' && <ClubContactPage />}
        {route.page === 'pesquisar' && <ClubSearchPage />}
        {route.page === 'matricula' && <ClubRegistrationPage />}
        {route.page === 'campeonatos' && !route.slug && <ClubChampionshipsPage />}
        {route.page === 'campeonatos' && route.slug && <ClubListDetailPage title="Campeonato" item={clubSiteData.championships.items.find((item) => athleteIdFromUrl(item.url) === route.slug)} backPath="campeonatos" />}
        {route.page === 'jogos' && !route.slug && <ClubGamesPage />}
        {route.page === 'jogos' && route.slug && <ClubListDetailPage title="Jogo" item={clubSiteData.games.items.find((item) => athleteIdFromUrl(item.url) === route.slug)} backPath="jogos" />}
        {route.page === 'ranking' && <ClubRankingPage />}
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
      <ClubIntroCard eyebrow="Diretoria" title="Equipe técnica e coordenação" subtitle="Estrutura espelhada do site institucional atual." />
      <div className="club-card-grid">
        {clubSiteData.board.members.map((member) => (
          <article className="club-person-card" key={`${member.name}-${member.role}`}>
            <Users size={18} />
            <strong>{member.name}</strong>
            <span>{member.role}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function ClubSponsorsPage() {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Patrocinadores" title="Parceiros e marcas" subtitle="Base pronta para gestão editorial e comercial." />
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
      <ClubIntroCard eyebrow={title} title={title} subtitle="Conteúdo espelhado do site institucional atual." />
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
      <ClubIntroCard eyebrow="Contato" title="Envie uma mensagem" subtitle="Estrutura visual pronta para integração com formulário real." />
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
  const searchableItems = useMemo(() => [
    ...Object.entries(PAGE_LABELS).map(([page, label]) => ({ label, href: pageUrl(page), type: 'Página' })),
    ...clubSiteData.home.videos.map((item) => ({ label: item.title, href: internalizeClubUrl(item.url), type: 'Vídeo' })),
    ...clubSiteData.home.photos.map((item) => ({ label: item.title, href: internalizeClubUrl(item.url), type: 'Foto' })),
  ], []);
  const results = searchableItems.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Pesquisar" title="Busca institucional" subtitle="Página espelhada com campo pronto para futura indexação." />
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

function ClubAthletesPage({ categories }) {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Atletas" title="Elenco por categoria" subtitle="Categorias, páginas individuais e base pronta para gestão própria." />
      {categories.map((category) => {
        const groups = groupPlayersByInitial(category.players);
        return (
          <section className="club-athlete-category" key={category.label}>
            <div className="club-athlete-category-head">
              <h2>{category.label}</h2>
              <span>{category.players.length} atletas</span>
            </div>
            <div className="club-athlete-alpha">
              {Object.entries(groups).map(([letter, players]) => (
                <article className="club-surface club-alpha-group" key={letter}>
                  <strong>{letter}</strong>
                  <div className="club-chip-wrap">
                    {players.map((player) => (
                      <a href={pageUrl(`atletas/${athleteIdFromUrl(player.url)}`)} key={player.url}>
                        {player.name}
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ClubAthleteDetailPage({ player }) {
  const detail = player.detail;

  return (
    <div className="club-page">
      <div className="club-breadcrumb-inline">
        <a href={pageUrl('atletas')}>
          <ArrowLeft size={16} />
          Voltar para atletas
        </a>
      </div>
      <section className="club-athlete-detail">
        <article className="club-surface club-athlete-hero">
          <div>
            <span>{player.category}</span>
            <h1>{player.name}</h1>
            <p>{detail?.age ? `Idade: ${detail.age}` : 'Perfil individual espelhado do site institucional.'}</p>
          </div>
          {detail?.image ? <img src={detail.image} alt={player.name} /> : <img src={suzanoLogo} alt="AD Suzano" />}
        </article>
        <article className="club-surface">
          <h2>Estatísticas</h2>
          {detail?.stats?.length ? (
            <div className="club-stat-grid">
              {detail.stats.map((stat) => (
                <div key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="club-empty-text">Nenhuma estatística disponível no espelho atual.</p>
          )}
        </article>
      </section>
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

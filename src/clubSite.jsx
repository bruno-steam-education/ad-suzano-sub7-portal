import React from 'react';
import {
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
} from 'lucide-react';
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
            <ArrowLeft size={16} />
            Voltar para a análise
          </a>
          <span>{activeLabel}</span>
        </div>
        {route.page === 'home' && <ClubHomePage />}
        {route.page === 'sobre' && <ClubAboutPage />}
        {route.page === 'diretoria' && <ClubBoardPage />}
        {route.page === 'patrocinadores' && <ClubSponsorsPage />}
        {route.page === 'trofeus' && <ClubEmptyPage icon={Trophy} title="Trófeus" text={clubSiteData.trophies.emptyText} />}
        {route.page === 'campos' && <ClubFieldsPage />}
        {route.page === 'transparencia' && <ClubEmptyPage icon={FileText} title="Transparência" text={clubSiteData.transparency.emptyText} />}
        {route.page === 'noticias' && <ClubEmptyPage icon={BadgeInfo} title="Notícias" text={clubSiteData.news.emptyText} />}
        {route.page === 'videos' && <ClubMediaPage title="Vídeos" icon={PlayCircle} items={clubSiteData.videos.items} />}
        {route.page === 'fotos' && <ClubMediaPage title="Fotos" icon={Camera} items={clubSiteData.photos.items} />}
        {route.page === 'contato' && <ClubContactPage />}
        {route.page === 'pesquisar' && <ClubSearchPage />}
        {route.page === 'matricula' && <ClubRegistrationPage />}
        {route.page === 'campeonatos' && <ClubChampionshipsPage />}
        {route.page === 'jogos' && <ClubGamesPage />}
        {route.page === 'ranking' && <ClubRankingPage />}
        {route.page === 'operacao' && <ClubOperationsPage />}
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
              href={PAGE_LABELS[pageKeyFromUrl(link.url)] ? pageUrl(pageKeyFromUrl(link.url)) : link.url}
              rel={PAGE_LABELS[pageKeyFromUrl(link.url)] ? undefined : 'noreferrer'}
              target={PAGE_LABELS[pageKeyFromUrl(link.url)] ? undefined : '_blank'}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="club-utility-actions">
          <a href={pageUrl('operacao')}>Operação digital</a>
          <a href={clubSiteData.registration.url} target="_blank" rel="noreferrer">Login</a>
        </div>
      </div>
    </div>
  );
}

function ClubHeader({ activePage, links }) {
  return (
    <header className="club-header">
      <div className="club-header-inner">
        <a className="club-brand" href={pageUrl('home')}>
          <img src={suzanoLogo} alt="AD Suzano" />
          <div>
            <strong>AD Suzano</strong>
            <span>Portal institucional</span>
          </div>
        </a>
        <nav className="club-main-nav">
          {links.map((link) => (
            <a
              className={activePage === link.page ? 'active' : ''}
              href={link.page === 'matricula' ? link.url : pageUrl(link.page)}
              key={link.label}
              rel={link.page === 'matricula' ? 'noreferrer' : undefined}
              target={link.page === 'matricula' ? '_blank' : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a className="club-search-link" href={pageUrl('pesquisar')}>
          <Search size={18} />
          Pesquisar
        </a>
      </div>
    </header>
  );
}

function ClubHomePage() {
  return (
    <div className="club-page">
      <section className="club-home-hero">
        <div>
          <span>Espelho institucional</span>
          <h1>AD Suzano TV</h1>
          <p>{clubSiteData.home.intro}</p>
          <div className="club-home-actions">
            <a className="club-primary-cta" href={pageUrl('videos')}>Ver vídeos</a>
            <a className="club-secondary-cta" href={pageUrl('fotos')}>Explorar fotos</a>
          </div>
        </div>
        <div className="club-highlight-card">
          <strong>Nova camada digital</strong>
          <p>
            A análise esportiva continua como porta de entrada. O site institucional
            passa a viver ao lado dela, com sincronização preparada e operação separada.
          </p>
          <a href={pageUrl('operacao')}>
            Ver plano de alimentação
            <ArrowRight size={16} />
          </a>
        </div>
      </section>

      <ClubSection
        eyebrow="Vídeos"
        title="AD Suzano TV"
        actionHref={pageUrl('videos')}
        actionLabel="Mais vídeos"
      >
        <div className="club-card-grid">
          {clubSiteData.home.videos.map((item) => (
            <a className="club-media-card" href={item.url} key={item.url} target="_blank" rel="noreferrer">
              <PlayCircle size={18} />
              <strong>{item.title}</strong>
            </a>
          ))}
        </div>
      </ClubSection>

      <ClubSection
        eyebrow="Fotos"
        title="Galeria"
        actionHref={pageUrl('fotos')}
        actionLabel="Mais fotos"
      >
        <div className="club-card-grid">
          {clubSiteData.home.photos.map((item) => (
            <a className="club-media-card" href={item.url} key={item.url} target="_blank" rel="noreferrer">
              <ImageIcon size={18} />
              <strong>{item.title}</strong>
            </a>
          ))}
        </div>
      </ClubSection>

      <ClubSection eyebrow="Patrocinadores" title="Parceiros ativos">
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
          <a className="club-media-card" href={item.url} key={item.url} target="_blank" rel="noreferrer">
            <Icon size={18} />
            <strong>{item.title}</strong>
          </a>
        ))}
      </div>
    </div>
  );
}

function ClubContactPage() {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Contato" title="Envie uma mensagem" subtitle="Estrutura visual pronta para integração com formulário real." />
      <form className="club-contact-form" onSubmit={(event) => event.preventDefault()}>
        {clubSiteData.contact.fields.map((field) => (
          <label key={field}>
            <span>{field} *</span>
            {field === 'Sua Mensagem' ? <textarea rows={6} placeholder="Mensagem..." /> : <input placeholder={field} />}
          </label>
        ))}
        <button type="submit">
          <Mail size={18} />
          {clubSiteData.contact.buttonLabel}
        </button>
      </form>
    </div>
  );
}

function ClubSearchPage() {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Pesquisar" title="Busca institucional" subtitle="Página espelhada com campo pronto para futura indexação." />
      <div className="club-search-panel">
        <input placeholder={clubSiteData.search.placeholder} />
        <button type="button">
          <Search size={18} />
          Buscar
        </button>
      </div>
    </div>
  );
}

function ClubRegistrationPage() {
  return (
    <div className="club-page">
      <ClubIntroCard eyebrow="Matrícula" title="Pré-matrícula" subtitle="Fluxo externo mantido como no site atual." />
      <div className="club-surface club-cta-block">
        <p>
          O site institucional atual envia a matrícula para um fluxo externo.
          Mantivemos esse comportamento e deixamos o ponto pronto para futura internalização.
        </p>
        <a className="club-primary-cta" href={clubSiteData.registration.url} target="_blank" rel="noreferrer">
          Abrir matrícula
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
          <a className="club-surface club-list-card" href={item.url} key={item.url} target="_blank" rel="noreferrer">
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
          <a className="club-surface club-list-card" href={item.url} key={item.url} target="_blank" rel="noreferrer">
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
          <a href={link.url} key={link.label} target="_blank" rel="noreferrer">{link.label}</a>
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

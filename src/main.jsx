import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  BarChart3,
  Brain,
  CalendarDays,
  ChevronRight,
  Clock,
  Download,
  Goal,
  MapPin,
  Navigation,
  Shield,
  Sparkles,
  SunMedium,
  Thermometer,
  Trophy,
} from 'lucide-react';
import { motion } from 'motion/react';
import suzanoLogo from './assets/ad-suzano-logo.png';
import { categories } from './data/categories';
import { fpfsCategories } from './data/fpfsCategories';
import { newsItems, newsWeek } from './data/news';
import { weeklySchedule, weeklyScheduleWeek } from './data/schedule';
import { sourceLinks, teamName, venueAddresses, weeklyNotes } from './data/season';
import { isMobileDevice, isStandaloneApp, registerServiceWorker } from './services/pwa';
import { fetchSuzanoWeather } from './services/weather';
import {
  championshipProjection,
  mondayAnalysisDate,
  nextMatches,
  predictMatch,
  suzanoMatches,
  suzanoRecord,
} from './utils/analysis';
import './styles.css';

registerServiceWorker();

const fmtDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});

function App() {
  const [activeCategoryId, setActiveCategoryId] = useState('sub7');
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);
  const record = useMemo(() => suzanoRecord(), []);
  const upcoming = useMemo(() => nextMatches(new Date()), []);
  const nextSuzano = upcoming.filter((match) => match.home === teamName || match.away === teamName);
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];
  const activeFpfs = fpfsCategories.find((category) => category.category === activeCategory.label);
  const hasFpfsCategoryData = Boolean(activeFpfs?.recentGames?.length || activeFpfs?.upcomingGames?.length);
  const hasFullSub7View = activeCategory.id === 'sub7';

  React.useEffect(() => {
    let active = true;
    fetchSuzanoWeather()
      .then((data) => {
        if (active) setWeather(data);
      })
      .catch(() => {
        if (active) setWeatherError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="app-shell">
      <Hero
        category={activeCategory}
        record={hasFullSub7View ? record : activeFpfs?.record}
        nextMatch={hasFullSub7View ? nextSuzano[0] : null}
        hasData={hasFullSub7View || hasFpfsCategoryData}
        weather={weather}
        weatherError={weatherError}
      />
      <InstallAppPrompt />
      <CategoryNav
        activeCategoryId={activeCategoryId}
        onSelect={setActiveCategoryId}
      />
      {hasFullSub7View ? (
        <>
          <NewsBanner />

          <section className="content-grid">
            <div className="main-flow">
              <NextGames matches={nextSuzano} />
              <TitleProjection />
              <WeeklyDesk />
              <Campaign matches={suzanoMatches()} />
            </div>

            <aside className="side-flow">
              <WeeklySchedule compact />
              <DataPanel />
            </aside>
          </section>
        </>
      ) : (
        <CategoryDashboard category={activeCategory} fpfsData={activeFpfs} />
      )}
    </main>
  );
}

function CategoryNav({ activeCategoryId, onSelect }) {
  return (
    <nav className="category-nav" aria-label="Categorias AD Suzano">
      <div className="category-nav-inner">
        {categories.map((category) => {
          const categoryFpfs = fpfsCategories.find((item) => item.category === category.label);
          const hasFpfsData = Boolean(categoryFpfs?.recentGames?.length || categoryFpfs?.upcomingGames?.length);
          return (
            <button
              className={category.id === activeCategoryId ? 'active' : ''}
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
            >
              <span>{category.label}</span>
              <small>{category.id === 'sub7' ? 'Completo' : hasFpfsData ? 'Dados FPFS' : category.status}</small>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function CategoryDashboard({ category, fpfsData }) {
  const hasSuzanoGames = Boolean(fpfsData?.recentGames?.length || fpfsData?.upcomingGames?.length);
  const record = fpfsData?.record;

  return (
    <section className="category-shell">
      <div className="category-main">
        <section className="panel category-intro">
          <div className="section-title">
            <div>
              <span>{category.competition}</span>
              <h2>{category.title}</h2>
            </div>
            <Shield size={22} />
          </div>
          <p>
            {hasSuzanoGames
              ? `Dados carregados da Súmula Online da FPFS para ${category.label}, temporada 2026, Paulista A2.`
              : `${category.description} A FPFS foi consultada, mas ainda não localizamos jogos do AD Suzano nesta categoria.`}
          </p>
          <div className="category-readiness">
            <div>
              <strong>{record?.points ?? 0} pontos</strong>
              <span>{record?.played ?? 0} jogos localizados na Súmula Online.</span>
            </div>
            <div>
              <strong>{record?.goalsFor ?? 0} gols feitos</strong>
              <span>Saldo {record?.goalDifference && record.goalDifference > 0 ? `+${record.goalDifference}` : record?.goalDifference ?? 0} na base FPFS.</span>
            </div>
            <div>
              <strong>{fpfsData?.upcomingGames?.length ?? 0} próximos jogos</strong>
              <span>Atualização automática via eventos.admfutsal.com.br.</span>
            </div>
          </div>
        </section>

        <CategoryGamesPanel
          title="Próximos jogos"
          games={fpfsData?.upcomingGames ?? []}
          emptyText="Nenhum próximo jogo do AD Suzano encontrado nesta categoria pela Súmula Online."
        />

        <CategoryGamesPanel
          title="Últimos resultados"
          games={fpfsData?.recentGames ?? []}
          emptyText="Nenhum resultado do AD Suzano encontrado nesta categoria pela Súmula Online."
        />

        <section className="panel empty-panel">
          <div className="section-title">
            <div>
              <span>YouTube</span>
              <h2>Busca de vídeos da categoria</h2>
            </div>
            <Sparkles size={22} />
          </div>
          <p>
            O portal também deixa pronta uma busca por vídeos públicos do YouTube
            relacionados ao AD Suzano, futsal, 2026 e {category.label}.
          </p>
          <a className="youtube-link" href={fpfsData?.youtubeSearchUrl} target="_blank" rel="noreferrer">
            Buscar vídeos no YouTube
          </a>
        </section>
      </div>

      <aside className="category-side">
        <section className="panel data-panel">
          <div className="section-title">
            <div>
              <span>Fonte primária</span>
              <h2>FPFS</h2>
            </div>
            <Sparkles size={22} />
          </div>
          <p>
            Temporada 2026, Campeonato Paulista, Divisão A2, categoria {category.label}.
            {hasSuzanoGames
              ? ' Dados carregados da tabela e dos jogos oficiais da Súmula Online.'
              : ' A FPFS foi consultada, mas não retornou jogos do AD Suzano para esta categoria nesta divisão.'}
            {' '}A estrutura do Sub-7 segue mais completa por conter agenda, notícias e leituras próprias adicionais.
          </p>
          {fpfsData && (
            <>
              <a href={fpfsData.gamesUrl} target="_blank" rel="noreferrer">Jogos na Súmula Online</a>
              <a href={fpfsData.url} target="_blank" rel="noreferrer">Classificação na FPFS</a>
            </>
          )}
        </section>
      </aside>
    </section>
  );
}

function CategoryGamesPanel({ title, games, emptyText }) {
  return (
    <section className="panel category-games-panel">
      <div className="section-title">
        <div>
          <span>FPFS Súmula Online</span>
          <h2>{title}</h2>
        </div>
        <CalendarDays size={22} />
      </div>
      {games.length ? (
        <div className="category-game-list">
          {games.map((game) => (
            <article className="category-game" key={`${game.date}-${game.home}-${game.away}`}>
              <div>
                <strong>{formatShortDate(game.date)} · {game.time || 'horário a confirmar'}</strong>
                <span>{game.home} {Number.isFinite(game.homeGoals) ? `${game.homeGoals} x ${game.awayGoals}` : 'x'} {game.away}</span>
                <small>{game.venue}</small>
              </div>
              {game.summaryUrl && (
                <a href={game.summaryUrl} target="_blank" rel="noreferrer">Súmula</a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-copy">{emptyText}</p>
      )}
    </section>
  );
}

function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  React.useEffect(() => {
    const shouldShow = () => isMobileDevice() && !isStandaloneApp();
    setVisible(shouldShow());

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setVisible(shouldShow());
    };

    const onInstalled = () => {
      localStorage.setItem('ad-suzano-pwa-installed', 'true');
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.matchMedia('(display-mode: standalone)').addEventListener?.('change', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    if (!installPrompt) {
      setIosHelp(true);
      return;
    }

    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      localStorage.setItem('ad-suzano-pwa-installed', 'true');
      setVisible(false);
    }
    setInstallPrompt(null);
  };

  return (
    <div className="install-card" role="region" aria-label="Instalar portal no celular">
      <button className="install-button" type="button" onClick={handleInstall}>
        <Download size={18} />
        Instalar no celular
      </button>
      <button
        className="install-dismiss"
        type="button"
        aria-label="Ocultar instalação"
        onClick={() => setVisible(false)}
      >
        Agora não
      </button>
      {iosHelp && (
        <p>
          No iPhone, toque em compartilhar e escolha “Adicionar à Tela de Início”.
        </p>
      )}
    </div>
  );
}

function NewsBanner() {
  const lead = newsItems.find((item) => item.category === 'Sub-7' || item.scope === 'AD Suzano Sub-7') ?? newsItems[0];
  const orderedNews = [lead, ...newsItems.filter((item) => item.id !== lead.id)];
  const featureItems = orderedNews.slice(1, 4);
  const tickerItems = orderedNews.slice(4);

  return (
    <section className="news-band" aria-labelledby="news-title">
      <div className="news-heading">
        <div>
          <span>Últimas notícias</span>
          <h2 id="news-title">Radar semanal AD Suzano</h2>
        </div>
        <strong>{newsItems.length} notícias na semana de {formatShortDate(newsWeek)}</strong>
      </div>

      <div className="news-layout">
        <motion.article
          className="lead-news"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45 }}
        >
          <div className="news-tag">{lead.category}</div>
          <h3>{lead.title}</h3>
          <p>{lead.summary}</p>
          <div className="news-impact">{lead.impact}</div>
          <NewsLink item={lead} />
        </motion.article>

        <div className="news-stack">
          {featureItems.map((item) => (
            <motion.article
              className="mini-news"
              key={item.id}
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <div>
                <span>{item.category}</span>
                <h3>{item.title}</h3>
              </div>
              <p>{item.summary}</p>
              <NewsLink item={item} />
            </motion.article>
          ))}
        </div>
      </div>

      <div className="news-rail">
        {tickerItems.map((item) => (
          <article className="rail-news" key={item.id}>
            <span>{item.category}</span>
            <strong>{item.title}</strong>
            <small>{item.source}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function NewsLink({ item }) {
  if (!item.url) {
    return <span className="source-chip">{item.source}</span>;
  }

  return (
    <a className="source-chip" href={item.url} target="_blank" rel="noreferrer">
      {item.source}
    </a>
  );
}

function routeLinks(query) {
  const destination = encodeURIComponent(query);
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${destination}`,
    waze: `https://waze.com/ul?q=${destination}&navigate=yes`,
  };
}

function RouteButtons({ query }) {
  if (!query) return null;
  const links = routeLinks(query);

  return (
    <div className="route-actions">
      <a href={links.google} target="_blank" rel="noreferrer">
        <MapPin size={15} />
        Google Maps
      </a>
      <a href={links.waze} target="_blank" rel="noreferrer">
        <Navigation size={15} />
        Waze
      </a>
    </div>
  );
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`));
}

function Hero({ category, record, nextMatch, hasData, weather, weatherError }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="hero-topline">
          <div className="eyebrow">
            <Shield size={18} />
            {category.competition} {category.label}
          </div>
          <TodayWeather weather={weather} weatherError={weatherError} />
        </div>
        <h1>{category.title} Inteligência de Jogo</h1>
        <p>
          Portal de leitura competitiva para acompanhar forma, próximos jogos,
          relações entre adversários e evolução coletiva da categoria.
        </p>
        {nextMatch && (
          <div className="next-pill">
            <CalendarDays size={18} />
            Próximo: {fmtDate.format(new Date(`${nextMatch.date}T12:00:00`))} às {nextMatch.time}, {nextMatch.home} x {nextMatch.away}
          </div>
        )}
        {!nextMatch && !hasData && (
          <div className="next-pill">
            <CalendarDays size={18} />
            Estrutura pronta para receber tabela, agenda e resultados.
          </div>
        )}
      </div>

      <div className="crest-stage" aria-label="Escudo AD Suzano">
        <img className="crest-image" src={suzanoLogo} alt="Escudo AD Suzano" />
      </div>

      <div className="stat-strip">
        <Metric icon={Trophy} label="Pontos" value={hasData ? record.points : 'Em breve'} />
        <Metric icon={Goal} label="Gols feitos" value={hasData ? record.goalsFor : 'Em breve'} />
        <Metric icon={Activity} label="Saldo" value={hasData ? (record.goalDifference > 0 ? `+${record.goalDifference}` : record.goalDifference) : 'Em breve'} />
        <Metric icon={BarChart3} label="Aproveitamento" value={hasData ? `${Math.round((record.points / Math.max(1, record.played * 3)) * 100)}%` : 'Em breve'} />
      </div>
    </section>
  );
}

function TodayWeather({ weather, weatherError }) {
  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return (
    <div className="today-weather">
      <SunMedium size={18} />
      <span>{today}</span>
      <strong>
        {weather
          ? `${weather.temperature}°C em Suzano`
          : weatherError
            ? 'Clima indisponível'
            : 'Atualizando clima...'}
      </strong>
      {weather && (
        <em>
          <Thermometer size={15} />
          Sensação {weather.apparent}°C · {weather.label}
        </em>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <motion.div
      className="metric"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
    >
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </motion.div>
  );
}

function WeeklySchedule({ compact = false }) {
  const grouped = weeklySchedule.reduce((acc, item) => {
    acc[item.date] = acc[item.date] ?? [];
    acc[item.date].push(item);
    return acc;
  }, {});

  return (
    <section className={`panel schedule-panel ${compact ? 'compact' : ''}`}>
      <div className="section-title">
        <div>
          <span>Agenda da semana</span>
          <h2>Semana de {formatShortDate(weeklyScheduleWeek)}</h2>
        </div>
        <CalendarDays size={22} />
      </div>

      <div className="schedule-grid">
        {Object.entries(grouped).map(([date, items]) => (
          <article className="schedule-day" key={date}>
            <div className="schedule-date">
              <strong>{items[0].weekday}</strong>
              <span>{formatShortDate(date)}</span>
            </div>
            <div className="schedule-items">
              {items.map((item) => (
                <div className={`schedule-item ${item.tone}`} key={item.id}>
                  <div className="schedule-type">{iconForSchedule(item.type)} {item.type}</div>
                  <h3>{item.title}</h3>
                  <p><Clock size={15} /> {item.time}</p>
                  <p><MapPin size={15} /> {item.location}</p>
                  <p className="address-line">{item.address}</p>
                  <RouteButtons query={item.mapQuery ?? item.address ?? item.location} />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function iconForSchedule(type) {
  if (type === 'Mental') return <Brain size={16} />;
  if (type === 'Jogo oficial') return <Trophy size={16} />;
  if (type === 'Goleiros') return <Shield size={16} />;
  return <Activity size={16} />;
}

function TitleProjection() {
  const projection = championshipProjection();

  return (
    <section className="panel title-panel">
      <div className="title-odds">
        <div>
          <span>Projeção estatística</span>
          <h2>Chance de ser campeão</h2>
          <p>
            Estimativa semanal baseada em aproveitamento, saldo, média de gols,
            fase recente e dificuldade dos próximos confrontos cadastrados.
          </p>
        </div>
        <div className="odds-ring" style={{ '--odds': `${projection.chance}%` }}>
          <strong>{projection.chance}%</strong>
          <span>Titulo</span>
        </div>
      </div>
      <div className="odds-reasons">
        {projection.reasons.map((reason) => (
          <div key={reason}>
            <ChevronRight size={18} />
            {reason}
          </div>
        ))}
      </div>
    </section>
  );
}

function NextGames({ matches }) {
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <span>Análise pré-jogo</span>
          <h2>Próximos confrontos</h2>
        </div>
        <Sparkles size={22} />
      </div>

      <div className="match-list">
        {matches.map((match) => {
          const prediction = predictMatch(match);
          const venueInfo = venueAddresses[match.venue];
          const address = venueInfo?.address;
          const mapQuery = venueInfo?.query ?? `${match.venue}, SP`;
          return (
            <article className="match-card" key={`${match.date}-${match.home}-${match.away}`}>
              <div className="match-date">
                <strong>{fmtDate.format(new Date(`${match.date}T12:00:00`))}</strong>
                <span>{match.time}</span>
              </div>

              <div className="match-body">
                <div className="teams-line">
                  <span>{match.home}</span>
                  <b>x</b>
                  <span>{match.away}</span>
                </div>
                <p><MapPin size={15} /> {match.venue}</p>
                {address && <p className="address-line">{address}</p>}
                <RouteButtons query={mapQuery} />
                <ul>
                  {prediction.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>

              <div className="chance">
                <span>Chance AD Suzano</span>
                <strong>{prediction.chance}%</strong>
                <div className="chance-bar">
                  <i style={{ width: `${prediction.chance}%` }} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function WeeklyDesk() {
  const monday = mondayAnalysisDate(new Date());
  const note = weeklyNotes.find((item) => item.weekOf === monday) ?? weeklyNotes[0];

  return (
    <section className="panel weekly-panel">
      <div className="section-title">
        <div>
          <span>Segunda-feira</span>
          <h2>Mesa de análise semanal</h2>
        </div>
        <CalendarDays size={22} />
      </div>
      <div className="weekly-copy">
        <strong>{note.title}</strong>
        <p>{note.body}</p>
      </div>
      <div className="focus-grid">
        {note.focus.map((item) => (
          <div className="focus-item" key={item}>
            <ChevronRight size={18} />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function Campaign({ matches }) {
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <span>Ritmo da campanha</span>
          <h2>Jogos do AD Suzano</h2>
        </div>
        <Trophy size={22} />
      </div>
      <div className="timeline">
        {matches.map((match) => {
          const played = Number.isFinite(match.homeGoals);
          const isHome = match.home === teamName;
          const goalsFor = played ? (isHome ? match.homeGoals : match.awayGoals) : null;
          const goalsAgainst = played ? (isHome ? match.awayGoals : match.homeGoals) : null;
          const status = !played ? 'proximo' : goalsFor > goalsAgainst ? 'vitoria' : goalsFor === goalsAgainst ? 'empate' : 'derrota';

          return (
            <div className={`timeline-row ${status}`} key={`${match.date}-${match.home}`}>
              <span>{fmtDate.format(new Date(`${match.date}T12:00:00`))}</span>
              <strong>{match.home} {played ? `${match.homeGoals} x ${match.awayGoals}` : 'x'} {match.away}</strong>
              <em>{status}</em>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DataPanel() {
  return (
    <section className="panel data-panel">
      <div className="section-title">
        <div>
          <span>Dados</span>
          <h2>Conexão</h2>
        </div>
        <BarChart3 size={22} />
      </div>
      <p>
        Base inicial montada com a tabela pública da FPFS. Para manter o GitHub
        Pages simples, os dados ficam em arquivos versionados e podem ser
        atualizados antes de cada rodada.
      </p>
      {sourceLinks.map((source) => (
        <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
          {source.label}
        </a>
      ))}
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);

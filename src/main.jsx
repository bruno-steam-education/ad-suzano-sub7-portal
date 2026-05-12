import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  BarChart3,
  Brain,
  CalendarDays,
  ChevronRight,
  Clock,
  Goal,
  MapPin,
  Shield,
  Sparkles,
  SunMedium,
  Thermometer,
  Trophy,
} from 'lucide-react';
import { motion } from 'motion/react';
import suzanoLogo from './assets/ad-suzano-logo.png';
import { newsItems, newsWeek } from './data/news';
import { weeklySchedule, weeklyScheduleWeek } from './data/schedule';
import { sourceLinks, teamName, weeklyNotes } from './data/season';
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

const fmtDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});

function App() {
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);
  const record = useMemo(() => suzanoRecord(), []);
  const upcoming = useMemo(() => nextMatches(new Date()), []);
  const nextSuzano = upcoming.filter((match) => match.home === teamName || match.away === teamName);

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
      <Hero record={record} nextMatch={nextSuzano[0]} weather={weather} weatherError={weatherError} />
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
    </main>
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

function formatShortDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`));
}

function Hero({ record, nextMatch, weather, weatherError }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="hero-topline">
          <div className="eyebrow">
            <Shield size={18} />
            Paulista A2 Sub-7
          </div>
          <TodayWeather weather={weather} weatherError={weatherError} />
        </div>
        <h1>AD Suzano Inteligência de Jogo</h1>
        <p>
          Portal de leitura competitiva para acompanhar forma, próximos jogos,
          relações entre adversários e evolução coletiva do Sub-7.
        </p>
        {nextMatch && (
          <div className="next-pill">
            <CalendarDays size={18} />
            Próximo: {fmtDate.format(new Date(`${nextMatch.date}T12:00:00`))} às {nextMatch.time}, {nextMatch.home} x {nextMatch.away}
          </div>
        )}
      </div>

      <div className="crest-stage" aria-label="Escudo AD Suzano">
        <img className="crest-image" src={suzanoLogo} alt="Escudo AD Suzano" />
      </div>

      <div className="stat-strip">
        <Metric icon={Trophy} label="Pontos" value={record.points} />
        <Metric icon={Goal} label="Gols feitos" value={record.goalsFor} />
        <Metric icon={Activity} label="Saldo" value={record.goalDifference > 0 ? `+${record.goalDifference}` : record.goalDifference} />
        <Metric icon={BarChart3} label="Aproveitamento" value={`${Math.round((record.points / Math.max(1, record.played * 3)) * 100)}%`} />
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
                <p>{match.venue}</p>
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

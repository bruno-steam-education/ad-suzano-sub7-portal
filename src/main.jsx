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
  Youtube,
} from 'lucide-react';
import { motion } from 'motion/react';
import packageInfo from '../package.json';
import suzanoLogo from './assets/ad-suzano-logo.png';
import { categories } from './data/categories';
import { fpfsCategories } from './data/fpfsCategories';
import { newsItems, newsWeek } from './data/news';
import { weeklySchedule, weeklyScheduleWeek } from './data/schedule';
import { contextualResults, sourceLinks, teamName, venueAddresses, weeklyNotes } from './data/season';
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

const appVersion = packageInfo.version;
const supporterPlaylistUrl = 'https://youtube.com/playlist?list=PLgwEymErdv_CKVwcZ7xY7IZ7nnRnc1TqM&si=nvwTyHLvLWB9V88c';

function normalizeFpfsGame(game) {
  return {
    ...game,
    time: game.time?.replace('h', ':') ?? '',
  };
}

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
  const sub7FpfsMatches = activeFpfs?.upcomingGames?.map(normalizeFpfsGame) ?? [];
  const sub7FpfsRecent = activeFpfs?.recentGames?.map(normalizeFpfsGame) ?? [];
  const sub7NextSuzano = sub7FpfsMatches.length ? sub7FpfsMatches : nextSuzano;
  const sub7CampaignMatches = sub7FpfsRecent.length ? sub7FpfsRecent : suzanoMatches();
  const sub7DisplayRecord = activeFpfs?.record ?? record;
  const activeCategoryNextMatch = hasFullSub7View ? sub7NextSuzano[0] : activeFpfs?.upcomingGames?.[0];

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
        record={hasFullSub7View ? sub7DisplayRecord : activeFpfs?.record}
        nextMatch={activeCategoryNextMatch}
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
              <CategoryNextGamesV2 category={activeCategory} games={sub7NextSuzano} robot={categoryRobot(activeCategory, activeFpfs)} />
              <TitleProjection />
              <AccessProjection />
              <WeeklyDesk />
              <Campaign matches={sub7CampaignMatches} />
            </div>

            <aside className="side-flow">
              <WeeklySchedule compact />
              <DataPanel />
            </aside>
          </section>
        </>
      ) : (
        <CompleteCategoryDashboard category={activeCategory} fpfsData={activeFpfs} />
      )}
      <AppFooter />
    </main>
  );
}

function AppFooter() {
  return (
    <footer className="app-footer">
      <div>
        <strong>AD Suzano Futsal - Portal de Análise</strong>
        <span>Versão {appVersion}</span>
      </div>
      <p>© {new Date().getFullYear()} AD Suzano. Todos os direitos reservados.</p>
    </footer>
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

function CompleteCategoryDashboard({ category, fpfsData }) {
  const hasSuzanoGames = Boolean(fpfsData?.recentGames?.length || fpfsData?.upcomingGames?.length);
  const record = fpfsData?.record;
  const robot = categoryRobot(category, fpfsData);

  return (
    <>
      <section className="category-overview">
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
      </section>

      <section className="content-grid category-complete-grid">
        <div className="main-flow">
          <CategoryNewsPanel category={category} />
          <CategoryNextGamesV2 category={category} games={fpfsData?.upcomingGames ?? []} robot={robot} />
          <CategoryTitleProjectionV2 category={category} robot={robot} hasSuzanoGames={hasSuzanoGames} />
          <CategoryAccessProjection category={category} robot={robot} hasSuzanoGames={hasSuzanoGames} />
          <CategoryWeeklyDesk category={category} />
          <CategoryGamesPanel
            title="Últimos resultados"
            games={fpfsData?.recentGames ?? []}
            emptyText="Nenhum resultado do AD Suzano encontrado nesta categoria pela Súmula Online."
            showRoutes
          />
          <CategoryCampaign category={category} fpfsData={fpfsData} />
        </div>

        <aside className="side-flow">
          <CategorySchedulePlaceholder category={category} games={fpfsData?.upcomingGames ?? []} />
          <CategoryRobotAudit category={category} robot={robot} />
          <CategoryYouTubePanel category={category} fpfsData={fpfsData} />
          <CategoryDataPanel category={category} fpfsData={fpfsData} hasSuzanoGames={hasSuzanoGames} />
        </aside>
      </section>
    </>
  );
}

function isSuzanoName(name = '') {
  return name.toUpperCase().includes('SUZANO');
}

function teamDisplayName(name = '') {
  const cleanName = name
    .replace(/\bA\.?D\.?\s+SUZANO\b/i, 'AD Suzano')
    .replace(/\bASSOCIAÇÃO\b/gi, 'Associação')
    .replace(/\bASSOCIACAO\b/gi, 'Associação')
    .replace(/\bDESPORTIVA\b/gi, 'Desportiva')
    .replace(/\bSANTO\b/gi, 'Santo')
    .replace(/\bANDRE\b/gi, 'André')
    .replace(/\bANDRÉ\b/gi, 'André')
    .replace(/\bFUTSAL\b/gi, 'Futsal')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanName === cleanName.toUpperCase()) {
    return cleanName
      .toLowerCase()
      .replace(/(^|\s|-)([a-záàâãéêíóôõúç])/g, (match) => match.toUpperCase())
      .replace('Ad Suzano', 'AD Suzano');
  }

  return cleanName
    .replace(/\bOCIAN\b/gi, 'Ocian')
    .replace(/\bPRAIA\b/gi, 'Praia')
    .replace(/\bCLUBE\b/gi, 'Clube')
    .replace(/\bCHUTE\b/gi, 'Chute');
}

function categoryRobot(category, fpfsData) {
  const record = fpfsData?.record ?? {};
  const played = record.played ?? 0;
  const efficiency = played ? record.points / Math.max(1, played * 3) : 0;
  const recentGames = fpfsData?.recentGames ?? [];
  const upcomingGames = fpfsData?.upcomingGames ?? [];
  const recentWins = recentGames.slice(-4).filter((game) => {
    const suzanoHome = isSuzanoName(game.home);
    const goalsFor = suzanoHome ? game.homeGoals : game.awayGoals;
    const goalsAgainst = suzanoHome ? game.awayGoals : game.homeGoals;
    return Number.isFinite(goalsFor) && goalsFor > goalsAgainst;
  }).length;
  const goalSignal = Math.max(-12, Math.min(14, record.goalDifference ?? 0));
  const attackRate = played ? (record.goalsFor ?? 0) / played : 0;
  const defenseRate = played ? (record.goalsAgainst ?? 0) / played : 0;
  const titleChance = Math.round(Math.max(6, Math.min(84, 14 + efficiency * 58 + goalSignal * 1.15 + recentWins * 2)));
  const accessChance = Math.round(Math.max(20, Math.min(72, 18 + efficiency * 38 + goalSignal * 0.9 + recentWins * 2 + 7)));

  return {
    category,
    record,
    played,
    efficiency,
    efficiencyLabel: `${Math.round(efficiency * 100)}%`,
    recentWins,
    attackRate,
    defenseRate,
    titleChance,
    accessChance,
    upcomingGames,
    recentGames,
    freshness: fpfsData?.checkedAt ? new Date(fpfsData.checkedAt) : null,
  };
}

function opponentForCategoryGame(game) {
  return teamDisplayName(isSuzanoName(game.home) ? game.away : game.home);
}

function categoryMatchPrediction(category, game, robot, index = 0) {
  const suzanoHome = isSuzanoName(game.home);
  const homeBoost = suzanoHome ? 5 : -2;
  const recentBoost = robot.recentWins * 2.4;
  const defensePenalty = Math.min(9, robot.defenseRate * 1.5);
  const attackBoost = Math.min(10, robot.attackRate * 2.1);
  const slotPenalty = index * 2;
  const chance = Math.round(Math.max(18, Math.min(84, 34 + robot.efficiency * 34 + homeBoost + recentBoost + attackBoost - defensePenalty - slotPenalty)));
  const latest = robot.recentGames.at(-1);
  const latestText = latest
    ? `vem de ${isSuzanoName(latest.home) ? latest.homeGoals : latest.awayGoals} x ${isSuzanoName(latest.home) ? latest.awayGoals : latest.homeGoals} contra ${opponentForCategoryGame(latest)}`
    : 'ainda não tem resultado recente localizado';

  return {
    chance,
    opponent: opponentForCategoryGame(game),
    reasons: [
      `${category.label} ${latestText}.`,
      `Campanha: ${robot.record.points ?? 0} pontos, ${robot.efficiencyLabel} de aproveitamento e saldo ${robot.record.goalDifference > 0 ? `+${robot.record.goalDifference}` : robot.record.goalDifference ?? 0}.`,
      `Médias: ${robot.attackRate.toFixed(1)} gols feitos e ${robot.defenseRate.toFixed(1)} sofridos por jogo na FPFS.`,
      ...smartCrossReasons(category, game, robot),
    ],
  };
}

function pendingCategoryProjection(category, robot, index = 0) {
  const chance = Math.round(Math.max(18, Math.min(78, 30 + robot.efficiency * 34 + Math.max(-8, Math.min(10, robot.record.goalDifference ?? 0)) + robot.recentWins * 2 - index * 3)));

  return {
    chance,
    reasons: [
      `Base do robô ${category.label}: ${robot.record.points ?? 0} pontos em ${robot.record.played ?? 0} jogos e ${robot.efficiencyLabel} de aproveitamento.`,
      `Saldo ${robot.record.goalDifference > 0 ? `+${robot.record.goalDifference}` : robot.record.goalDifference ?? 0}, com média de ${robot.attackRate.toFixed(1)} gols feitos por jogo.`,
      'Adversário ainda não publicado pela FPFS; percentual é uma estimativa de força média da categoria.',
    ],
  };
}

function smartCrossReasons(category, game, robot) {
  if (category.label !== 'Sub-7') return [];
  const opponent = opponentForCategoryGame(game).toUpperCase();
  const suzanoWins = robot.recentGames
    .filter((recent) => {
      const suzanoHome = isSuzanoName(recent.home);
      const goalsFor = suzanoHome ? recent.homeGoals : recent.awayGoals;
      const goalsAgainst = suzanoHome ? recent.awayGoals : recent.homeGoals;
      return Number.isFinite(goalsFor) && goalsFor > goalsAgainst;
    })
    .map((recent) => opponentForCategoryGame(recent).toUpperCase());

  const bridge = contextualResults.find((result) => {
    const teams = [result.home.toUpperCase(), result.away.toUpperCase()];
    return teams.some((team) => team.includes(opponent.split(' ')[0])) && suzanoWins.some((wonTeam) => teams.some((team) => team.includes(wonTeam.split(' ')[0])));
  });

  if (!bridge) return [];

  return [
    `Cruzamento indireto: ${teamDisplayName(bridge.home)} ${bridge.homeGoals} x ${bridge.awayGoals} ${teamDisplayName(bridge.away)} ajuda a calibrar o confronto.`,
  ];
}

function buildThreeGameSlots(games) {
  const realGames = games.slice(0, 3).map((game, index) => ({ game, index, pending: false }));
  const missing = Math.max(0, 3 - realGames.length);
  return [
    ...realGames,
    ...Array.from({ length: missing }, (_, offset) => ({ game: null, index: realGames.length + offset, pending: true })),
  ];
}

function categoryAudit(robot) {
  const checkedAt = robot.freshness;
  const ageHours = checkedAt ? (Date.now() - checkedAt.getTime()) / 36e5 : Infinity;
  return [
    { label: 'Vitórias dos próximos jogos', ok: robot.upcomingGames.slice(0, 3).every((game, index) => categoryMatchPrediction(robot.category, game, robot, index).chance > 0) },
    { label: 'Chance de título', ok: robot.titleChance > 0 },
    { label: 'Chance de acesso', ok: robot.accessChance > 0 },
    { label: 'Fonte FPFS atualizada', ok: ageHours <= 36 },
  ];
}

function categorySportsNews(category, latest, next, record) {
  if (latest) {
    const suzanoHome = isSuzanoName(latest.home);
    const opponent = teamDisplayName(suzanoHome ? latest.away : latest.home);
    const goalsFor = suzanoHome ? latest.homeGoals : latest.awayGoals;
    const goalsAgainst = suzanoHome ? latest.awayGoals : latest.homeGoals;
    const score = `${goalsFor} x ${goalsAgainst}`;
    const totalGoals = goalsFor + goalsAgainst;
    const venueLine = suzanoHome ? 'em casa' : 'fora de casa';
    const resultText = goalsFor > goalsAgainst ? 'venceu' : goalsFor === goalsAgainst ? 'empatou' : 'foi superado';

    const title =
      goalsFor > goalsAgainst
        ? totalGoals >= 7
          ? `${category.label} vence ${opponent} por ${score} em jogo movimentado no Paulista A2`
          : `${category.label} bate ${opponent} por ${score} e soma pontos importantes`
        : goalsFor === goalsAgainst
          ? `${category.label} fica no ${score} com ${opponent} e segue vivo na briga`
          : `${category.label} perde por ${score} para ${opponent}, mas mant�m campanha em pauta`;

    return {
      source: 'Rodada FPFS',
      title,
      summary: `O AD Suzano ${resultText} ${venueLine} por ${score} contra ${opponent}, em resultado publicado na Súmula Online da FPFS.`,
      impact: record?.played
        ? `Na tabela da categoria, a equipe aparece com ${record.points} pontos em ${record.played} jogos, ${record.goalsFor} gols marcados e saldo ${record.goalDifference > 0 ? `+${record.goalDifference}` : record.goalDifference}.`
        : 'O placar passa a orientar a leitura da rodada e os próximos ajustes da categoria.',
    };
  }

  if (next) {
    const opponent = teamDisplayName(isSuzanoName(next.home) ? next.away : next.home);

    return {
      source: 'Pré-jogo FPFS',
      title: `${category.label} tem duelo marcado contra ${opponent} pelo Paulista A2`,
      summary: `A FPFS confirmou AD Suzano x ${opponent} para ${formatShortDate(next.date)}, às ${next.time || 'horário a confirmar'}, em ${next.venue}.`,
      impact: 'O confronto vira o foco da semana e deve orientar treino, convocação e leitura de desempenho da categoria.',
    };
  }

  return {
    source: category.label,
    title: `${category.label} aguarda nova rodada confirmada pela FPFS`,
    summary: 'Ainda não há notícia externa específica nem novo jogo confirmado para destacar nesta categoria.',
    impact: 'Assim que a Súmula Online publicar jogos ou resultados, o radar passa a abrir com a manchete da rodada.',
  };
}

function CategoryNewsPanel({ category }) {
  const fpfsData = fpfsCategories.find((item) => item.category === category.label);
  const latest = fpfsData?.recentGames?.at(-1);
  const next = fpfsData?.upcomingGames?.[0];
  const record = fpfsData?.record;
  const categoryNews = newsItems.filter(
    (item) => item.category === category.label || item.scope === `AD Suzano ${category.label}`,
  );
  const leadNews = categoryNews[0];
  const extraNews = categoryNews.slice(1, 3);
  const fallbackNews = categorySportsNews(category, latest, next, record);

  return (
    <section className="news-band category-news-band" aria-labelledby={`news-${category.id}`}>
      <div className="news-heading">
        <div>
          <span>Últimas notícias</span>
          <h2 id={`news-${category.id}`}>Radar {category.label}</h2>
        </div>
        <strong>
          {categoryNews.length
            ? `${categoryNews.length} notícias para ${category.label}`
            : 'Atualizado pela Súmula Online da FPFS'}
        </strong>
      </div>
      <div className="category-empty-news">
        <div className="news-tag">{leadNews?.source ?? fallbackNews.source}</div>
        <h3>
          {leadNews
            ? leadNews.title
            : fallbackNews.title}
        </h3>
        <p>
          {leadNews?.summary ?? fallbackNews.summary}
        </p>
        <div className="news-impact">
          {leadNews?.impact ?? fallbackNews.impact}
        </div>
        {extraNews.length > 0 && (
          <div className="category-news-list">
            {extraNews.map((item) => (
              <span key={item.id}>{item.title}</span>
            ))}
          </div>
        )}
        <a className="source-chip" href={leadNews?.url ?? fpfsData?.gamesUrl} target="_blank" rel="noreferrer">
          {leadNews?.url ? 'Abrir fonte' : 'FPFS Súmula Online'}
        </a>
      </div>
    </section>
  );
}

function CategoryNewsPlaceholder({ category }) {
  const fpfsData = fpfsCategories.find((item) => item.category === category.label);
  const latest = fpfsData?.recentGames?.at(-1);
  const next = fpfsData?.upcomingGames?.[0];
  const record = fpfsData?.record;

  return (
    <section className="news-band category-news-band" aria-labelledby={`news-${category.id}`}>
      <div className="news-heading">
        <div>
          <span>Últimas notícias</span>
          <h2 id={`news-${category.id}`}>Radar {category.label}</h2>
        </div>
        <strong>Boletim pesquisado na Súmula Online da FPFS</strong>
      </div>
      <div className="category-empty-news">
        <div className="news-tag">{category.label}</div>
        <h3>
          {latest
            ? `${category.label}: último jogo oficial foi ${latest.home} ${latest.homeGoals} x ${latest.awayGoals} ${latest.away}`
            : next
              ? `${category.label}: próximo jogo oficial será ${next.home} x ${next.away}`
              : `AD Suzano ${category.label}: sem nova publicação específica localizada`}
        </h3>
        <p>
          {record?.played
            ? `Campanha localizada na FPFS: ${record.points} pontos em ${record.played} jogos, ${record.goalsFor} gols feitos e saldo ${record.goalDifference > 0 ? `+${record.goalDifference}` : record.goalDifference}.`
            : 'A pesquisa pública não encontrou jogos oficiais do AD Suzano nesta categoria no A2 2026.'}
        </p>
        {next && <div className="news-impact">Próximo compromisso: {formatShortDate(next.date)} às {next.time || 'horário a confirmar'}, em {next.venue}.</div>}
        <a className="source-chip" href={fpfsData?.gamesUrl} target="_blank" rel="noreferrer">FPFS Súmula Online</a>
      </div>
    </section>
  );
}

function CategoryNextGamesV2({ category, games, robot }) {
  const slots = buildThreeGameSlots(games);

  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <span>Robô pré-jogo</span>
          <h2>Próximos 3 confrontos</h2>
        </div>
        <Sparkles size={22} />
      </div>

      <div className="match-list">
        {slots.map(({ game, index, pending }) => {
          if (pending) {
            const projection = pendingCategoryProjection(category, robot, index);
            return (
              <article className="match-card category-match-card pending-game-slot" key={`${category.id}-pending-${index}`}>
                <div className="match-date">
                  <strong>Jogo {index + 1}</strong>
                  <span>FPFS</span>
                </div>
                <div className="match-body">
                  <div className="teams-line">
                    <span>Aguardando publicação</span>
                  </div>
                  <p>A Súmula Online ainda não liberou este compromisso da categoria.</p>
                  <ul>
                    <li>O robô mantém o espaço pronto para análise assim que a FPFS publicar data, local e adversário.</li>
                    <li>Estimativa base da categoria: {projection.chance}% até a FPFS confirmar o adversário.</li>
                  </ul>
                </div>
                <div className="chance pending-chance">
                  <span>Chance AD Suzano</span>
                  <strong>{projection.chance}%</strong>
                  <small>Base estatística da categoria</small>
                  <div className="chance-bar">
                    <i style={{ width: `${projection.chance}%` }} />
                  </div>
                </div>
              </article>
            );
          }

          const prediction = categoryMatchPrediction(category, game, robot, index);

          return (
            <article className="match-card category-match-card" key={`${category.id}-${game.date}-${game.home}-${game.away}`}>
              <div className="match-date">
                <strong>{fmtDate.format(new Date(`${game.date}T12:00:00`))}</strong>
                <span>{game.time || 'A confirmar'}</span>
              </div>
              <div className="match-body">
                <div className="teams-line">
                  <span>{game.home}</span>
                  <b>x</b>
                  <span>{game.away}</span>
                </div>
                <p><MapPin size={15} /> {game.venue}</p>
                <RouteButtons query={game.venue && game.venue !== 'A DEFINIR' ? `${game.venue}, SP` : null} />
                <ul>
                  {prediction.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
              <div className="chance pending-chance">
                <span>Chance AD Suzano</span>
                <strong>{prediction.chance}%</strong>
                <small>Robô {category.label}: campanha, saldo, mando e fase recente</small>
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

function CategoryNextGames({ category, games }) {
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <span>Análise pré-jogo</span>
          <h2>Próximos confrontos</h2>
        </div>
        <Sparkles size={22} />
      </div>

      {games.length ? (
        <div className="match-list">
          {games.map((game) => (
            <article className="match-card category-match-card" key={`${category.id}-${game.date}-${game.home}-${game.away}`}>
              <div className="match-date">
                <strong>{fmtDate.format(new Date(`${game.date}T12:00:00`))}</strong>
                <span>{game.time || 'A confirmar'}</span>
              </div>
              <div className="match-body">
                <div className="teams-line">
                  <span>{game.home}</span>
                  <b>x</b>
                  <span>{game.away}</span>
                </div>
                <p><MapPin size={15} /> {game.venue}</p>
                <RouteButtons query={game.venue && game.venue !== 'A DEFINIR' ? `${game.venue}, SP` : null} />
              </div>
              <div className="chance pending-chance">
                <span>Chance AD Suzano</span>
                <strong>{categoryGameChance(category)}%</strong>
                <small>Estimativa por aproveitamento e saldo da categoria</small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-copy">Nenhum próximo jogo do AD Suzano encontrado nesta categoria pela Súmula Online.</p>
      )}
    </section>
  );
}

function categoryGameChance(category) {
  const fpfsData = fpfsCategories.find((item) => item.category === category.label);
  const record = fpfsData?.record;
  if (!record?.played) return 50;
  const efficiency = record.points / Math.max(1, record.played * 3);
  const goalSignal = Math.max(-12, Math.min(12, record.goalDifference)) * 1.2;
  return Math.round(Math.max(18, Math.min(82, 42 + efficiency * 34 + goalSignal)));
}

function CategoryTitleProjectionV2({ category, robot, hasSuzanoGames }) {
  const record = robot.record;

  return (
    <section className="panel title-panel pending-title-panel">
      <div className="title-odds">
        <div>
          <span>Robô estatístico {category.label}</span>
          <h2>Chance de ser campeão</h2>
          <p>
            {hasSuzanoGames
              ? `Leitura do robô: ${record.points} pontos em ${record.played} jogos, ${robot.efficiencyLabel} de aproveitamento, saldo ${record.goalDifference > 0 ? `+${record.goalDifference}` : record.goalDifference} e ${robot.recentWins} vitórias nos últimos 4 jogos.`
              : 'Aguardando jogos oficiais do AD Suzano nesta categoria para ativar a projeção.'}
          </p>
        </div>
        <div className="odds-ring pending-ring" style={{ '--odds': `${robot.titleChance}%` }}>
          <strong>{hasSuzanoGames ? `${robot.titleChance}%` : '--'}</strong>
          <span>Título</span>
        </div>
      </div>
      <div className="odds-reasons">
        <div><ChevronRight size={18} />Aproveitamento atual: {hasSuzanoGames ? robot.efficiencyLabel : 'aguardando dados'}.</div>
        <div><ChevronRight size={18} />Saldo: {record?.goalDifference > 0 ? `+${record.goalDifference}` : record?.goalDifference ?? 'aguardando dados'}.</div>
        <div><ChevronRight size={18} />Ataque: {hasSuzanoGames ? `${robot.attackRate.toFixed(1)} gols por jogo` : 'aguardando dados'}.</div>
        <div><ChevronRight size={18} />Fase recente: {hasSuzanoGames ? `${robot.recentWins} vitórias nos últimos 4 jogos` : 'aguardando dados'}.</div>
      </div>
    </section>
  );
}

function CategoryTitleProjection({ category, record, hasSuzanoGames }) {
  const efficiency = record?.played ? Math.round((record.points / Math.max(1, record.played * 3)) * 100) : null;
  const titleChance = categoryTitleChance(record);

  return (
    <section className="panel title-panel pending-title-panel">
      <div className="title-odds">
        <div>
          <span>Projeção estatística</span>
          <h2>Chance de ser campeão</h2>
          <p>
            {hasSuzanoGames
              ? `Base oficial localizada para o ${category.label}: ${record.points} pontos em ${record.played} jogos, ${record.goalsFor} gols feitos e saldo ${record.goalDifference > 0 ? `+${record.goalDifference}` : record.goalDifference}.`
              : 'Aguardando jogos oficiais do AD Suzano nesta categoria para ativar a projeção.'}
          </p>
        </div>
        <div className="odds-ring pending-ring" style={{ '--odds': `${titleChance}%` }}>
          <strong>{hasSuzanoGames ? `${titleChance}%` : '--'}</strong>
          <span>Título</span>
        </div>
      </div>
      <div className="odds-reasons">
        <div><ChevronRight size={18} />Cálculo baseado na campanha oficial já localizada na FPFS.</div>
        <div><ChevronRight size={18} />Aproveitamento atual: {efficiency === null ? 'aguardando dados' : `${efficiency}%`}.</div>
        <div><ChevronRight size={18} />Saldo atual: {record?.goalDifference > 0 ? `+${record.goalDifference}` : record?.goalDifference ?? 'aguardando dados'}.</div>
        <div><ChevronRight size={18} />Percentual será refinado quando a classificação completa for incorporada.</div>
      </div>
    </section>
  );
}

function categoryTitleChance(record) {
  if (!record?.played) return 0;
  const efficiency = record.points / Math.max(1, record.played * 3);
  const goalSignal = Math.max(-15, Math.min(15, record.goalDifference)) * 1.1;
  return Math.round(Math.max(6, Math.min(78, 18 + efficiency * 52 + goalSignal)));
}

function CategoryAccessProjection({ category, robot, hasSuzanoGames }) {
  const record = robot.record;

  return (
    <section className="panel access-panel category-access-panel">
      <div className="access-layout">
        <div className="access-copy">
          <span>Robô de acesso {category.label}</span>
          <h2>Chance de subir para a A1</h2>
          <p>
            {hasSuzanoGames
              ? `Projeção por Ranking de Eficiência: Paulista A2 atual, saldo, fase recente e margem disciplinar ainda pendente.`
              : 'Aguardando dados oficiais para estimar acesso.'}
          </p>
        </div>
        <div className="access-score">
          <div className="odds-ring access-ring" style={{ '--odds': `${robot.accessChance}%` }}>
            <strong>{hasSuzanoGames ? `${robot.accessChance}%` : '--'}</strong>
            <span>Acesso A1</span>
          </div>
          <small>{category.label}: cálculo próprio do robô da categoria.</small>
        </div>
      </div>
      <div className="access-bottom-grid">
        <div className="access-box">
          <h3>Por que esse número</h3>
          <ul>
            <li>{record.points ?? 0} pontos em {record.played ?? 0} jogos.</li>
            <li>{robot.efficiencyLabel} de aproveitamento na base FPFS.</li>
            <li>Saldo {record.goalDifference > 0 ? `+${record.goalDifference}` : record.goalDifference ?? 0} e média de {robot.attackRate.toFixed(1)} gols feitos.</li>
          </ul>
        </div>
        <div className="access-box access-box-red">
          <h3>Próximos marcos</h3>
          <ul>
            <li>Manter aproveitamento acima de 60%.</li>
            <li>Evitar cartões para não perder pontos disciplinares.</li>
            <li>Transformar os próximos jogos publicados pela FPFS em pontos.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function CategoryRobotAudit({ category, robot }) {
  const checks = categoryAudit(robot);
  const checkedAt = robot.freshness
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(robot.freshness)
    : 'sem data';

  return (
    <section className="panel robot-audit-panel">
      <div className="section-title">
        <div>
          <span>Pente fino</span>
          <h2>Robô {category.label}</h2>
        </div>
        <Sparkles size={22} />
      </div>
      <p>Última leitura FPFS: {checkedAt}. O robô confere percentuais de vitória, título e acesso antes de publicar.</p>
      <div className="robot-check-list">
        {checks.map((check) => (
          <div className={check.ok ? 'ok' : 'warn'} key={check.label}>
            <strong>{check.ok ? 'OK' : 'Atenção'}</strong>
            <span>{check.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryWeeklyDesk({ category }) {
  const fpfsData = fpfsCategories.find((item) => item.category === category.label);
  const next = fpfsData?.upcomingGames?.[0];
  const latest = fpfsData?.recentGames?.at(-1);

  return (
    <section className="panel weekly-panel">
      <div className="section-title">
        <div>
          <span>Segunda-feira</span>
          <h2>Mesa de análise semanal</h2>
        </div>
        <CalendarDays size={22} />
      </div>
      <div className="weekly-copy muted-weekly-copy">
        <strong>{next ? `Semana de preparação para ${next.away.includes('SUZANO') ? next.home : next.away}` : `Leitura semanal do ${category.label}`}</strong>
        <p>
          {latest
            ? `Último resultado oficial encontrado: ${latest.home} ${latest.homeGoals} x ${latest.awayGoals} ${latest.away}. A pauta da semana deve partir desse jogo e do próximo compromisso listado pela FPFS.`
            : 'A pesquisa pública não encontrou resultado recente desta categoria; o espaço segue pronto para receber análise técnica confirmada.'}
        </p>
      </div>
      <div className="focus-grid">
        {(next ? [
          `Próximo jogo: ${formatShortDate(next.date)} às ${next.time || 'horário a confirmar'}`,
          `Adversário: ${next.away.includes('SUZANO') ? next.home : next.away}`,
          `Local: ${next.venue}`,
        ] : ['Foco tático: aguardando dados', 'Ponto de atenção: aguardando dados', 'Meta da semana: aguardando dados']).map((item) => (
          <div className="focus-item placeholder-focus" key={item}>
            <ChevronRight size={18} />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryCampaign({ category, fpfsData }) {
  const games = [...(fpfsData?.recentGames ?? []), ...(fpfsData?.upcomingGames ?? [])]
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <span>Ritmo da campanha</span>
          <h2>Jogos do AD Suzano {category.label}</h2>
        </div>
        <Trophy size={22} />
      </div>
      {games.length ? (
        <div className="timeline">
          {games.map((game) => {
            const playedGame = Number.isFinite(game.homeGoals);
            const isHome = game.home.includes('SUZANO');
            const goalsFor = playedGame ? (isHome ? game.homeGoals : game.awayGoals) : null;
            const goalsAgainst = playedGame ? (isHome ? game.awayGoals : game.homeGoals) : null;
            const status = !playedGame ? 'proximo' : goalsFor > goalsAgainst ? 'vitoria' : goalsFor === goalsAgainst ? 'empate' : 'derrota';

            return (
              <div className={`timeline-row ${status}`} key={`${category.id}-${game.date}-${game.home}-${game.away}`}>
                <span>{fmtDate.format(new Date(`${game.date}T12:00:00`))}</span>
                <strong>{game.home} {playedGame ? `${game.homeGoals} x ${game.awayGoals}` : 'x'} {game.away}</strong>
                <em>{status}</em>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="empty-copy">Campanha aguardando jogos oficiais localizados na FPFS.</p>
      )}
    </section>
  );
}

function CategorySchedulePlaceholder({ category, games }) {
  return (
    <section className="panel schedule-panel compact">
      <div className="section-title">
        <div>
          <span>Agenda da semana</span>
          <h2>{category.label}</h2>
        </div>
        <CalendarDays size={22} />
      </div>
      <div className="schedule-grid">
        <article className="schedule-day">
          <div className="schedule-date">
            <strong>Treinos</strong>
            <span>Aguardando</span>
          </div>
          <div className="schedule-items">
            <div className="schedule-item ice">
              <div className="schedule-type"><Activity size={16} /> Agenda</div>
              <h3>Treinos da categoria</h3>
              <p><Clock size={15} /> Horário aguardando confirmação</p>
              <p><MapPin size={15} /> Local aguardando confirmação</p>
            </div>
          </div>
        </article>
        {games.slice(0, 2).map((game) => (
          <article className="schedule-day" key={`${category.id}-agenda-${game.date}-${game.time}`}>
            <div className="schedule-date">
              <strong>Jogo</strong>
              <span>{formatShortDate(game.date)}</span>
            </div>
            <div className="schedule-items">
              <div className="schedule-item match">
                <div className="schedule-type">{iconForSchedule('Jogo oficial')} Jogo oficial</div>
                <h3>{game.home} x {game.away}</h3>
                <p><Clock size={15} /> {game.time || 'Horário a confirmar'}</p>
                <p><MapPin size={15} /> {game.venue}</p>
                <RouteButtons query={game.venue && game.venue !== 'A DEFINIR' ? `${game.venue}, SP` : null} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CategoryYouTubePanel({ category, fpfsData }) {
  return (
    <section className="panel empty-panel">
      <div className="section-title">
        <div>
          <span>YouTube</span>
          <h2>Busca de vídeos da categoria</h2>
        </div>
        <Sparkles size={22} />
      </div>
      <p>
        O portal deixa pronta a busca por vídeos públicos relacionados ao AD Suzano,
        futsal, 2026 e {category.label}. Metadados individuais ficam reservados para a
        etapa de análise dos atletas.
      </p>
      <a className="youtube-link" href={fpfsData?.youtubeSearchUrl} target="_blank" rel="noreferrer">
        Buscar vídeos no YouTube
      </a>
    </section>
  );
}

function CategoryDataPanel({ category, fpfsData, hasSuzanoGames }) {
  return (
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
        {' '}Campos sem fonte confirmada ficam em aberto.
      </p>
      {fpfsData && (
        <>
          <a href={fpfsData.gamesUrl} target="_blank" rel="noreferrer">Jogos na Súmula Online</a>
          <a href={fpfsData.url} target="_blank" rel="noreferrer">Classificação na FPFS</a>
        </>
      )}
    </section>
  );
}

function CategoryGamesPanel({ title, games, emptyText, showRoutes = false }) {
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
                {showRoutes && (
                  <RouteButtons query={game.venue && game.venue !== 'A DEFINIR' ? `${game.venue}, SP` : null} />
                )}
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
  const mainNews = newsItems
    .filter((item) => item.category === 'AD Suzano' || item.category === 'Sub-7' || item.scope === 'AD Suzano Sub-7')
    .slice(0, 10);
  const lead = mainNews.find((item) => item.category === 'Sub-7' || item.scope === 'AD Suzano Sub-7') ?? mainNews[0] ?? newsItems[0];
  const orderedNews = [lead, ...mainNews.filter((item) => item.id !== lead.id)];
  const featureItems = orderedNews.slice(1, 4);
  const tickerItems = orderedNews.slice(4);

  return (
    <section className="news-band" aria-labelledby="news-title">
      <div className="news-heading">
        <div>
          <span>Últimas notícias</span>
          <h2 id="news-title">Radar semanal AD Suzano</h2>
        </div>
        <strong>{orderedNews.length} notícias na semana de {formatShortDate(newsWeek)}</strong>
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
        <div className="hero-actions">
          <a className="supporter-chant-button" href={supporterPlaylistUrl} target="_blank" rel="noreferrer">
            <Youtube size={20} />
            Grito da torcida
          </a>
        </div>
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

function a1AccessProjection() {
  const record = suzanoRecord();
  const currentEfficiency = record.played ? record.points / (record.played * 3) : 0;
  const recentWins = record.recent.slice(-4).filter((game) => game.result === 'V').length;
  const goalBalanceSignal = Math.min(8, Math.max(-4, record.goalDifference) * 0.62);
  const rawChance =
    25 +
    currentEfficiency * 24 +
    goalBalanceSignal +
    recentWins * 2 +
    6 -
    8 -
    3;
  const chance = Math.round(Math.min(62, Math.max(28, rawChance)));

  return {
    chance,
    efficiency: Math.round(currentEfficiency * 100),
    recentWins,
    reasons: [
      `A regra divulgada para a iniciação prevê 4 acessos da A2 para a A1 pelo Ranking de Eficiência.`,
      `O Sub-7 tem ${record.points} pontos em ${record.played} jogos, ${Math.round(currentEfficiency * 100)}% de aproveitamento e saldo ${record.goalDifference > 0 ? `+${record.goalDifference}` : record.goalDifference}.`,
      `A sequência recente pesa a favor: ${recentWins} vitórias nos últimos 4 jogos mapeados, incluindo o 7 x 3 fora no Dia das Mães.`,
      `A projeção ainda fica travada porque faltam os dados do Torneio União e a pontuação disciplinar oficial.`,
    ],
    process: [
      'Paulista A2 atual: aproveitamento, saldo de gols e fase recente.',
      'Regra de acesso: 4 vagas sobem da A2 para a A1 nas categorias de iniciação.',
      'Torneio União: tratado como pendente até termos tabela e resultados oficiais.',
      'Disciplina: cartões podem retirar pontos do ranking, então o modelo segura a chance sem súmula completa.',
    ],
    milestones: [
      `Manter pelo menos 65% de aproveitamento; hoje o portal projeta ${Math.round(currentEfficiency * 100)}%.`,
      'Buscar 4 a 6 pontos nos próximos dois jogos para sustentar zona real de acesso.',
      'Preservar saldo positivo acima de +12 e elevar a média ofensiva sem abrir transições.',
      'Chegar ao Torneio União com campanha forte e plano de jogo limpo para não perder pontos por cartões.',
    ],
  };
}

function AccessProjection() {
  const projection = a1AccessProjection();

  return (
    <section className="panel access-panel">
      <div className="access-layout">
        <div className="access-copy">
          <span>Projeção de acesso</span>
          <h2>Chance de subir para a A1 como Sub-8</h2>
          <p>
            Estimativa baseada na regra de acesso da iniciação, campanha atual do
            Paulista A2, fase recente e variáveis ainda pendentes do Ranking de Eficiência.
          </p>
        </div>

        <div className="access-score">
          <div className="odds-ring access-ring" style={{ '--odds': `${projection.chance}%` }}>
            <strong>{projection.chance}%</strong>
            <span>Acesso A1</span>
          </div>
          <small>Faixa conservadora até entrar Torneio União e cartões.</small>
        </div>
      </div>

      <div className="access-section">
        <h3>Motivo da estimativa</h3>
        <div className="odds-reasons">
          {projection.reasons.map((reason) => (
            <div key={reason}>
              <ChevronRight size={18} />
              {reason}
            </div>
          ))}
        </div>
      </div>

      <div className="access-bottom-grid">
        <div className="access-box">
          <h3>Processo usado</h3>
          <ol>
            {projection.process.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>

        <div className="access-box access-box-red">
          <h3>Próximos marcos</h3>
          <ul>
            {projection.milestones.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
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


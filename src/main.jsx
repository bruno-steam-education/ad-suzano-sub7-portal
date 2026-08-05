import React, { useState } from 'react';
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
  Newspaper,
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
import { ClubSiteExperience, SupporterRadio } from './clubSite';
import { categories } from './data/categories';
import { federationScheduleSource, initiationA2BaseSchedule } from './data/federationSchedule';
import { fpfsCategories } from './data/fpfsCategories';
import { newsItems, newsWeek } from './data/news';
import { youthLeagueCategories, youthLeagueCompetition } from './data/youthLeagueCategories';
import { isMobileDevice, isStandaloneApp, registerServiceWorker } from './services/pwa';
import { fetchSuzanoWeather } from './services/weather';
import { CategoryEfficiencyHeader } from './components/CategoryEfficiencyHeader';
import { AccessModal } from './components/AccessModal';
import { ProtectedSection } from './components/ProtectedSection';
import { GraphicalAnalysis } from './components/GraphicalAnalysis';
import FamilyPaymentPage from './components/FamilyPaymentPage';
import './styles.css';

registerServiceWorker();

function LegacyAthletePortalRedirect() {
  React.useEffect(() => { window.location.replace('/portal-do-atleta'); }, []);
  return null;
}

const fmtDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});

const appVersion = packageInfo.version;
const supporterPlaylistUrl = 'https://youtube.com/playlist?list=PLgwEymErdv_CKVwcZ7xY7IZ7nnRnc1TqM&si=nvwTyHLvLWB9V88c';

function StaffAccessBar({ isAuthenticated, onOpenModal, onLogout }) {
  return (
    <div className="staff-access-bar">
      <div className="staff-access-left">
        <a className="staff-back-club-btn" href="#/portal/home">
          <ChevronRight style={{ transform: 'rotate(180deg)' }} size={16} />
          <span>Voltar ao Site Oficial AD Suzano</span>
        </a>
        <div className={`staff-access-status ${isAuthenticated ? 'authenticated' : 'public'}`}>
          {isAuthenticated ? (
            <>
              <Shield size={16} />
              <span>Área Técnica Liberada • Comissão AD Suzano</span>
            </>
          ) : (
            <>
              <Activity size={16} />
              <span>Painel de Análise Tática</span>
            </>
          )}
        </div>
      </div>
      <div>
        {isAuthenticated ? (
          <button className="staff-access-btn logout-btn" type="button" onClick={onLogout}>
            <span>Sair / Bloquear</span>
          </button>
        ) : (
          <button className="staff-access-btn login-btn" type="button" onClick={onOpenModal}>
            <Shield size={14} />
            <span>Acesso Comissão Técnica</span>
          </button>
        )}
      </div>
    </div>
  );
}

function parseAppHash(hash = '') {
  const cleanHash = String(hash).replace(/^#\/?/, '').trim();
  if (cleanHash === 'analise' || cleanHash === 'analysis') {
    return { mode: 'analysis', path: '' };
  }

  if (cleanHash.startsWith('portal')) {
    return {
      mode: 'portal',
      path: cleanHash.replace(/^portal\/?/, '') || 'home',
    };
  }

  // Padrão: Site Oficial da AD Suzano
  return { mode: 'portal', path: 'home' };
}

function normalizeFpfsGame(game) {
  return {
    ...game,
    time: game.time?.replace('h', ':') ?? '',
  };
}


function timeWithOffset(time, offsetMinutes = 0) {
  if (!time || !time.includes(':')) return time ?? '';
  const [hour, minute] = time.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;
  const total = (hour * 60 + minute + offsetMinutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function categoryScheduleOffset(category) {
  return {
    'Sub-7': 0,
    'Sub-8': 60,
    'Sub-9': 120,
    'Sub-10': 180,
  }[category?.label] ?? 0;
}

function federationGameForCategory(baseGame, category) {
  const normalizeTeam = (team) => isSuzanoName(team) ? 'A.D. SUZANO' : team;
  return {
    ...baseGame,
    home: normalizeTeam(baseGame.home),
    away: normalizeTeam(baseGame.away),
    time: timeWithOffset(baseGame.time, categoryScheduleOffset(category)),
    source: federationScheduleSource.label,
    sourceFile: federationScheduleSource.file,
    projectedFromPdf: true,
  };
}

function sameFixture(a, b) {
  if (!a || !b || a.date !== b.date) return false;
  const teamsA = `${a.home} ${a.away}`.toUpperCase();
  const teamsB = `${b.home} ${b.away}`.toUpperCase();
  return teamsA.includes('SUZANO') && teamsB.includes('SUZANO');
}

function nextThreeCategoryGames(category, fpfsData, today = new Date()) {
  const official = (fpfsData?.upcomingGames ?? []).map(normalizeFpfsGame);
  const todayKey = today.toISOString().slice(0, 10);
  const canUseFederationPdf = ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10'].includes(category?.label);
  const federationGames = canUseFederationPdf
    ? initiationA2BaseSchedule
        .filter((game) => game.date >= todayKey)
        .map((game) => federationGameForCategory(game, category))
        .filter((game) => !official.some((officialGame) => sameFixture(officialGame, game)))
    : [];

  return [...official, ...federationGames]
    .sort((a, b) => `${a.date}T${a.time || '23:59'}`.localeCompare(`${b.date}T${b.time || '23:59'}`))
    .slice(0, 3);
}

function App() {
  const [appRoute, setAppRoute] = useState(() => parseAppHash(window.location.hash));
  const [activeCategoryId, setActiveCategoryId] = useState('sub7');
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('ad-suzano-staff-auth') === 'true';
  });
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  React.useEffect(() => {
    const syncDeviceOrientation = () => {
      const landscape = window.matchMedia?.('(orientation: landscape)').matches ?? window.innerWidth > window.innerHeight;
      document.documentElement.dataset.deviceOrientation = landscape ? 'landscape' : 'portrait';
    };
    syncDeviceOrientation();
    window.addEventListener('resize', syncDeviceOrientation, { passive: true });
    window.addEventListener('orientationchange', syncDeviceOrientation, { passive: true });
    try { window.screen?.orientation?.unlock?.(); } catch { /* browser may not expose orientation unlock */ }
    return () => {
      window.removeEventListener('resize', syncDeviceOrientation);
      window.removeEventListener('orientationchange', syncDeviceOrientation);
    };
  }, []);

  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];
  const activeFpfs = fpfsCategories.find((category) => category.category === activeCategory.label);
  const hasFpfsCategoryData = Boolean(activeFpfs?.recentGames?.length || activeFpfs?.upcomingGames?.length);
  const activeCategoryNextMatch = nextThreeCategoryGames(activeCategory, activeFpfs)[0];

  const handleLoginSuccess = () => {
    sessionStorage.setItem('ad-suzano-staff-auth', 'true');
    setIsAuthenticated(true);
    setIsAccessModalOpen(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ad-suzano-staff-auth');
    setIsAuthenticated(false);
  };

  const openAccessModal = () => setIsAccessModalOpen(true);

  const pathname = window.location.pathname.replace(/\/+$/, '');
  if (pathname === '/pagamento') {
    return <LegacyAthletePortalRedirect />;
  }
  if (pathname === '/portal-do-atleta') {
    return <FamilyPaymentPage />;
  }

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

  React.useEffect(() => {
    const syncRoute = () => setAppRoute(parseAppHash(window.location.hash));
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  if (appRoute.mode === 'portal') {
    return (
      <>
        <SupporterRadio />
        <ClubSiteExperience path={appRoute.path} />
      </>
    );
  }

  return (
    <>
      <SupporterRadio />
      <main className="app-shell">
      <StaffAccessBar
        isAuthenticated={isAuthenticated}
        onOpenModal={openAccessModal}
        onLogout={handleLogout}
      />
      <AccessModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
      <Hero
        category={activeCategory}
        record={activeFpfs?.record}
        nextMatch={activeCategoryNextMatch}
        hasData={hasFpfsCategoryData}
        weather={weather}
        weatherError={weatherError}
      />
      <InstallAppPrompt />
      <WeeklyAppNotice category={activeCategory} nextMatch={activeCategoryNextMatch} />
      <CategoryNav
        activeCategoryId={activeCategoryId}
        onSelect={setActiveCategoryId}
      />
      <ProtectedSection
        isAuthenticated={isAuthenticated}
        onOpenModal={openAccessModal}
        title="Análise Gráfica Automatizada"
        description="Campanha completa, evolução rodada a rodada e auditoria das fórmulas reservadas à Comissão Técnica da AD Suzano."
      >
        <GraphicalAnalysis
          categories={fpfsCategories}
          youthCategories={youthLeagueCategories}
          youthCompetition={youthLeagueCompetition}
          activeCategoryLabel={activeCategory.label}
        />
      </ProtectedSection>
      <CompleteCategoryDashboard
        category={activeCategory}
        fpfsData={activeFpfs}
        isAuthenticated={isAuthenticated}
        onOpenModal={openAccessModal}
      />
        <AppFooter />
      </main>
    </>
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
              <small>{hasFpfsData ? 'Completo' : category.status}</small>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function CompleteCategoryDashboard({ category, fpfsData, isAuthenticated, onOpenModal }) {
  const hasSuzanoGames = Boolean(fpfsData?.recentGames?.length || fpfsData?.upcomingGames?.length);
  const record = fpfsData?.record;
  const upcomingGames = nextThreeCategoryGames(category, fpfsData);
  const robot = categoryRobot(category, { ...fpfsData, upcomingGames });

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
              <strong>{upcomingGames.length} próximos jogos</strong>
              <span>Atualização automática via eventos.admfutsal.com.br.</span>
            </div>
          </div>
        </section>

        <ProtectedSection
          isAuthenticated={isAuthenticated}
          onOpenModal={onOpenModal}
          title={`Regulamento e Ranking Anual ${category.label}`}
          description="Leitura do Art. 135, classificação oficial e limites do que pode ser calculado com segurança."
        >
          <CategoryEfficiencyHeader category={category} />
        </ProtectedSection>
      </section>

      <NewsBanner category={category} />

      <section className="content-grid category-complete-grid">
        <div className="main-flow">
          <ProtectedSection
            isAuthenticated={isAuthenticated}
            onOpenModal={onOpenModal}
            title={`Contexto Oficial Pré-Jogo ${category.label}`}
            description={`Agenda, classificação do adversário e indicadores observados da categoria ${category.label}, sem probabilidades inventadas.`}
          >
            <CategoryNextGamesV2 category={category} games={upcomingGames} robot={robot} />
          </ProtectedSection>

          <CategoryStandingsMirror category={category} fpfsData={fpfsData} />

          <ProtectedSection
            isAuthenticated={isAuthenticated}
            onOpenModal={onOpenModal}
            title={`Situação Regulamentar ${category.label}`}
            description="Posição, campanha e limites do que pode ser concluído a partir das fontes oficiais."
          >
            <VerifiedCompetitionStatus category={category} fpfsData={fpfsData} robot={robot} />
          </ProtectedSection>

          <ProtectedSection
            isAuthenticated={isAuthenticated}
            onOpenModal={onOpenModal}
            title="Mesa Semanal da Comissão Técnica"
            description="Observações técnicas e boletim tático da comissão."
          >
            <CategoryWeeklyDesk category={category} />
          </ProtectedSection>

          <CategoryGamesPanel
            title="Últimos resultados"
            games={fpfsData?.recentGames ?? []}
            emptyText="Nenhum resultado do AD Suzano encontrado nesta categoria pela Súmula Online."
            showRoutes
          />
          <CategoryCampaign category={category} fpfsData={fpfsData} />
        </div>

        <aside className="side-flow">
          <CategorySchedulePlaceholder category={category} games={upcomingGames} />

          <ProtectedSection
            isAuthenticated={isAuthenticated}
            onOpenModal={onOpenModal}
            title="Auditoria do Robô"
            description="Métricas de integridade tática reservadas ao staff."
          >
            <CategoryRobotAudit category={category} robot={robot} />
          </ProtectedSection>

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
  const attackRate = played ? (record.goalsFor ?? 0) / played : 0;
  const defenseRate = played ? (record.goalsAgainst ?? 0) / played : 0;

  return {
    category,
    record,
    played,
    efficiency,
    efficiencyLabel: `${Math.round(efficiency * 100)}%`,
    recentWins,
    attackRate,
    defenseRate,
    upcomingGames,
    recentGames,
    standings: fpfsData?.standings ?? [],
    allRecentGames: fpfsData?.allRecentGames ?? [],
    freshness: fpfsData?.checkedAt ? new Date(fpfsData.checkedAt) : null,
  };
}

function opponentForCategoryGame(game) {
  return teamDisplayName(isSuzanoName(game.home) ? game.away : game.home);
}

function comparableTeamName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/A\.?\s*D\.?/gi, 'AD')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .replace(/\bFUTSAL\b/gi, '')
    .replace(/\bCLUBE\b/gi, '')
    .replace(/\bASSOCIACAO\b/gi, 'ASS')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function findTeamStanding(standings = [], teamName = '') {
  const target = comparableTeamName(teamName);
  if (!target) return null;
  return standings.find((standing) => {
    const candidate = comparableTeamName(standing.team);
    return candidate === target || candidate.includes(target) || target.includes(candidate);
  }) ?? null;
}

function findTeamLastGame(games = [], teamName = '', beforeDate) {
  const target = comparableTeamName(teamName);
  if (!target) return null;
  return games
    .filter((game) => Number.isFinite(game.homeGoals) && Number.isFinite(game.awayGoals))
    .filter((game) => !beforeDate || game.date <= beforeDate)
    .filter((game) => {
      const home = comparableTeamName(game.home);
      const away = comparableTeamName(game.away);
      return home === target || away === target || home.includes(target) || away.includes(target) || target.includes(home) || target.includes(away);
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .at(-1) ?? null;
}

function formatOpponentStanding(standing) {
  if (!standing) return null;
  const saldo = standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference ?? 0;
  return `Adversário na tabela: ${teamDisplayName(standing.team)} está em ${standing.positionLabel ?? `${standing.position}º`} lugar, com ${standing.points ?? 0} pontos, ${standing.played ?? 0} jogos e saldo ${saldo}.`;
}

function formatOpponentLastGame(game, opponent) {
  if (!game) return null;
  const opponentHome = comparableTeamName(game.home) === comparableTeamName(opponent);
  const goalsFor = opponentHome ? game.homeGoals : game.awayGoals;
  const goalsAgainst = opponentHome ? game.awayGoals : game.homeGoals;
  const rival = opponentHome ? game.away : game.home;
  const result = goalsFor > goalsAgainst ? 'venceu' : goalsFor === goalsAgainst ? 'empatou' : 'perdeu';
  return `Último jogo do adversário: ${teamDisplayName(opponent)} ${result} por ${goalsFor} x ${goalsAgainst} contra ${teamDisplayName(rival)}.`;
}

function categoryMatchContext(category, game, robot) {
  const latest = robot.recentGames.at(-1);
  const latestText = latest
    ? `vem de ${isSuzanoName(latest.home) ? latest.homeGoals : latest.awayGoals} x ${isSuzanoName(latest.home) ? latest.awayGoals : latest.homeGoals} contra ${opponentForCategoryGame(latest)}`
    : 'ainda nao tem resultado recente localizado';
  const opponent = opponentForCategoryGame(game);
  const opponentStanding = game.opponentStanding ?? findTeamStanding(robot.standings, opponent);
  const opponentLastGame = game.opponentLastGame ?? findTeamLastGame(robot.allRecentGames, opponent, game.date);

  return {
    opponent,
    reasons: [
      `${category.label} ${latestText}.`,
      formatOpponentStanding(opponentStanding),
      formatOpponentLastGame(opponentLastGame, opponent),
      `Campanha: ${robot.record.points ?? 0} pontos, ${robot.efficiencyLabel} de aproveitamento e saldo ${robot.record.goalDifference > 0 ? `+${robot.record.goalDifference}` : robot.record.goalDifference ?? 0}.`,
      `Medias: ${robot.attackRate.toFixed(1)} gols feitos e ${robot.defenseRate.toFixed(1)} sofridos por jogo na FPFS.`,
    ].filter(Boolean),
  };
}

function categoryAudit(robot) {
  const checkedAt = robot.freshness;
  const ageHours = checkedAt ? (Date.now() - checkedAt.getTime()) / 36e5 : Infinity;
  const record = robot.record;
  const campaignIsConsistent = Number(record.played ?? 0) === Number(record.wins ?? 0) + Number(record.draws ?? 0) + Number(record.losses ?? 0)
    && Number(record.points ?? 0) === Number(record.wins ?? 0) * 3 + Number(record.draws ?? 0)
    && Number(record.goalDifference ?? 0) === Number(record.goalsFor ?? 0) - Number(record.goalsAgainst ?? 0);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return [
    { label: 'Campanha fecha com V + E + D e 3V + E', ok: campaignIsConsistent },
    { label: 'AD Suzano localizada na classificação', ok: robot.standings.some((standing) => isSuzanoName(standing.team)) },
    { label: 'Agenda contém apenas datas futuras', ok: robot.upcomingGames.every((game) => game.date >= today) },
    { label: 'Fonte FPFS consultada nas últimas 12 horas', ok: ageHours <= 12 },
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
          : `${category.label} perde por ${score} para ${opponent}, mas mantém campanha em pauta`;

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

function CategoryStandingsMirror({ category, fpfsData }) {
  const standings = fpfsData?.standings ?? [];
  const suzanoPosition = standings.find((item) => isSuzanoName(item.team));

  return (
    <section className="panel standings-panel">
      <div className="section-title">
        <div>
          <span>Tabela Paulista A2</span>
          <h2>Tabela espelho {category.label}</h2>
        </div>
        <BarChart3 size={22} />
      </div>
      {standings.length ? (
        <>
          {suzanoPosition && (
            <p className="standings-summary">
              AD Suzano aparece em {suzanoPosition.positionLabel ?? `${suzanoPosition.position}o`} lugar, com {suzanoPosition.points} pontos, {suzanoPosition.played} jogos e saldo {suzanoPosition.goalDifference > 0 ? `+${suzanoPosition.goalDifference}` : suzanoPosition.goalDifference}.
            </p>
          )}
          <div className="standings-table-wrap">
            <table className="standings-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Clube</th>
                  <th>Pts</th>
                  <th>J</th>
                  <th>V</th>
                  <th>E</th>
                  <th>D</th>
                  <th>GP</th>
                  <th>GC</th>
                  <th>SG</th>
                  <th>IT</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr className={isSuzanoName(row.team) ? 'suzano-row' : ''} key={`${category.id}-${row.position}-${row.team}`}>
                    <td>{row.positionLabel ?? row.position}</td>
                    <td>{teamDisplayName(row.team)}</td>
                    <td>{row.points}</td>
                    <td>{row.played}</td>
                    <td>{row.wins}</td>
                    <td>{row.draws}</td>
                    <td>{row.losses}</td>
                    <td>{row.goalsFor}</td>
                    <td>{row.goalsAgainst}</td>
                    <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                    <td>{row.technicalIndex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="standings-summary">Tabela ainda nao localizada na Sumula Online da FPFS para esta categoria.</p>
      )}
    </section>
  );
}

function CategoryNextGamesV2({ category, games, robot }) {
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <span>Agenda oficial verificada</span>
          <h2>Próximos confrontos</h2>
        </div>
        <Shield size={22} />
      </div>

      {games.length ? (
        <div className="match-list">
          {games.slice(0, 3).map((game) => {
            const context = categoryMatchContext(category, game, robot);
            const opponentStanding = game.opponentStanding ?? findTeamStanding(robot.standings, context.opponent);
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
                  {game.projectedFromPdf && (
                    <li>Fonte complementar: tabela oficial enviada ({game.sourceFile}).</li>
                  )}
                  {context.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
              <div className="match-verification">
                <span>Contexto oficial</span>
                <strong>{opponentStanding?.positionLabel ?? (opponentStanding?.position ? `${opponentStanding.position}º` : 'Sem posição')}</strong>
                <small>{opponentStanding ? 'posição atual do adversário' : 'classificação não vinculada'}</small>
                <em>Sem percentual preditivo</em>
              </div>
            </article>
            );
          })}
        </div>
      ) : (
        <div className="verified-empty-state">
          <Shield size={22} />
          <div>
            <strong>Nenhum compromisso futuro confirmado</strong>
            <p>O robô não reaproveita jogos passados nem cria adversários. A agenda aparecerá quando a FPFS publicar o confronto.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function VerifiedCompetitionStatus({ category, fpfsData, robot }) {
  const ownStanding = fpfsData?.standings?.find((standing) => isSuzanoName(standing.team));
  const leader = fpfsData?.standings?.[0];
  const record = robot.record;

  return (
    <section className="panel verified-competition-status">
      <div className="section-title">
        <div>
          <span>Somente dados demonstráveis</span>
          <h2>Situação oficial do {category.label}</h2>
        </div>
        <Shield size={22} />
      </div>

      <div className="verified-status-grid">
        <article>
          <span>Classificação atual</span>
          <strong>{ownStanding?.positionLabel ?? (ownStanding?.position ? `${ownStanding.position}º` : 'Não localizada')}</strong>
          <p>{record.points ?? 0} pontos em {record.played ?? 0} jogos.</p>
        </article>
        <article>
          <span>Liderança da tabela</span>
          <strong>{leader ? `${leader.points} pontos` : 'Não localizada'}</strong>
          <p>{leader ? teamDisplayName(leader.team) : 'Aguardando a classificação oficial.'}</p>
        </article>
        <article>
          <span>Agenda futura confirmada</span>
          <strong>{robot.upcomingGames.length} {robot.upcomingGames.length === 1 ? 'jogo' : 'jogos'}</strong>
          <p>Somente partidas com data atual ou futura publicadas na fonte oficial.</p>
        </article>
      </div>

      <div className="verified-conclusion-grid">
        <article>
          <span>Título da categoria</span>
          <strong>Sem percentual publicado</strong>
          <p>A posição na fase atual não basta para calcular título sem o regulamento específico completo, fases e critérios de desempate aplicáveis.</p>
        </article>
        <article>
          <span>Acesso do clube à A1</span>
          <strong>Depende do Ranking Anual</strong>
          <p>O Art. 135 prevê duas vagas para os dois primeiros clubes da A2. Uma categoria isolada não define o acesso.</p>
        </article>
      </div>

      <p className="verified-method-note">
        O portal deixou de transformar aproveitamento e saldo em probabilidades. Esses números continuam disponíveis como indicadores de campanha,
        mas não são tratados como chance de vitória, título, acesso ou queda.
      </p>
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
      <p>Última leitura FPFS: {checkedAt}. O robô confere integridade, classificação, datas futuras e atualidade da fonte antes de publicar.</p>
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
  const next = nextThreeCategoryGames(category, fpfsData)[0];
  const recent = (fpfsData?.playedGames ?? fpfsData?.recentGames ?? []).slice(-5);
  const latest = recent.at(-1);
  const form = recent.reduce((summary, game) => {
    const suzanoHome = isSuzanoName(game.home);
    const goalsFor = suzanoHome ? game.homeGoals : game.awayGoals;
    const goalsAgainst = suzanoHome ? game.awayGoals : game.homeGoals;
    summary.goalsFor += goalsFor;
    summary.goalsAgainst += goalsAgainst;
    if (goalsFor > goalsAgainst) summary.wins += 1;
    else if (goalsFor === goalsAgainst) summary.draws += 1;
    else summary.losses += 1;
    return summary;
  }, { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 });
  const checkedAt = fpfsData?.checkedAt
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date(fpfsData.checkedAt))
    : 'sem horário registrado';
  const nextOpponent = next ? teamDisplayName(isSuzanoName(next.home) ? next.away : next.home) : null;

  return (
    <section className="panel weekly-panel">
      <div className="section-title">
        <div>
          <span>Robô FPFS · atualizado em {checkedAt}</span>
          <h2>Mesa de análise semanal</h2>
        </div>
        <CalendarDays size={22} />
      </div>
      <div className="weekly-copy muted-weekly-copy">
        <strong>{next ? `Próximo compromisso: ${category.label} x ${nextOpponent}` : `${category.label}: sem novo compromisso confirmado`}</strong>
        <p>
          {latest
            ? `Último resultado oficial: ${teamDisplayName(latest.home)} ${latest.homeGoals} x ${latest.awayGoals} ${teamDisplayName(latest.away)}, em ${formatShortDate(latest.date)}.`
            : 'Nenhum resultado oficial foi localizado para formar o recorte semanal.'}
        </p>
      </div>
      <div className="focus-grid">
        {[
          recent.length ? `Últimos ${recent.length}: ${form.wins}V, ${form.draws}E e ${form.losses}D` : 'Recorte recente ainda indisponível',
          recent.length ? `Gols no recorte: ${form.goalsFor} feitos e ${form.goalsAgainst} sofridos` : 'Gols aguardando resultados oficiais',
          next ? `Agenda: ${formatShortDate(next.date)}, ${next.time || 'horário a confirmar'}, contra ${nextOpponent}` : 'Agenda: nenhuma partida futura publicada',
        ].map((item) => (
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

function WeeklyAppNotice({ category, nextMatch }) {
  const opponent = nextMatch
    ? teamDisplayName(isSuzanoName(nextMatch.home) ? nextMatch.away : nextMatch.home)
    : null;

  return (
    <section className="weekly-app-notice" aria-label={`Aviso da semana ${category.label}`}>
      <div>
        <strong>Agenda {category.label} atualizada</strong>
        <span>
          {nextMatch
            ? `Próximo compromisso contra ${opponent}, em ${formatShortDate(nextMatch.date)}, às ${nextMatch.time || 'horário a confirmar'}.`
            : `Campanha, resultados e indicadores do ${category.label} sincronizados com as fontes oficiais.`}
        </span>
      </div>
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

function NewsBanner({ category }) {
  const fpfsData = fpfsCategories.find((item) => item.category === category.label);
  const latest = fpfsData?.recentGames?.at(-1);
  const next = nextThreeCategoryGames(category, fpfsData)[0];
  const generated = categorySportsNews(category, latest, next, fpfsData?.record);
  const categoryNews = newsItems.filter(
    (item) => item.category === category.label || item.scope === `AD Suzano ${category.label}`,
  );
  const generalNews = newsItems.filter((item) => item.category === 'AD Suzano');
  const generatedLead = {
    id: `radar-${category.id}`,
    category: category.label,
    date: latest?.date ?? next?.date ?? fpfsData?.checkedAt?.slice(0, 10) ?? newsWeek,
    source: generated.source,
    title: generated.title,
    summary: generated.summary,
    impact: generated.impact,
    url: latest?.summaryUrl ?? fpfsData?.gamesUrl,
  };
  const lead = categoryNews[0] ?? generatedLead;
  const orderedNews = [
    lead,
    ...categoryNews.slice(1),
    ...generalNews,
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index);
  const featureItems = orderedNews.slice(1, 5);
  const topics = [category.label, 'AD Suzano'];
  const radarDate = orderedNews
    .map((item) => item.date)
    .filter(Boolean)
    .sort()
    .at(-1) ?? newsWeek;

  return (
    <section className="newsroom" aria-labelledby={`news-title-${category.id}`}>
      <header className="newsroom-header">
        <div className="newsroom-brand">
          <span className="newsroom-icon" aria-hidden="true"><Newspaper size={22} /></span>
          <div>
            <span>AD Suzano Notícias</span>
            <h2 id={`news-title-${category.id}`}>Radar da semana · {category.label}</h2>
          </div>
        </div>
        <div className="newsroom-edition">
          <span><i aria-hidden="true" /> Boletim atualizado</span>
          <strong>{orderedNews.length} {orderedNews.length === 1 ? 'notícia' : 'notícias'} · atualizado em {formatShortDate(radarDate)}</strong>
        </div>
      </header>

      <nav className="newsroom-topics" aria-label="Editorias do radar">
        <strong>Últimas</strong>
        {topics.map((topic) => <span key={topic}>{topic}</span>)}
        <span>Paulista A2</span>
        <span>FPFS</span>
      </nav>

      <div className="newsroom-layout">
        <motion.article
          className="newsroom-lead"
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45 }}
        >
          <div className="newsroom-lead-visual" aria-hidden="true">
            <span>Notícia em destaque</span>
            <img src={suzanoLogo} alt="" />
            <strong>AD SUZANO<br />FUTSAL</strong>
          </div>
          <div className="newsroom-lead-copy">
            <div className="newsroom-meta">
              <span>{lead.category}</span>
              <time dateTime={lead.date}>{formatEditorialDate(lead.date)}</time>
              <small>{lead.source}</small>
            </div>
            <h3>{lead.title}</h3>
            <p>{lead.summary}</p>
            <div className="newsroom-impact">
              <span>Em números</span>
              <strong>{lead.impact}</strong>
            </div>
            <NewsLink item={lead} featured />
          </div>
        </motion.article>

        <aside className="newsroom-stream" aria-label="Outras notícias da semana">
          <div className="newsroom-stream-title">
            <div>
              <span>Agora no radar</span>
              <h3>Mais notícias</h3>
            </div>
            <strong>{String(featureItems.length).padStart(2, '0')}</strong>
          </div>
          {featureItems.map((item) => (
            <motion.article
              className="newsroom-brief"
              key={item.id}
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <div className="newsroom-brief-thumb" aria-hidden="true">
                <img src={suzanoLogo} alt="" />
              </div>
              <div className="newsroom-brief-copy">
                <div className="newsroom-meta">
                  <span>{item.category}</span>
                  <time dateTime={item.date}>{formatEditorialDate(item.date)}</time>
                </div>
                <h4>{item.title}</h4>
                <p>{item.summary}</p>
                <NewsLink item={item} />
              </div>
            </motion.article>
          ))}
          {featureItems.length === 0 ? (
            <div className="newsroom-empty">
              <Newspaper size={24} />
              <strong>Próxima atualização em preparação</strong>
              <span>O radar automático publicará as novas chamadas aqui.</span>
            </div>
          ) : null}
        </aside>
      </div>

      <footer className="newsroom-footer">
        <strong>Informação oficial e cobertura regional</strong>
        <span>Resultados conferidos na súmula · notícias com fonte identificada</span>
      </footer>
    </section>
  );
}

function NewsLink({ item, featured = false }) {
  if (!item.url) {
    return <span className="source-chip">{item.source}</span>;
  }

  return (
    <a className={`source-chip${featured ? ' source-chip-featured' : ''}`} href={item.url} target="_blank" rel="noreferrer">
      {featured ? 'Ler matéria completa' : 'Ler notícia'}
      <ChevronRight size={15} aria-hidden="true" />
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

function formatEditorialDate(value) {
  if (!value) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`))
    .replace('.', '');
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

function iconForSchedule(type) {
  if (type === 'Mental') return <Brain size={16} />;
  if (type === 'Jogo oficial') return <Trophy size={16} />;
  if (type === 'Goleiros') return <Shield size={16} />;
  return <Activity size={16} />;
}

/* Componentes legados de projeção foram desativados. Mantidos temporariamente
   apenas no histórico Git; não entram no bundle nem podem voltar à interface. */
/*
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
                  {game.projectedFromPdf && (
                    <li>Fonte complementar: tabela enviada pela Federacao ({game.sourceFile}).</li>
                  )}
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

*/

createRoot(document.getElementById('root')).render(<App />);


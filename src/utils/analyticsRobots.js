const CLUB_TOKEN = 'SUZANO';

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function isSuzano(team = '') {
  return String(team).toUpperCase().includes(CLUB_TOKEN);
}

export function pointsFromResult(goalsFor, goalsAgainst) {
  if (!isFiniteNumber(goalsFor) || !isFiniteNumber(goalsAgainst)) return 0;
  if (Number(goalsFor) > Number(goalsAgainst)) return 3;
  if (Number(goalsFor) === Number(goalsAgainst)) return 1;
  return 0;
}

export function efficiencyPercent(points, played, precision = 1) {
  if (!isFiniteNumber(points) || !isFiniteNumber(played) || Number(played) <= 0) return 0;
  const factor = 10 ** precision;
  return Math.round((Number(points) / (Number(played) * 3)) * 100 * factor) / factor;
}

export function deriveRecordFromGames(games = []) {
  const record = games.reduce((total, game) => {
    if (!isFiniteNumber(game.homeGoals) || !isFiniteNumber(game.awayGoals)) return total;
    const home = isSuzano(game.home);
    const away = isSuzano(game.away);
    if (!home && !away) return total;

    const goalsFor = Number(home ? game.homeGoals : game.awayGoals);
    const goalsAgainst = Number(home ? game.awayGoals : game.homeGoals);
    const points = pointsFromResult(goalsFor, goalsAgainst);

    total.played += 1;
    total.wins += points === 3 ? 1 : 0;
    total.draws += points === 1 ? 1 : 0;
    total.losses += points === 0 ? 1 : 0;
    total.goalsFor += goalsFor;
    total.goalsAgainst += goalsAgainst;
    total.points += points;
    return total;
  }, {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  });

  return {
    ...record,
    goalDifference: record.goalsFor - record.goalsAgainst,
    efficiency: efficiencyPercent(record.points, record.played),
  };
}

function campaignGames(category = {}) {
  if (category.playedGames?.length) return category.playedGames;
  return category.recentGames ?? [];
}

function categoryPosition(category = {}) {
  const ownStanding = (category.standings ?? []).find((standing) => isSuzano(standing.team));
  return ownStanding?.position ?? null;
}

function compareRecords(source = {}, derived = {}) {
  const fields = ['played', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'points', 'goalDifference'];
  return fields.filter((field) => Number(source[field] ?? 0) !== Number(derived[field] ?? 0));
}

export function buildCategoryAnalytics(category = {}) {
  const games = campaignGames(category)
    .filter((game) => isFiniteNumber(game.homeGoals) && isFiniteNumber(game.awayGoals))
    .sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`));
  const derived = deriveRecordFromGames(games);
  const source = category.record ?? {};
  const hasCompleteCampaign = games.length === Number(source.played ?? 0);
  const record = hasCompleteCampaign ? derived : {
    ...source,
    efficiency: efficiencyPercent(source.points, source.played),
  };
  const mismatches = hasCompleteCampaign ? compareRecords(source, derived) : ['campaignGames'];

  let cumulativePoints = 0;
  const rounds = games.map((game, index) => {
    const home = isSuzano(game.home);
    const goalsFor = Number(home ? game.homeGoals : game.awayGoals);
    const goalsAgainst = Number(home ? game.awayGoals : game.homeGoals);
    const points = pointsFromResult(goalsFor, goalsAgainst);
    cumulativePoints += points;
    return {
      round: index + 1,
      date: game.date,
      opponent: home ? game.away : game.home,
      venue: home ? 'Casa' : 'Fora',
      goalsFor,
      goalsAgainst,
      points,
      cumulativePoints,
      cumulativeEfficiency: efficiencyPercent(cumulativePoints, index + 1),
    };
  });

  const recent = rounds.slice(-5);
  const recentPoints = recent.reduce((sum, round) => sum + round.points, 0);

  return {
    category: category.category,
    position: categoryPosition(category),
    record,
    rounds,
    efficiency: efficiencyPercent(record.points, record.played),
    recentEfficiency: efficiencyPercent(recentPoints, recent.length),
    attackRate: record.played ? record.goalsFor / record.played : 0,
    defenseRate: record.played ? record.goalsAgainst / record.played : 0,
    checkedAt: category.checkedAt ?? null,
    source: category.source ?? 'FPFS Súmula Online',
    audit: {
      status: mismatches.length === 0 ? 'verified' : 'review',
      completeCampaign: hasCompleteCampaign,
      mismatches,
    },
  };
}

export function buildAnalyticsSnapshot(categories = []) {
  const categoriesAnalytics = categories.map(buildCategoryAnalytics);
  const sumCategories = (items) => items.reduce((sum, category) => ({
    played: sum.played + Number(category.record.played ?? 0),
    points: sum.points + Number(category.record.points ?? 0),
    goalsFor: sum.goalsFor + Number(category.record.goalsFor ?? 0),
    goalsAgainst: sum.goalsAgainst + Number(category.record.goalsAgainst ?? 0),
  }), { played: 0, points: 0, goalsFor: 0, goalsAgainst: 0 });
  const totals = sumCategories(categoriesAnalytics);
  const initiationTotals = sumCategories(categoriesAnalytics.filter((item) => ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10'].includes(item.category)));
  const baseTotals = sumCategories(categoriesAnalytics.filter((item) => ['Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'].includes(item.category)));
  const completeTotals = (value) => ({
    ...value,
    goalDifference: value.goalsFor - value.goalsAgainst,
    efficiency: efficiencyPercent(value.points, value.played),
  });
  const latestCheck = categoriesAnalytics
    .map((category) => category.checkedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
  const verified = categoriesAnalytics.filter((category) => category.audit.status === 'verified').length;

  return {
    categories: categoriesAnalytics,
    totals: completeTotals(totals),
    segments: {
      initiation: completeTotals(initiationTotals),
      base: completeTotals(baseTotals),
    },
    audit: {
      verified,
      total: categoriesAnalytics.length,
      status: verified === categoriesAnalytics.length ? 'verified' : 'review',
    },
    latestCheck,
  };
}

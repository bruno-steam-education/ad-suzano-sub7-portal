import { contextualResults, matches, teamName } from '../data/season';

const played = (match) => Number.isFinite(match.homeGoals) && Number.isFinite(match.awayGoals);

export function allPlayedMatches() {
  return [...matches, ...contextualResults].filter(played);
}

export function teamRecord(team, sourceMatches = allPlayedMatches()) {
  const record = {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    recent: [],
  };

  sourceMatches.forEach((match) => {
    const isHome = match.home === team;
    const isAway = match.away === team;
    if (!isHome && !isAway) return;

    const goalsFor = isHome ? match.homeGoals : match.awayGoals;
    const goalsAgainst = isHome ? match.awayGoals : match.homeGoals;
    const result = goalsFor > goalsAgainst ? 'V' : goalsFor === goalsAgainst ? 'E' : 'D';

    record.played += 1;
    record.goalsFor += goalsFor;
    record.goalsAgainst += goalsAgainst;
    record.wins += result === 'V' ? 1 : 0;
    record.draws += result === 'E' ? 1 : 0;
    record.losses += result === 'D' ? 1 : 0;
    record.points += result === 'V' ? 3 : result === 'E' ? 1 : 0;
    record.recent.push({ ...match, result, goalsFor, goalsAgainst });
  });

  record.goalDifference = record.goalsFor - record.goalsAgainst;
  record.pointsPerGame = record.played ? record.points / record.played : 0;
  record.attackRate = record.played ? record.goalsFor / record.played : 0;
  record.defenseRate = record.played ? record.goalsAgainst / record.played : 0;
  return record;
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function strengthScore(record) {
  return (
    record.pointsPerGame * 12 +
    record.goalDifference * 0.8 +
    record.attackRate * 4 -
    record.defenseRate * 3
  );
}

export function nextMatches(today = new Date()) {
  const todayKey = today.toISOString().slice(0, 10);
  return matches
    .filter((match) => !played(match) && match.date >= todayKey)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

export function suzanoMatches() {
  return matches.filter((match) => match.home === teamName || match.away === teamName);
}

export function suzanoRecord() {
  return teamRecord(teamName, matches.filter(played));
}

export function opponentFor(match) {
  return match.home === teamName ? match.away : match.home;
}

export function predictMatch(match) {
  const opponent = opponentFor(match);
  const suzano = teamRecord(teamName);
  const rival = teamRecord(opponent);
  const homeBoost = match.home === teamName ? 3.5 : -2.2;
  const recentBoost = suzano.recent.slice(-4).filter((game) => game.result === 'V').length * 1.7;
  const delta = strengthScore(suzano) - strengthScore(rival) + homeBoost + recentBoost;
  const chance = Math.round(Math.min(82, Math.max(18, sigmoid(delta / 18) * 100)));

  return {
    chance,
    opponent,
    suzano,
    rival,
    reasons: buildReasons(opponent, suzano, rival, match),
  };
}

function buildReasons(opponent, suzano, rival, match) {
  const reasons = [];
  const lastSuzano = suzano.recent.at(-1);
  const direct = suzano.recent.find((game) => opponentFor(game) === opponent);

  if (lastSuzano) {
    reasons.push(`Suzano vem de ${lastSuzano.goalsFor} x ${lastSuzano.goalsAgainst} contra ${opponentFor(lastSuzano)}.`);
  }

  if (direct) {
    reasons.push(`Ja houve confronto direto: Suzano ${direct.goalsFor} x ${direct.goalsAgainst} ${opponent}.`);
  }

  const bridge = allPlayedMatches().find((game) => {
    const suzanoBeat = suzano.recent.some(
      (sGame) => sGame.result === 'V' && (sGame.home === game.home || sGame.home === game.away || sGame.away === game.home || sGame.away === game.away),
    );
    const rivalInGame = game.home === opponent || game.away === opponent;
    return suzanoBeat && rivalInGame;
  });

  if (bridge) {
    const bridgeWinner = bridge.homeGoals > bridge.awayGoals ? bridge.home : bridge.awayGoals > bridge.homeGoals ? bridge.away : 'empate';
    reasons.push(`Relacao indireta: ${bridge.home} ${bridge.homeGoals} x ${bridge.awayGoals} ${bridge.away}, com vantagem para ${bridgeWinner}.`);
  }

  if (match.home === teamName) {
    reasons.push('Jogo no SESC Suzano aumenta previsibilidade de rotina e apoio.');
  }

  if (rival.played) {
    reasons.push(`${opponent} tem media de ${rival.attackRate.toFixed(1)} gols feitos e ${rival.defenseRate.toFixed(1)} sofridos nos dados mapeados.`);
  }

  return reasons.slice(0, 4);
}

export function mondayAnalysisDate(today = new Date()) {
  const date = new Date(today);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

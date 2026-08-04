const CLUB_TOKEN = 'SUZANO';

function teamKey(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .replace(/\bFUTSAL\b/gi, '')
    .replace(/\bCLUBE\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

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
    const home = isSuzano(game.home);
    const away = isSuzano(game.away);
    if (!home && !away) return total;

    if (!isFiniteNumber(game.homeGoals) || !isFiniteNumber(game.awayGoals)) {
      if (!isFiniteNumber(game.suzanoPoints)) return total;
      const points = Number(game.suzanoPoints);
      total.played += 1;
      total.wins += points === 3 ? 1 : 0;
      total.draws += points === 1 ? 1 : 0;
      total.losses += points === 0 ? 1 : 0;
      total.points += points;
      return total;
    }

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
    .filter((game) => (
      (isFiniteNumber(game.homeGoals) && isFiniteNumber(game.awayGoals))
      || isFiniteNumber(game.suzanoPoints)
    ))
    .sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`));
  const derived = deriveRecordFromGames(games);
  const source = category.record ?? {};
  const hasCompleteCampaign = games.length === Number(source.played ?? 0);
  const record = hasCompleteCampaign ? derived : {
    ...source,
    efficiency: efficiencyPercent(source.points, source.played),
  };
  const mismatches = hasCompleteCampaign ? compareRecords(source, derived) : ['campaignGames'];

  const ownPosition = categoryPosition(category);
  const standingsByTeam = new Map((category.standings ?? []).map((standing) => [teamKey(standing.team), standing]));
  let cumulativePoints = 0;
  const rounds = games.map((game, index) => {
    const home = isSuzano(game.home);
    const opponent = home ? game.away : game.home;
    const opponentStanding = standingsByTeam.get(teamKey(opponent));
    const hasScore = isFiniteNumber(game.homeGoals) && isFiniteNumber(game.awayGoals);
    const goalsFor = hasScore ? Number(home ? game.homeGoals : game.awayGoals) : null;
    const goalsAgainst = hasScore ? Number(home ? game.awayGoals : game.homeGoals) : null;
    const points = isFiniteNumber(game.suzanoPoints)
      ? Number(game.suzanoPoints)
      : pointsFromResult(goalsFor, goalsAgainst);
    cumulativePoints += points;
    return {
      round: index + 1,
      date: game.date,
      opponent,
      opponentPosition: opponentStanding?.position ?? null,
      opponentRankRelation: Number.isFinite(opponentStanding?.position) && Number.isFinite(ownPosition)
        ? opponentStanding.position > ownPosition ? 'lower' : opponentStanding.position < ownPosition ? 'higher' : 'same'
        : 'unknown',
      venue: home ? 'Casa' : 'Fora',
      goalsFor,
      goalsAgainst,
      scoreLabel: game.scoreLabel ?? null,
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

function resultCounts(rounds) {
  return rounds.reduce((total, round) => {
    if (round.points === 3) total.wins += 1;
    else if (round.points === 1) total.draws += 1;
    else total.losses += 1;
    return total;
  }, { wins: 0, draws: 0, losses: 0 });
}

function percentage(value) {
  return `${String(value).replace('.', ',')}%`;
}

function countLabel(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function buildYouthDevelopmentAgent(analytics) {
  const recent = analytics?.rounds?.slice(-5) ?? [];
  const form = resultCounts(recent);
  const recentPoints = recent.reduce((sum, round) => sum + round.points, 0);
  const losses = recent.filter((round) => round.points === 0);
  const lowerRankedLosses = losses.filter((round) => round.opponentRankRelation === 'lower');
  const higherRankedLosses = losses.filter((round) => round.opponentRankRelation === 'higher');
  const awayLosses = losses.filter((round) => round.venue === 'Fora');
  const recentGoalsAgainst = recent.reduce((sum, round) => sum + round.goalsAgainst, 0);
  const recentGoalsFor = recent.reduce((sum, round) => sum + round.goalsFor, 0);
  const recentDefenseRate = recent.length ? recentGoalsAgainst / recent.length : 0;
  const defenseDelta = analytics?.defenseRate
    ? ((recentDefenseRate - analytics.defenseRate) / analytics.defenseRate) * 100
    : 0;
  const isDevelopingPlayer = ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10', 'Sub-12'].includes(analytics?.category);
  const poorForm = recent.length >= 4 && form.losses >= 3;
  const rankingContext = lowerRankedLosses.length
    ? `${countLabel(lowerRankedLosses.length, 'derrota foi', 'derrotas foram')} contra ${lowerRankedLosses.length === 1 ? 'adversário atualmente abaixo' : 'adversários atualmente abaixo'} do ${analytics.category} na tabela: ${lowerRankedLosses.map((round) => `${round.opponent} (${round.opponentPosition}º)`).join(', ')}.`
    : 'Nenhuma derrota do recorte foi contra adversário atualmente abaixo da equipe na tabela.';
  const strongerContext = higherRankedLosses.length
    ? `${countLabel(higherRankedLosses.length, 'derrota ocorreu', 'derrotas ocorreram')} contra ${higherRankedLosses.length === 1 ? 'equipe atualmente acima' : 'equipes atualmente acima'} na classificação.`
    : 'O recorte não contém derrota para equipe atualmente acima na classificação.';
  const formSummary = recent.length
    ? `Nos últimos ${recent.length} jogos: ${countLabel(form.wins, 'vitória', 'vitórias')}, ${countLabel(form.draws, 'empate', 'empates')} e ${countLabel(form.losses, 'derrota', 'derrotas')}, com ${recentPoints} de ${recent.length * 3} pontos possíveis (${percentage(efficiencyPercent(recentPoints, recent.length))}).`
    : 'Ainda não há cinco partidas completas para formar um recorte recente.';

  const attentionCards = [
    {
      id: 'emotional',
      tone: poorForm ? 'attention' : 'stable',
      label: 'Hipótese a verificar',
      title: 'Confiança e resposta após o erro',
      finding: poorForm
        ? `A sequência tem ${countLabel(form.losses, 'derrota', 'derrotas')} em ${recent.length} partidas. Isso justifica observar reação ao erro e confiança, mas o placar sozinho não comprova causa emocional.`
        : 'O recorte recente não mostra uma sequência longa de derrotas. Ainda assim, vale acompanhar comunicação, diversão e reação ao erro.',
      actions: [
        'Fazer um check-in curto e lúdico antes do treino, sem expor respostas individuais.',
        'Elogiar decisão, esforço e cooperação antes de comentar o resultado.',
        'Se houver mudança persistente de comportamento, envolver responsáveis e profissional qualificado.',
      ],
    },
    {
      id: 'training',
      tone: defenseDelta > 15 ? 'attention' : 'develop',
      label: 'Pista de treinamento',
      title: isDevelopingPlayer ? 'Técnica, decisão e jogos reduzidos' : 'Progressão técnico-tática',
      finding: defenseDelta > 15
        ? `A equipe sofreu ${recentDefenseRate.toFixed(1).replace('.', ',')} ${recentDefenseRate === 1 ? 'gol' : 'gols'} por jogo no recorte, ${Math.round(Math.abs(defenseDelta))}% acima da média da campanha. Vale revisar reação à perda e proteção do gol em situações de jogo.`
        : `A média recente de gols sofridos (${recentDefenseRate.toFixed(1).replace('.', ',')}) está próxima ou abaixo da campanha. O foco pode permanecer na qualidade das decisões e na criação de oportunidades.`,
      actions: isDevelopingPlayer
        ? ['Usar jogos 2x2 e 3x3 com poucas regras e muitas ações com bola.', 'Treinar reação à perda em blocos curtos, terminando com jogo livre.', 'Fazer perguntas simples para a criança encontrar soluções, evitando excesso de instruções.']
        : ['Progredir do fundamento para situações com oposição e jogo aplicado.', 'Reproduzir transições e coberturas com restrições realistas.', 'Manter o tema central do treino e aumentar a complexidade gradualmente.'],
    },
    {
      id: 'context',
      tone: awayLosses.length >= 3 ? 'attention' : 'context',
      label: 'Contexto externo',
      title: 'Mando, rotina e condições da partida',
      finding: losses.length
        ? `${awayLosses.length} de ${countLabel(losses.length, 'derrota recente', 'derrotas recentes')} ${awayLosses.length === 1 ? 'ocorreu' : 'ocorreram'} fora de casa. A base atual não informa sono, presença no treino, deslocamento, lesões, escalação ou condições emocionais; essas variáveis precisam ser registradas antes de atribuir uma causa.`
        : 'Não houve derrota no recorte recente. A base ainda não informa sono, presença no treino, deslocamento, lesões, escalação ou condições emocionais; registrar essas variáveis melhora comparações futuras.',
      actions: ['Registrar duração do deslocamento, horário, piso e temperatura percebida.', 'Anotar presença, minutos aproximados e mudanças de formação.', 'Comparar o próximo jogo usando o mesmo formulário de contexto.'],
    },
  ];

  return {
    category: analytics?.category,
    sampleSize: recent.length,
    form,
    recentPoints,
    recentGoalsFor,
    recentGoalsAgainst,
    formSummary,
    rankingContext,
    strongerContext,
    lowerRankedLosses: lowerRankedLosses.length,
    attentionCards,
    confidence: recent.length === 5 && losses.every((round) => Number.isFinite(round.opponentPosition)) ? 'moderada' : 'limitada',
    caveat: 'O agente detecta padrões de resultados e gera hipóteses para a comissão. Ele não avalia individualmente crianças, não diagnostica saúde mental e não substitui observação técnica, conversa com responsáveis ou profissionais qualificados.',
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

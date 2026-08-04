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
  const nextGameRaw = [...(category.upcomingGames ?? [])]
    .sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`))[0] ?? null;
  const nextGame = nextGameRaw ? {
    date: nextGameRaw.date,
    time: nextGameRaw.time,
    venue: nextGameRaw.venue,
    location: isSuzano(nextGameRaw.home) ? 'Casa' : 'Fora',
    opponent: isSuzano(nextGameRaw.home) ? nextGameRaw.away : nextGameRaw.home,
    opponentPosition: nextGameRaw.opponentStanding?.position ?? null,
    opponentPoints: nextGameRaw.opponentStanding?.points ?? null,
    opponentPlayed: nextGameRaw.opponentStanding?.played ?? null,
  } : null;

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
    nextGame,
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

function buildYouthDevelopmentAgentLegacy(analytics) {
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

function resultLetter(round) {
  return round.points === 3 ? 'V' : round.points === 1 ? 'E' : 'D';
}

function scoreText(round) {
  return `${round.goalsFor} x ${round.goalsAgainst}`;
}

function shortDate(value = '') {
  if (!value) return 'data não informada';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function roundedRate(value) {
  return Number(value ?? 0).toFixed(1).replace('.', ',');
}

function currentResultStreak(rounds = []) {
  if (!rounds.length) return { result: '', count: 0 };
  const result = resultLetter(rounds.at(-1));
  let count = 0;
  for (let index = rounds.length - 1; index >= 0; index -= 1) {
    if (resultLetter(rounds[index]) !== result) break;
    count += 1;
  }
  return { result, count };
}

export function buildYouthDevelopmentAgent(analytics) {
  const recent = analytics?.rounds?.slice(-5) ?? [];
  const form = resultCounts(recent);
  const recentPoints = recent.reduce((sum, round) => sum + round.points, 0);
  const recentGoalsFor = recent.reduce((sum, round) => sum + Number(round.goalsFor ?? 0), 0);
  const recentGoalsAgainst = recent.reduce((sum, round) => sum + Number(round.goalsAgainst ?? 0), 0);
  const recentAttackRate = recent.length ? recentGoalsFor / recent.length : 0;
  const recentDefenseRate = recent.length ? recentGoalsAgainst / recent.length : 0;
  const campaignAttackRate = Number(analytics?.attackRate ?? 0);
  const campaignDefenseRate = Number(analytics?.defenseRate ?? 0);
  const attackDelta = campaignAttackRate ? ((recentAttackRate - campaignAttackRate) / campaignAttackRate) * 100 : 0;
  const defenseDelta = campaignDefenseRate ? ((recentDefenseRate - campaignDefenseRate) / campaignDefenseRate) * 100 : 0;
  const losses = recent.filter((round) => round.points === 0);
  const wins = recent.filter((round) => round.points === 3);
  const lowerRankedLosses = losses.filter((round) => round.opponentRankRelation === 'lower');
  const higherRankedLosses = losses.filter((round) => round.opponentRankRelation === 'higher');
  const awayGames = recent.filter((round) => round.venue === 'Fora');
  const awayPoints = awayGames.reduce((sum, round) => sum + round.points, 0);
  const margins = recent.map((round) => ({ ...round, margin: Number(round.goalsFor) - Number(round.goalsAgainst) }));
  const heaviestLoss = [...margins.filter((round) => round.margin < 0)].sort((a, b) => a.margin - b.margin)[0] ?? null;
  const bestWin = [...margins.filter((round) => round.margin > 0)].sort((a, b) => b.margin - a.margin)[0] ?? null;
  const closeLosses = margins.filter((round) => round.margin < 0 && Math.abs(round.margin) <= 2);
  const streak = currentResultStreak(recent);
  const isInitiation = ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10'].includes(analytics?.category);
  const sequence = recent.map((round) => resultLetter(round)).join('–') || 'sem jogos';
  const exactGames = recent.map((round) => `${resultLetter(round)} ${scoreText(round)} x ${round.opponent}`).join(' · ');
  const next = analytics?.nextGame;

  let headline = `${form.wins}V, ${form.draws}E e ${form.losses}D no recorte`;
  if (form.losses >= 4) headline = `${form.losses} derrotas no recorte; saldo ${recentGoalsFor - recentGoalsAgainst > 0 ? '+' : ''}${recentGoalsFor - recentGoalsAgainst}`;
  else if (form.wins >= 4) headline = `${form.wins} vitórias no recorte; saldo +${Math.max(0, recentGoalsFor - recentGoalsAgainst)}`;
  else if (defenseDelta >= 20) headline = `Gols sofridos subiram ${Math.round(defenseDelta)}% no recorte`;
  else if (attackDelta <= -20) headline = `Produção ofensiva caiu ${Math.round(Math.abs(attackDelta))}% no recorte`;
  else if (streak.count >= 2) headline = `${streak.count} ${streak.result === 'V' ? 'vitórias' : streak.result === 'E' ? 'empates' : 'derrotas'} consecutivas`;

  const mainFinding = recent.length
    ? `Sequência ${sequence}: ${recentPoints}/${recent.length * 3} pontos, ${recentGoalsFor} gols feitos e ${recentGoalsAgainst} sofridos. ${exactGames}.`
    : 'A categoria ainda não tem partidas suficientes para uma leitura recente.';

  const rankingContext = lowerRankedLosses.length
    ? `${lowerRankedLosses.length} derrota${lowerRankedLosses.length > 1 ? 's' : ''} foi${lowerRankedLosses.length > 1 ? 'ram' : ''} contra equipe${lowerRankedLosses.length > 1 ? 's' : ''} hoje abaixo do ${analytics.category}: ${lowerRankedLosses.map((round) => `${round.opponent} (${round.opponentPosition}º, ${scoreText(round)})`).join('; ')}.`
    : higherRankedLosses.length
      ? `${higherRankedLosses.length} derrota${higherRankedLosses.length > 1 ? 's' : ''} ocorreu${higherRankedLosses.length > 1 ? 'ram' : ''} contra equipe${higherRankedLosses.length > 1 ? 's' : ''} hoje acima na tabela: ${higherRankedLosses.map((round) => `${round.opponent} (${round.opponentPosition}º)`).join('; ')}.`
      : `O consolidado não oferece posição comparável para todos os adversários. No recorte, o saldo foi ${recentGoalsFor - recentGoalsAgainst > 0 ? '+' : ''}${recentGoalsFor - recentGoalsAgainst}; ${heaviestLoss ? `o maior revés foi ${scoreText(heaviestLoss)} contra ${heaviestLoss.opponent}` : bestWin ? `a maior vitória foi ${scoreText(bestWin)} contra ${bestWin.opponent}` : 'não houve vitória nem derrota'}.`;

  const rateContext = `Ataque recente: ${roundedRate(recentAttackRate)} por jogo contra ${roundedRate(campaignAttackRate)} na campanha (${attackDelta >= 0 ? '+' : ''}${Math.round(attackDelta)}%). Defesa recente: ${roundedRate(recentDefenseRate)} contra ${roundedRate(campaignDefenseRate)} (${defenseDelta >= 0 ? '+' : ''}${Math.round(defenseDelta)}%).`;
  const venueContext = awayGames.length
    ? `Fora de casa no recorte: ${awayPoints}/${awayGames.length * 3} pontos em ${awayGames.length} jogos.`
    : 'Os cinco jogos do recorte foram como mandante.';

  const needsDefensiveWork = defenseDelta >= 15 || recentDefenseRate >= 3.5;
  const needsAttackWork = attackDelta <= -15 || recentAttackRate <= 1.5;
  let trainingTitle = 'Conservar o que funciona e elevar a tomada de decisão';
  let trainingFinding = `O ataque e a defesa recentes estão próximos do padrão da campanha. O treino deve preservar intensidade e aumentar a qualidade da decisão sob oposição.`;
  let trainingActions = isInitiation
    ? ['3 séries de 4 minutos de 3x3, com troca rápida de equipes.', 'Encerrar cada série com 2 minutos de jogo livre.', 'Registrar apenas participação, decisões e cooperação — não rotular atletas.']
    : ['4 séries de 4 minutos de 4x4 com transição imediata.', 'Alternar vantagem e desvantagem numérica a cada repetição.', 'Fechar com jogo aplicado de 12 minutos e revisão objetiva em vídeo.'];

  if (needsDefensiveWork) {
    trainingTitle = `Reduzir a média recente de ${roundedRate(recentDefenseRate)} gols sofridos`;
    trainingFinding = `A equipe sofreu ${recentGoalsAgainst} gols em ${recent.length} jogos. A média recente de ${roundedRate(recentDefenseRate)} variou ${defenseDelta >= 0 ? '+' : ''}${Math.round(defenseDelta)}% contra a campanha.${heaviestLoss ? ` O maior desequilíbrio foi ${scoreText(heaviestLoss)} contra ${heaviestLoss.opponent}.` : ''}`;
    trainingActions = isInitiation
      ? ['4 blocos de 3 minutos de 2x2 + goleiro, começando após perda da bola.', 'Ponto extra para a dupla que recuperar e proteger o centro antes de atacar.', 'Repetir o placar de maior desequilíbrio em jogo reduzido, trocando funções a cada bloco.']
      : ['4 blocos de 4 minutos de 3x3 + goleiro com recomposição em até 5 segundos.', 'Treinar cobertura do centro e segundo pau antes de liberar a finalização.', 'Medir por bloco: ataques cedidos após perda e recuperações em zona central.'];
  } else if (needsAttackWork) {
    trainingTitle = `Elevar a média recente de ${roundedRate(recentAttackRate)} gols marcados`;
    trainingFinding = `Foram ${recentGoalsFor} gols em ${recent.length} jogos. A média recente de ${roundedRate(recentAttackRate)} variou ${attackDelta >= 0 ? '+' : ''}${Math.round(attackDelta)}% contra a campanha.${bestWin ? ` A referência positiva foi ${scoreText(bestWin)} contra ${bestWin.opponent}.` : ''}`;
    trainingActions = isInitiation
      ? ['4 blocos de 3 minutos de 2x1, alternando quem conduz e quem finaliza.', 'Gol vale dois após passe ou condução que elimine um defensor.', 'Terminar com jogo livre e contar quantas crianças diferentes finalizaram.']
      : ['Séries de 3x2 com finalização em até 8 segundos após recuperação.', 'Criar repetição de passe no pivô, diagonal e ataque ao segundo pau.', 'Medir finalizações limpas e entradas na área por bloco, não apenas gols.'];
  } else if (form.losses >= 4 && closeLosses.length >= 3) {
    trainingTitle = `Fechar jogos equilibrados: ${closeLosses.length} derrotas por até 2 gols`;
    trainingFinding = `${closeLosses.map((round) => `${scoreText(round)} contra ${round.opponent}`).join('; ')}. O padrão pede treino de decisão nos minutos finais, sem atribuir a sequência a uma causa única.`;
    trainingActions = [
      'Jogar 4 blocos de 4 minutos começando empatado, com cronômetro e reposição lateral alternada.',
      'No último minuto, alternar cenário de empate e desvantagem de um gol.',
      'Registrar por bloco: posse desperdiçada, finalização cedida e decisão tomada após o aviso de um minuto.',
    ];
  }

  const emotionalTrigger = form.losses >= 3 || lowerRankedLosses.length > 0;
  const patternActions = emotionalTrigger
    ? [`Antes do treino do ${analytics.category}, escala de 1 a 5 para energia e confiança, registrada sem exposição individual.`, `Usar o jogo contra ${heaviestLoss?.opponent ?? 'o adversário do maior revés'} como cenário: após cada erro, reinício em até 8 segundos e uma orientação curta.`, 'Comparar comportamento após sofrer o primeiro gol no próximo jogo; placar isolado não define causa emocional.']
    : ['Manter a comunicação curta após acertos e erros.', `Usar a sequência ${sequence} como referência, sem transformar resultado em rótulo individual.`, 'Registrar quem inicia a pressão e quem oferece linha de passe após perda.'];

  const nextTitle = next ? `${next.location}: ${next.opponent}` : 'Agenda oficial ainda sem próximo jogo';
  const nextFinding = next
    ? `${shortDate(next.date)}, ${next.time || 'horário não informado'}, no ${next.venue}.${Number.isFinite(next.opponentPosition) ? ` Adversário em ${next.opponentPosition}º, com ${next.opponentPoints} pontos em ${next.opponentPlayed} jogos.` : ' A fonte não traz posição confiável do adversário neste recorte.'}`
    : 'Nenhuma partida futura foi confirmada na fonte oficial para esta categoria.';
  const nextActions = next
    ? [
        `Preparar a sessão final reproduzindo o cenário de ${next.location.toLowerCase()} contra ${next.opponent}.`,
        needsDefensiveWork ? 'Prioridade: reação à perda, proteção central e segundo pau.' : needsAttackWork ? 'Prioridade: primeira ação vertical e ocupação da área.' : 'Prioridade: manter equilíbrio entre ataque, reação à perda e controle emocional.',
        `Atualizar a leitura após a súmula de ${shortDate(next.date)}; não antecipar conclusão pelo resultado isolado.`,
      ]
    : ['Manter microciclo de desenvolvimento sem simular adversário ainda não confirmado.', 'Consultar a agenda oficial antes de definir carga e plano pré-jogo.', 'Atualizar esta análise assim que a FPFS publicar o próximo compromisso.'];

  return {
    category: analytics?.category,
    sampleSize: recent.length,
    form,
    recentPoints,
    recentGoalsFor,
    recentGoalsAgainst,
    formSummary: mainFinding,
    evidenceLines: [rankingContext, rateContext, venueContext],
    attentionCards: [
      { id: 'pattern', tone: emotionalTrigger ? 'attention' : 'stable', label: 'Diagnóstico do recorte', title: headline, finding: heaviestLoss ? `Maior revés: ${scoreText(heaviestLoss)} contra ${heaviestLoss.opponent}, em ${shortDate(heaviestLoss.date)}. ${bestWin ? `Melhor vitória: ${scoreText(bestWin)} contra ${bestWin.opponent}.` : 'Não houve vitória nos cinco jogos.'}` : `Não houve derrota no recorte. ${bestWin ? `Maior vitória: ${scoreText(bestWin)} contra ${bestWin.opponent}.` : ''}`, actions: patternActions },
      { id: 'training', tone: needsDefensiveWork || needsAttackWork ? 'attention' : 'develop', label: 'Plano de treino', title: trainingTitle, finding: trainingFinding, actions: trainingActions },
      { id: 'next', tone: next ? 'context' : 'attention', label: 'Próximo jogo', title: nextTitle, finding: nextFinding, actions: nextActions },
    ],
    confidence: recent.length === 5 ? (recent.every((round) => Number.isFinite(round.goalsFor) && Number.isFinite(round.goalsAgainst)) ? 'moderada' : 'limitada') : 'limitada',
    caveat: 'Fatos: placares, datas, mando, classificação atual e médias. Inferências: prioridades de treino e pontos de observação. O agente não diagnostica comportamento ou saúde emocional e não substitui o registro da comissão técnica.',
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

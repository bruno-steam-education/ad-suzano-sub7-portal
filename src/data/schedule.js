export const weeklyScheduleWeek = '2026-05-18';

export const weeklyNotice = {
  title: 'Agenda Sub-7 atualizada',
  body: 'Semana de treinos, psicologa e jogo contra o Chute Futsal no domingo, 24/05, as 14h30.',
  publishedAt: '2026-05-18T09:00:00-03:00',
};

export const locations = {
  cie: {
    name: 'CIE (Centro de Iniciacao ao Esporte)',
    address: 'Rua Vicente Scalice com Rua Guilherme Garijo, Jardim Santa Ines, Suzano - SP',
    query: 'CIE Professor David Ramos Trinca, Rua Vicente Scalice com Rua Guilherme Garijo, Jardim Santa Ines, Suzano, SP',
  },
  paradaInglesa: {
    name: 'Parada Inglesa - SP',
    address: 'Regiao da Parada Inglesa, Sao Paulo - SP',
    query: 'Parada Inglesa, Sao Paulo, SP',
  },
};

export const weeklySchedule = [
  {
    id: 'segunda-treino',
    date: '2026-05-18',
    weekday: 'Segunda-feira',
    title: 'Treino normal',
    type: 'Treino',
    time: '19h00 as 20h30',
    location: locations.cie.name,
    address: locations.cie.address,
    mapQuery: locations.cie.query,
    tone: 'blue',
  },
  {
    id: 'segunda-psicologa',
    date: '2026-05-18',
    weekday: 'Segunda-feira',
    title: 'Psicologa',
    type: 'Mental',
    time: '20h30 as 21h00',
    location: locations.cie.name,
    address: locations.cie.address,
    mapQuery: locations.cie.query,
    tone: 'red',
  },
  {
    id: 'quarta-treino',
    date: '2026-05-20',
    weekday: 'Quarta-feira',
    title: 'Treino normal',
    type: 'Treino',
    time: '19h00 as 20h30',
    location: locations.cie.name,
    address: locations.cie.address,
    mapQuery: locations.cie.query,
    tone: 'blue',
  },
  {
    id: 'sexta-goleiros',
    date: '2026-05-22',
    weekday: 'Sexta-feira',
    title: 'Treino especifico para goleiros',
    type: 'Goleiros',
    time: '19h00 as 20h30',
    location: locations.cie.name,
    address: locations.cie.address,
    mapQuery: locations.cie.query,
    tone: 'ice',
  },
  {
    id: 'domingo-jogo-chute',
    date: '2026-05-24',
    weekday: 'Domingo',
    title: '10o Campeonato Paulista: Chute Futsal x AD Suzano',
    type: 'Jogo oficial',
    time: '14h30',
    location: locations.paradaInglesa.name,
    address: locations.paradaInglesa.address,
    mapQuery: locations.paradaInglesa.query,
    tone: 'match',
    note: 'Seja a sua melhor versao. "Voce sempre tem que estar no seu limite." - Kobe Bryant',
  },
];

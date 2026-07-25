export const federationScheduleSource = {
  label: 'Tabela Oficial FPFS - Campeonato Paulista 2026 (Iniciação e Base A2)',
  file: 'TABELA_PAULISTA_A2_BASE_2026.pdf',
  checkedAt: '2026-07-24',
};

// Tabela oficial enviada com os próximos jogos da Base e Iniciação (19 rodadas)
export const baseA2Schedule = [
  { round: 1, date: '2026-03-15', time: '08:30', home: 'ITAQUA FUTSAL', away: 'AD SUZANO', venue: 'Ginásio Municipal Sumiyoshi Nakaharada' },
  { round: 2, date: '2026-03-21', time: '08:30', home: 'AD SUZANO', away: 'YPIRANGA', venue: 'Ginásio Roberto David (Sesc Suzano)' },
  { round: 3, date: '2026-04-12', time: '14:30', home: 'LAUSANNE PAULISTA FC', away: 'AD SUZANO', venue: 'Ginásio Cyro Savoy' },
  { round: 4, date: '2026-04-18', time: '08:30', home: 'AD SUZANO', away: 'EC HORTOLANDIA', venue: 'Ginásio Roberto David (Sesc Suzano)' },
  { round: 5, date: '2026-04-25', time: '14:30', home: 'CATJ', away: 'AD SUZANO', venue: 'Ginásio CIE Pietra Medeiros' },
  { round: 6, date: '2026-05-02', time: '08:30', home: 'AD SUZANO', away: 'STADIUSH FS', venue: 'Ginásio Roberto David (Sesc Suzano)' },
  { round: 7, date: '2026-05-09', time: '08:30', home: 'TAUBATE FUTSAL', away: 'AD SUZANO', venue: 'Ginásio Vila Aparecida' },
  { round: 8, date: '2026-05-23', time: '08:30', home: 'AD SUZANO', away: 'WIMPRO GUARULHOS', venue: 'Ginásio Roberto David (Sesc Suzano)' },
  { round: 9, date: '2026-05-30', time: '08:30', home: 'SPFC', away: 'AD SUZANO', venue: 'Ginásio 1 Morumbi' },
  { round: 10, date: '2026-06-06', time: '08:30', home: 'AD SUZANO', away: 'PEQUENO MESTRE', venue: 'Ginásio Roberto David (Sesc Suzano)' },
  { round: 11, date: '2026-06-13', time: '08:30', home: 'PULO FUTSAL', away: 'AD SUZANO', venue: 'Ginásio Rogê Ferreira' },
  { round: 12, date: '2026-06-20', time: '08:30', home: 'AD SUZANO', away: 'AD SANTO ANDRE', venue: 'Ginásio Roberto David (Sesc Suzano)' },
  { round: 13, date: '2026-07-04', time: '14:30', home: 'RIVETI DO BELEM', away: 'AD SUZANO', venue: 'Ginásio Cruzeirinho Vila Matilde' },
  // PRÓXIMOS JOGOS RESTANTES DA BASE (DESTACADOS NA IMAGEM)
  { round: 14, date: '2026-08-08', time: '08:30', home: 'AD SUZANO', away: 'SELECIONADOS FUTSAL', venue: 'Ginásio Roberto David (Sesc Suzano)', highlight: true, opponentPosition: 17 },
  { round: 15, date: '2026-08-15', time: '14:00', home: 'MOGI DAS CRUZES', away: 'AD SUZANO', venue: 'Ginásio Cempre (Caic Mogi)' },
  { round: 16, date: '2026-08-29', time: '08:30', home: 'AD SUZANO', away: 'NINHO FUTSAL N2016', venue: 'Ginásio Roberto David (Sesc Suzano)' },
  { round: 17, date: '2026-09-12', time: '08:30', home: 'AD PRUDENTE', away: 'AD SUZANO', venue: 'Ginásio Sarkizão' },
  { round: 18, date: '2026-09-19', time: '08:30', home: 'AD SUZANO', away: 'IMPACTO FC', venue: 'Ginásio Roberto David (Sesc Suzano)', highlight: true, opponentPosition: 20 },
  { round: 19, date: '2026-10-03', time: '14:00', home: 'LISFUTS SÃO SEBASTIÃO', away: 'AD SUZANO', venue: 'Ginásio Amaro Buarque Sampaio', highlight: true, opponentPosition: 15 },
];

export const initiationA2BaseSchedule = [
  ...baseA2Schedule,
];

const categoryLabels = ['Sub-7', 'Sub-8', 'Sub-9', 'Sub-10', 'Sub-12', 'Sub-14', 'Sub-16', 'Sub-18'];

export const categories = categoryLabels.map((label) => ({
  id: label.toLowerCase().replace('-', ''),
  label,
  title: `AD Suzano ${label}`,
  competition: 'Paulista A2',
  status: 'Completo',
  hasLiveData: true,
  description: `Campanha, notícias, agenda oficial e contexto de jogos verificado do ${label}.`,
}));

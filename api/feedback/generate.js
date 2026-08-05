import { allowMethods, parseJsonBody, requireStaff, safeError } from '../../server/paymentServer.js';

function clean(value, max = 400) {
  return String(value || '').trim().slice(0, max);
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  res.setHeader('Cache-Control', 'no-store');

  try {
    const context = await requireStaff(req, res);
    if (!context) return;

    const body = await parseJsonBody(req);
    const athleteName = clean(body.athleteName, 120);
    const category = clean(body.category, 40);
    const match = body.match && typeof body.match === 'object' ? body.match : {};
    const athleteProfile = body.athleteProfile && typeof body.athleteProfile === 'object' ? body.athleteProfile : {};
    const variation = clean(body.variation, 80);
    const rubric = body.rubric && typeof body.rubric === 'object' ? body.rubric : {};
    const selections = rubric.selections && typeof rubric.selections === 'object' ? rubric.selections : {};
    const personalized = rubric.personalized && typeof rubric.personalized === 'object' ? rubric.personalized : {};
    const keys = ['training', 'game', 'emotional', 'teamwork', 'next_focus'];
    const complete = keys.every((key) => clean(selections[key]) || clean(personalized[key]));

    if (!athleteName || !category || !complete) {
      return res.status(400).json({ error: 'Preencha os cinco blocos com uma rubrica ou observação personalizada.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'A chave do assistente ainda não foi configurada no servidor.' });

    const prompt = `
Você é um treinador de futsal de base, escrevendo para a família de ${athleteName}, categoria ${category}.
Sua tarefa é transformar as observações abaixo em uma mensagem que um professor brasileiro realmente enviaria.

CONTEXTO DA PARTIDA:
- Jogo: ${clean(match.title, 180) || 'partida da categoria'}
- Data: ${clean(match.date, 30) || 'não informada'}
- Local ou competição: ${clean(match.competition, 100) || 'não informado'}

PERFIL DISPONÍVEL DO ATLETA:
${JSON.stringify(athleteProfile)}

VARIAÇÃO DE REDAÇÃO:
${variation || 'use uma abertura natural e diferente das anteriores'}
Não copie frases prontas de outros atletas. Personalize a abertura, a metáfora, o reconhecimento e o próximo foco com base no nome, perfil e observações deste atleta. Não force informações que não estejam disponíveis.

VOZ:
- Linguagem falada, brasileira, calorosa e respeitosa.
- Frases curtas, diretas e concretas. Use verbos de ação.
- Seja firme sem ser dura e motivador sem exagerar.
- Fale com a criança pelo nome no bloco NO JOGO, usando segunda pessoa.
- Não use linguagem de relatório escolar, jargão pedagógico ou elogios genéricos.
- Não invente fatos, notas, resultados, diagnósticos médicos ou psicológicos.
- Não use o caractere travessão. Use ponto, vírgula ou dois-pontos.
- Use o nome da criança pelo menos quatro vezes.
- Use no máximo um emoji em cada cabeçalho e apenas os emojis definidos abaixo.

FORMATO OBRIGATÓRIO, exatamente nesta ordem:
1. Cabeçalho em duas linhas: “⚡ FAMÍLIA DO ${athleteName.toUpperCase()} 🔥” e “${category.toUpperCase()} EM MOVIMENTO!”.
2. “Cada treino é semente. Cada jogo é colheita.” ou uma variação curta, seguida de uma linha que traga essa ideia para ${athleteName}.
3. “🎯 NO TREINO”: foco observado, duas micro-orientações práticas e uma frase de reconhecimento do processo. Até quatro linhas.
4. “⚽ NO JOGO”: comece com um imperativo dirigido a ${athleteName}. Mostre uma ação para a próxima partida e termine com uma verdade curta sobre confiança. Até quatro linhas.
5. “❤️ O QUE ${athleteName.toUpperCase()} JÁ TRAZ”: celebre somente comportamentos concretos observados. Use pares curtos. Até quatro linhas.
6. “📣 PARA A FAMÍLIA”: reconheça a parceria dos responsáveis, dê uma orientação prática para casa e incentive celebrar evolução, não só placar. Termine com uma única linha de fé sutil, sem sermão. Até cinco linhas.
7. Uma única linha: “Pra cima, ${athleteName}! 💪⚽”.

Distribua naturalmente pelo texto pelo menos três valores entre respeito, união, disciplina, esforço, superação, coragem, evolução, confiança, alegria e paciência. Não liste os valores.

RUBRICA E OBSERVAÇÕES DO TREINADOR:
${JSON.stringify({ selections, personalized })}

Antes de responder, confira: os sete blocos estão presentes, o bloco do jogo fala com a criança, o texto está concreto, não há travessão, não há diagnóstico e a fé aparece somente no bloco da família.
Responda somente com a mensagem final, sem explicar suas escolhas.
`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const payload = await response.json().catch(() => ({}));
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!response.ok || !text) throw new Error(payload.error?.message || 'O assistente não conseguiu gerar o feedback.');
    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({ error: safeError(error) });
  }
}

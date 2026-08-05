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
    const rubric = body.rubric && typeof body.rubric === 'object' ? body.rubric : {};
    if (!athleteName || !category || Object.keys(rubric).length < 5) return res.status(400).json({ error: 'Preencha as cinco respostas da rubrica.' });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'A chave do assistente ainda não foi configurada no servidor.' });

    const prompt = `Você é um assistente de uma comissão técnica de futsal de iniciação e base. Escreva um feedback curto, específico, respeitoso e útil para a família do atleta ${athleteName}, categoria ${category}. Use linguagem positiva e concreta. Não faça diagnóstico médico ou psicológico, não rotule a criança, não invente fatos e não exponha notas numéricas. Organize em 1 parágrafo de até 700 caracteres e uma frase final de próximo foco de treino. Respostas da rubrica: ${JSON.stringify(rubric)}`;
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

import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini client with server-side API key
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY серверде орнатылмаған.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// POST /api/generate-worksheet endpoint
app.post('/api/generate-worksheet', async (req: Request, res: Response) => {
  try {
    const {
      subject,
      grade,
      topic,
      learningObjective,
      difficulty,
      taskCount = 4,
      selectedTaskTypes = [],
      sourceText = '',
      singleTaskToReplaceIndex = null,
    } = req.body;

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ error: 'Сабақ тақырыбын енгізіңіз!' });
    }
    if (!learningObjective || !String(learningObjective).trim()) {
      return res.status(400).json({ error: 'Оқу мақсатын енгізіңіз!' });
    }

    const ai = getAiClient();

    const systemInstruction = `Сен Қазақстандағы қазақ тілі мен қазақ әдебиеті пәндерінің тәжірибелі педагогісің.
Мұғалім берген пән, сынып, сабақ тақырыбы, оқу мақсаты, тапсырма саны, тапсырма түрлері, қиындық деңгейі және sourceText негізінде нақты педагогикалық тапсырмалар құрастыр.

ҚАТАҢ ЕРЕЖЕЛЕР:
1. Жалпы шаблон немесе формальды тапсырма қолданба ("Өз ойыңды жаз", "Сұраққа жауап бер" сияқты бос сөздерді REJECT ет).
2. Тақырыпқа және оқу мақсатына тікелей қатысы бар нақты сөйлемдер, үзінділер, кейіпкерлер, кестелер жаса.
3. Қазақ әдебиеті үшін: шығарманың нақты кейіпкерлері, оқиғасы, идеясы, көркемдегіш құралдары, моральдық конфликтісін қолдан. Шығармада жоқ кейіпкер немесе фактіні ЖАСАМА.
4. Қазақ тілі үшін: нақты сөйлемдер (мысалы сабақтас құрмалас сөйлемдер) беріп, соларды талдауды, кестеге салуды, түрін ажыратуды талап ет.
5. Егер sourceText берілсе, ТЕК сол мәтінге сүйен және sourceEvidence өрісінде қай жерден екенін көрсет.
6. Әр тапсырма үшін тексерілетін нақты ЖАУАП (answer) мен ДЕСКРИПТОР (descriptor) бер.
7. Тапсырма саны дәл көрсетілген санға тең болсын.
8. Жауапты тек берілген JSON форматында қайтар.`;

    const countToGenerate =
      singleTaskToReplaceIndex !== null && singleTaskToReplaceIndex !== undefined
        ? 1
        : Math.min(Math.max(Number(taskCount) || 4, 1), 4);

    const taskTypesStr =
      Array.isArray(selectedTaskTypes) && selectedTaskTypes.length > 0
        ? selectedTaskTypes.join(', ')
        : 'AI өзі таңдасын';

    const promptUserText = `
Пән: ${subject}
Сынып: ${grade}
Сабақ тақырыбы: ${topic}
Оқу мақсаты: ${learningObjective}
Қиындық деңгейі: ${difficulty}
Тапсырма саны: ${countToGenerate}
Таңдалған тапсырма түрлері: ${taskTypesStr}
${sourceText ? `Берілген мәтін/үзінді: "${sourceText}"` : 'Шығарма/мәтін енгізілмеген.'}

${
  singleTaskToReplaceIndex !== null && singleTaskToReplaceIndex !== undefined
    ? `ТЕК №${Number(singleTaskToReplaceIndex) + 1} тапсырманы қайта құрастыру қажет.`
    : ''
}

Төмендегі JSON схемасын дәл сақтап жауап бер:
{
  "title": "${topic}",
  "subject": "${subject}",
  "grade": "${grade}",
  "topic": "${topic}",
  "learningObjective": "${learningObjective}",
  "difficulty": "${difficulty}",
  "tasks": [
    {
      "number": 1,
      "type": "Тапсырма түрі",
      "instruction": "Оқушыға арналған нақты нұсқаулық",
      "content": "Тапсырманың негізгі мазмұны, мәтін, кесте немесе сөйлемдер",
      "answer": "Мұғалімге арналған толық, дұрыс жауап кілті",
      "descriptor": "Оқушы ... біледі / анықтайды / талдайды (1 балл)",
      "sourceEvidence": "Мәтіндегі айғақ немесе тақырыптық негіз"
    }
  ]
}
`;

    let response;
    const modelsToTry = [
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
    ];
    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: promptUserText,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });
        if (response && response.text) {
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} failed, trying next fallback...`, err);
        // Brief pause before trying fallback
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('ЖИ жауабы бос болып шықты.');
    }

    const rawJsonText = response.text;
    if (!rawJsonText) {
      return res.status(500).json({ error: 'ЖИ жауабы бос болып шықты.' });
    }

    const parsedData = JSON.parse(rawJsonText);
    return res.json(parsedData);
  } catch (err: unknown) {
    console.error('Worksheet generation error:', err);
    const msg = err instanceof Error ? err.message : 'Белгісіз қате орын алды';
    return res.status(500).json({
      error: `ЖИ қызметіне қосылуда қате орын алды: ${msg}`,
    });
  }
});

// Setup Vite middleware for development or serve static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`ҰСТАЗ LAB server running on port ${PORT}`);
  });
}

startServer();

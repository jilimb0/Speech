import {
  type AiCoachResult,
  type FillerCount,
  getEnv,
  type Language,
  type OratorExercise,
  type PauseMetrics,
  type SpeechRate,
} from '@speech/shared';

export interface AiCoachInput {
  topFillers: FillerCount[];
  wordsPerMinute: number;
  speechRate: SpeechRate;
  pauseMetrics?: PauseMetrics;
  transcriptSnippet?: string;
  language?: Language;
}

export interface AiCoachOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

/**
 * Словарь шаблонов упражнений под частые слова-паразиты и дефекты речи
 */
const EXERCISE_CATALOG: Record<string, OratorExercise> = {
  ну: {
    title: 'Техника «Вдох вместо слова»',
    description:
      'Каждый раз, когда возникает позыв начать фразу с «ну», сделай короткий бесшумный вдох через нос и начни сразу с сути.',
    targetFiller: 'ну',
    practiceText: '«(вдох) Проект завершен в срок, основные цели достигнуты.»',
  },
  типа: {
    title: 'Техника «Точная формулировка»',
    description:
      'Слово «типа» выдает поиск аналогии или неуверенность. Заменяй его на конкретные слова: «например», «в частности» или убирай совсем.',
    targetFiller: 'типа',
    practiceText: '«Мы разработали решение, в частности, автоматизировали рутинный ввод.»',
  },
  'как бы': {
    title: 'Техника «Уверенное утверждение»',
    description:
      '«Как бы» смягчает высказывание и обесценивает экспертизу. Произноси мысль прямо и утвердительно.',
    targetFiller: 'как бы',
    practiceText: '«(вместо: мы как бы закончили) — Мы полностью завершили интеграцию.»',
  },
  короче: {
    title: 'Техника «Суть в трех предложениях»',
    description:
      'Вместо попытки ускорить мысль словом «короче», структурируй речь: тезис, аргумент, вывод.',
    targetFiller: 'короче',
    practiceText: '«Главный вывод: конверсия выросла на 12%. Это результат редизайна воронки.»',
  },
  'в общем': {
    title: 'Техника «Четкий фокус»',
    description:
      '«В общем» размывает границы мысли. Заменяй его на завершающую паузу или «Таким образом».',
    targetFiller: 'в общем',
    practiceText: '«Таким образом, задача решена без задержек.»',
  },
  значит: {
    title: 'Техника «Смысловая пауза»',
    description:
      'Слово «значит» часто заполняет пустоту при подборе мыслей. Замени его полусекундной паузой.',
    targetFiller: 'значит',
    practiceText: '«Клиент подтвердил бюджет. [пауза] Приступаем к реализации.»',
  },
  'так сказать': {
    title: 'Техника «Прямая речь»',
    description: 'Убирай оправдательную интонацию. Говори фактами, без оговорок.',
    targetFiller: 'так сказать',
    practiceText: '«Это вызвало временные трудности в архитектуре.»',
  },
};

/**
 * Детерминированный генератор упражнений (фолбэк или оффлайн-режим)
 */
export function generateFallbackCoach(input: AiCoachInput): AiCoachResult {
  const exercises: OratorExercise[] = [];
  const { topFillers, speechRate, pauseMetrics } = input;

  // 1. Упражнения под топ-паразиты
  for (const item of topFillers.slice(0, 2)) {
    const fillerLower = item.filler.toLowerCase();
    const known = EXERCISE_CATALOG[fillerLower];
    if (known) {
      exercises.push(known);
    } else {
      exercises.push({
        title: `Упражнение на вытеснение «${item.filler}»`,
        description: `Зафиксируй слово «${item.filler}» как стоп-слово. Произнеси 1 минуту рассказа о прошедшем дне, делая паузу в 1 секунду каждый раз перед этим словом.`,
        targetFiller: item.filler,
      });
    }
  }

  // 2. Упражнение на темп, если он отклоняется
  if (speechRate === 'fast') {
    exercises.push({
      title: 'Упражнение «Двойной ритм и пауза-точка»',
      description:
        'Быстрая речь часто провоцирует комкание слов. В конце каждого предложения делай выраженную паузу на 2 секунды (ставь мысленную жирную точку).',
      practiceText: '«Мы подготовили новый релиз. (точка) Тесты успешно пройдены. (точка)»',
    });
  } else if (speechRate === 'slow' || (pauseMetrics && pauseMetrics.pauseCount >= 3)) {
    exercises.push({
      title: 'Упражнение «Мысленный мостик без зависаний»',
      description:
        'Чтобы избежать затяжных пауз размышления, используй переходные связки: «Во-первых», «С одной стороны», «Кроме того».',
      practiceText: '«Во-первых, мы проверили гипотезу. Во-вторых, оценили метрики.»',
    });
  }

  // Если паразитов нет вообще
  if (exercises.length === 0) {
    exercises.push({
      title: 'Разминка оратора: дикция и артикуляция',
      description:
        'Твоя речь чиста от мусорных слов! Для оттачивания дикции проговори скороговорку: «В недрах тундры выдры в гетрах тырят в вёдра ядра кедров».',
      practiceText: '«В недрах тундры выдры в гетрах тырят в вёдра ядра кедров»',
    });
  }

  const feedback =
    topFillers.length > 0
      ? `Твой главный фокус — уменьшить употребление «${topFillers[0]?.filler}». Выполняй предложенные упражнения перед важными созвонами или записями.`
      : 'Отличная чистота речи! Продолжай тренировать четкость дикции и интонирование.';

  return {
    feedback,
    exercises: exercises.slice(0, 3),
  };
}

function buildAiCoachPrompt(input: AiCoachInput): string {
  const topList = input.topFillers.map((f) => `«${f.filler}» (${f.count} раз)`).join(', ') || 'нет';
  const pausesCount = input.pauseMetrics?.pauseCount ?? 0;
  const maxPause = input.pauseMetrics?.longestPauseSec ?? 0;
  const snippet = input.transcriptSnippet?.slice(0, 200) ?? '';

  return `Ты — профессиональный тренер по ораторскому мастерству и технике речи.
Проанализируй метрики говорящего и предложи 1-2 практических упражнения.

Данные:
- Слов в минуту: ${input.wordsPerMinute} (${input.speechRate})
- Топ слов-паразитов: ${topList}
- Паузы зависания: ${pausesCount} (макс: ${maxPause} сек)
- Фрагмент: "${snippet}"

Ответь строго в формате валидного JSON без markdown:
{
  "feedback": "короткий совет до 2 предложений",
  "exercises": [
    {
      "title": "название упражнения",
      "description": "что конкретно делать",
      "targetFiller": "слово или null",
      "practiceText": "фраза для тренировки"
    }
  ]
}`;
}

function parseAiCoachResponse(content: string | undefined): AiCoachResult | null {
  if (!content) return null;
  try {
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned) as AiCoachResult;
    if (parsed.feedback && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Запрос к OpenCode / OpenAI-совместимому Inference API
 */
export async function generateAiCoach(
  input: AiCoachInput,
  options: AiCoachOptions = {},
): Promise<AiCoachResult> {
  const apiKey = options.apiKey ?? getEnv('OPENCODE_API_KEY', getEnv('AI_API_KEY', ''));

  const baseUrl = (
    options.baseUrl ??
    getEnv('OPENCODE_API_URL', getEnv('AI_BASE_URL', 'https://api.opencode.ai/v1'))
  ).replace(/\/+$/, '');

  const model = options.model ?? getEnv('AI_MODEL', 'gpt-4o-mini');
  const timeoutMs = options.timeoutMs ?? 5000;

  const isLocalEndpoint = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
  if (!apiKey && !isLocalEndpoint) {
    return generateFallbackCoach(input);
  }

  const prompt = buildAiCoachPrompt(input);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Ты ораторский коуч. Отвечай только в JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      return generateFallbackCoach(input);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const parsed = parseAiCoachResponse(data.choices?.[0]?.message?.content);
    return parsed ?? generateFallbackCoach(input);
  } catch {
    return generateFallbackCoach(input);
  }
}

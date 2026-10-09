# Speech — План развития голосового анализатора речи

> **Мировой бенчмарк:** Otter.ai / ElevenLabs / Yoodli ($1B+ Val)  
> **Суть продукта:** Telegram Mini App для анализа слов-паразитов в речи ("ну", "как бы", "типа") на базе Whisper API.  
> **Текущий статус:** 80+ TS файлов, 55 тестов backend + 14 тестов frontend (всего 69 тестов), Docker, кэширование Whisper, AI Coach (OpenCode/Local AI), детекция пауз, Telegram Stars биллинг и шеринг.

> 💡 **Core-Tooling Leverage:** Telegram Mini App голосового тренажера использует `@tgwrapper/tma` для авторизации через `initData` и нативный модуль Stars-платежей за подписку Speech Pro. ИИ-генерация персонализированных упражнений поддержана через OpenCode Inference API с надежным локальным фолбэком.

---

## 1. Технический бэклог доработок (Technical Debt & Features)

- [x] **Кэширование транскрипций для снижения затрат на Whisper API** *(Реализовано: SHA-256 хэш аудиофайла + `InMemoryTranscriptionCache` с TTL в `@speech/speech`)*
- [x] **Анализ темпа речи (слов в минуту) и пауз молчания** *(Реализовано: классификация WPM + `calculatePauseMetrics` с порогом зависания 1.5 сек)*
- [x] **Генерация персонализированных упражнений по ораторскому мастерству** *(Реализовано: модуль `ai-coach` с интеграцией OpenCode / OpenAI-совместимого API и каталогом ораторских техник)*
- [x] **Управление тарифами пользователей в БД** *(Реализовано: `updateUserPlan` в `@speech/sessions` с поддержкой `free` и `premium`)*

---

## 2. Дизайн и UX/UI бэклог

- [x] **Оценка чистоты речи в баллах (от 20 до 100) с динамикой за неделю** *(Реализовано: алгоритм с защитой от демотивации, расчет `avgScore7d`, `lastSessionDelta`, отображение в боте и Mini App)*
- [x] **Блок упражнений от ИИ-коуча в сессии** *(Реализовано: карточки упражнений с фразами для тренировки на экране сессии Mini App)*
- [x] **Вирусный шеринг результатов в Telegram** *(Реализовано: кнопка «Поделиться результатом ↗» в `SessionDetailScreen`)*
- [ ] **Красивая визуальная волна аудио (Waveform) с подсветкой слов-паразитов** *(Требует внешнего S3/R2 хранилища для аудиофайлов)*

---

## 3. Модель монетизации и биллинг

* **Тарифная сетка:** Бесплатно 2 анализа в день / Pro подписка (50 Telegram Stars / 30 дней) — безлимит + детальный ИИ-коучинг.
* **Платежный шлюз:** Telegram Stars (XTR) — нативная поддержка через Telegram Bot API (`sendInvoice`, `answerPreCheckoutQuery`, `successful_payment`).
* **Триггер пейволла:** При исчерпании лимита бот предлагает оформить Pro командой `/pro` или по инлайн-кнопке. Пользователи с планом `premium` не ограничиваются.

---

## 4. Пошаговые спринты реализации

### Спринт 1: Метрики темпа, пауз и ИИ-коучинг ✅
- [x] Расчет WPM (слов в минуту) и детекция пауз зависания (`services/analysis`)
- [x] Модуль ИИ-коуча: интеграция с OpenCode Inference API / локальными моделями (`services/analysis/src/ai-coach.ts`)
- [x] Кэширование аудио-транскрипций (`services/speech`)
- [x] Отображение пауз и упражнений в боте и экране сессии Mini App (`apps/web-miniapp`)

### Спринт 2: Telegram Stars Биллинг и виральность ✅
- [x] Команда `/pro` и `/buy` с выставлением счета в Stars (`commands.ts`)
- [x] Обработка подтверждения инвойса `pre_checkout_query` (`apps/api/src/bot/index.ts`)
- [x] Автоматический апгрейд пользователя на `premium` при `successful_payment` (`message-router.ts`)
- [x] Шеринг результата сессии в Telegram чаты и каналы через `Telegram.WebApp.openTelegramLink`

### Спринт 3: Волна звука (Waveform) и долговременное аудио
- [ ] Подключение S3/Cloudflare R2 для хранения аудиозаписей
- [ ] Отрисовка вейвформы в Mini App с подсветкой временных меток паразитов

---

## 5. Внешние зависимости (Не зависящее от нас / Требует окружения)

1. **Telegram Bot Token:**
   - Получить у `@BotFather` токен бота и прописать в `.env`: `TELEGRAM_BOT_TOKEN`.
   - В меню бота через `@BotFather` настроить Web App URL на GitHub Pages: `https://jilimb0.github.io/Speech`.
2. **Сервер / Raspberry Pi / Docker:**
   - Запустить `docker compose up -d` на сервере.
   - Применить миграции БД: `infra/db/migrations/001_initial.sql` и `002_add_pauses_and_exercises.sql`.
   - Настроить публичный URL (например, через Tailscale Funnel или Reverse Proxy) для API:3000.
3. **Провайдер STT (Whisper):**
   - Либо запущенный контейнер `faster-whisper` (`FASTER_WHISPER_URL=http://faster-whisper:10300`),
   - Либо OpenAI API ключ: `OPENAI_API_KEY` при `SPEECH_PROVIDER=managed`.
4. **OpenCode AI / Локальная LLM:**
   - Если требуется вызов LLM вместо встроенного локального эвристического генератора ораторских техник — указать `OPENCODE_API_KEY` (или локальный Ollama endpoint `AI_BASE_URL=http://localhost:11434/v1`).

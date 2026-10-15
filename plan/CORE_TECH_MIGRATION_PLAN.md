# План миграции Speech на кор-технологии (@tgwrapper & @ui-construction-library)

> **Проект:** `lifestyle-productivity/Speech`  
> **Роль в экосистеме:** AI-коуч публичных выступлений и транскрибация аудио (Whisper + Telegram Mini App)  
> **Приоритет миграции:** 🎯 **Tier 3 (Средний)**  

---

## 1. Текущий технологический срез (As-Is)

### Telegram & TMA:
* **Что уже на `@tgwrapper`:** **100% готовность!** В `apps/api/package.json` подключен `@tgwrapper/core@^0.20.1`. Обработка сообщений, голосовых заметок, колбэков, платежей Telegram Stars и TMA-авторизации построена на фреймворке.

### Web & UI:
* **Что уже на `@ui-construction-library`:** В `apps/web-miniapp/package.json` уже установлены `@ui-construction-library/core@^0.1.2` и `@ui-construction-library/tokens@^0.1.1`. 4 компонента используют библиотеку.
* **Что требует обновления:** 
  - Версия библиотеки устарела (`0.1.2` против актуальной `0.9.0`).
  - Оставшиеся 12 компонентов Mini App (диктофон, визуализатор аудио-волны, карточки оценки дикции) частично используют кастомный Tailwind.

---

## 2. Целевая архитектура (To-Be)

1. **Telegram-слой:** Сохранение стабильной интеграции на `@tgwrapper/core@0.20.1`.
2. **Web-слой:**
   - Обновление `@ui-construction-library/core` до `^0.9.0` и `@ui-construction-library/tokens` до `^0.6.0`.
   - Полный перевод оставшихся экранов анализа речи (Words Per Minute, слова-паразиты, паузы) на компоненты `@ui-construction-library`.

---

## 3. Пошаговый план перехода

### Шаг 1. Обновление версий дизайн-системы
- [x] Обновить в `apps/web-miniapp/package.json`:
  ```json
  "dependencies": {
    "@ui-construction-library/core": "^0.9.0",
    "@ui-construction-library/tokens": "^0.6.0",
    "@ui-construction-library/icons": "^0.6.0"
  }
  ```
- [x] Обновить `pnpm-lock.yaml`.

### Шаг 2. Миграция оставшихся компонентов Mini App
- [x] **Экран истории и сессий (`HistoryScreen.tsx`, `SessionDetailScreen.tsx`):**
  - Использованы `Card`, `Badge` (variant `success`/`warning`), `Button`.
- [x] **Экран прогресса и метрик (`ProgressScreen.tsx`):**
  - Использованы `Card` для WPM, пауз и слов-паразитов.
- [x] **Экран Premium (`PremiumScreen.tsx`):**
  - Оформлены карточки тарифов через `Card`, `Badge`, `SparklesIcon` и `Button`.

### Шаг 3. Верификация
- [x] Запуск `pnpm lint` / Biome.
- [x] Запуск `pnpm typecheck` во всех пакетах.
- [x] Запуск тестов Vitest (58 тестов).

---

## 4. Оценка трудоёмкости
* **Telegram-слой:** 0 дней (уже на кор-стеке).
* **UI-слой:** 1 день (обновление версии и миграция 12 компонентов).
* **Суммарно:** 1 рабочий день.

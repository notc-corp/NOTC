@AGENTS.md

# ВАЖНО — начать с этого

Перед любой работой прочитать [ARCHITECTURE-FIXES.md](ARCHITECTURE-FIXES.md) — там список архитектурных правок которые нужно сделать в первую очередь. Начинать новую сессию с вопроса: "Какую правку из ARCHITECTURE-FIXES.md делаем сегодня?"

---

# Стек технологий

| Слой | Технология |
|------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4 |
| ORM | Drizzle ORM |
| БД (dev) | SQLite (better-sqlite3, файл audit.db) |
| БД (prod) | PostgreSQL (Neon) — миграция запланирована |
| Auth | iron-session (PIN-based, не JWT) |
| Файлы | локально uploads/ → Cloudflare R2 (запланировано) |
| Мобайл | Capacitor (iOS + Android WebView обёртка) |
| AI | Anthropic SDK (OCR чеков, распознавание одометра) |
| Карты | Mapbox GL / react-map-gl |

---

# Архитектура слоёв

```
src/
├── lib/          ← Domain Layer (бизнес-логика, утилиты)
│   ├── db.ts         БД соединение + автомиграции
│   ├── auth.ts       Сессии, хэширование PIN
│   ├── upload.ts     Работа с файлами
│   ├── native.ts     Capacitor/browser абстракция
│   └── report.ts     Логика отчётов
│
├── db/           ← Data Layer (схема и сиды)
│   ├── schema.ts     Drizzle таблицы — единственный источник правды
│   └── seed.ts       Начальные данные
│
└── app/          ← Presentation Layer
    ├── api/          API routes (только тонкая обёртка над Domain)
    ├── owner/        Owner UI
    ├── driver/       Driver UI
    └── page.tsx      Логин
```

**Правило:** API routes не содержат бизнес-логику — только вызов функций из `src/lib/`. UI не обращается к БД напрямую — только через `/api/`.

---

# Правила кодинга

### Компоненты
- Только функциональные компоненты (никаких class components)
- `"use client"` — только если нужен state, эффекты или браузерные API
- Server Components по умолчанию там где нет интерактивности

### База данных
- Только Drizzle ORM — никакого raw SQL кроме автомиграций в `db.ts`
- Схема только в `src/db/schema.ts` — не дублировать типы
- Новые таблицы: сначала в schema.ts, потом `CREATE TABLE IF NOT EXISTS` в db.ts

### API
- Всегда проверять сессию: `if (!session.userId) return 401`
- Owner-only эндпоинты: дополнительно `if (session.role !== 'owner') return 403`
- Возвращать понятные error messages: `{ error: "..." }`

### Безопасность
- `SESSION_SECRET` обязателен в продакшене — уже падает с ошибкой если не задан
- Никогда не логировать PIN или hash
- Все загружаемые файлы — только через `src/lib/upload.ts`

### Стиль
- Tailwind классы — не inline styles
- Мобиль первичен: сначала верстать под телефон, потом расширять
- Слабые устройства: не грузить всё сразу, lazy loading где возможно

---

# Мультитенантность (архитектура заложена, не активирована)

- Таблица `companies` добавлена
- `company_id` есть в users, trips, expenses, defects, trucks
- Изоляция по `company_id` в API — реализовать перед первым SaaS деплоем
- `SessionData.companyId` — добавлять при логине когда будет регистрация компаний

---

# Мобильное приложение (Capacitor)

- Нативные фичи через `src/lib/native.ts` — не вызывать `@capacitor/*` напрямую из компонентов
- Camera, Geolocation — через `takePhoto()` и `getCurrentPosition()` из native.ts
- Сборка для сторов: `npm run cap:sync` → `npm run cap:open:ios` / `cap:open:android`

---

# Переменные окружения

```env
SESSION_SECRET=        # обязателен в prod (мин. 32 символа)
ANTHROPIC_API_KEY=     # для OCR
NEXT_PUBLIC_MAPBOX_TOKEN=  # для карт
DATABASE_URL=          # PostgreSQL (Neon) — когда будет готов
R2_ACCOUNT_ID=         # Cloudflare R2 — когда будет готов
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
CAPACITOR_SERVER_URL=  # URL продакшен сервера для нативного приложения
```

# План следующей сессии — Кросс-платформа

## Задачи для Claude (в этом порядке)

### 1. PWA — Progressive Web App
- Создать `public/manifest.json` с иконками, названием, цветами
- Создать `public/sw.js` — service worker (кэш статики)
- Добавить мета-теги в `src/app/layout.tsx` (viewport, theme-color, apple-touch-icon)
- Зарегистрировать service worker в layout
- Протестировать: открыть на телефоне через WiFi → "Добавить на экран"

### 2. Иконки приложения
- Создать `public/icons/` — иконки 192x192 и 512x512 (PNG)
- Иконка для iOS (apple-touch-icon 180x180)
- Использовать существующий logo.png как основу

### 3. Подготовка к деплою на Vercel + Neon PostgreSQL
- Заменить `better-sqlite3` на `postgres` + `drizzle-orm/postgres-js`
- Обновить `src/lib/db.ts` — переключиться на DATABASE_URL из env
- Обновить `src/db/schema.ts` — синтаксис Drizzle для PostgreSQL (pgTable вместо sqliteTable)
- Обновить все миграции (CREATE TABLE → drizzle-kit push)
- Обновить `next.config.ts` — убрать sqlite-специфичные настройки
- Создать `.env.example` с нужными переменными

### 4. Cloudflare R2 для файлов (фото чеков, одометра)
- Обновить `src/lib/upload.ts` — загрузка в R2 вместо локальной папки
- Переменные: R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET

### 5. Capacitor — нативные приложения
- `npm install @capacitor/core @capacitor/cli @capacitor/camera @capacitor/geolocation`
- Создать `capacitor.config.ts`
- Настроить сборку под iOS и Android
- Обновить `next.config.ts` для статического экспорта (или WebView режим)

### 6. Мультитенантность (архитектурная подготовка)
- Добавить таблицу `companies` в схему
- Добавить `company_id` в таблицы users, trips, expenses, defects
- Middleware для изоляции данных по компании

### 7. i18n — подготовка
- Установить `next-intl`
- Создать структуру `messages/en.json`, `messages/es.json`
- Обернуть layout в NextIntlClientProvider

---

## Что должен сделать пользователь ДО следующей сессии

См. файл `TODO-FOR-USER.md`

---

## Контекст проекта
- Стек: Next.js 16, Tailwind, Drizzle ORM, SQLite (→ PostgreSQL), iron-session
- БД: audit.db — таблицы: users, trips, expenses, inspections, defects, defect_notes, downtime_events, trip_locations
- Сервер: `npm run dev` в d:/Work/AI/NOTC
- Последнее сделанное: Notes как лог для дефектов (defect_notes таблица, API CRUD, UI с Edit/Delete)

# Твой список задач — сделать до следующей сессии

## Обязательно (без этого не задеплоим)

### 1. Vercel — хостинг для приложения
- Зайти на https://vercel.com
- Зарегистрироваться (можно через GitHub)
- Создать аккаунт, пока ничего не деплоить — Claude сделает сам

### 2. Neon — база данных PostgreSQL в облаке
- Зайти на https://neon.tech
- Зарегистрироваться (бесплатно)
- Создать новый проект (назвать "notc" или любое)
- Скопировать строку подключения (Connection String) — выглядит так:
  postgresql://user:password@host/dbname
- Сохранить эту строку — она понадобится Claude

### 3. GitHub — для связи с Vercel
- Зайти на https://github.com
- Если нет аккаунта — зарегистрироваться
- Сообщить Claude логин на GitHub

### 4. Домен
- Купить домен на https://namecheap.com или https://godaddy.com
- Рекомендую: notcapp.com / getnotc.com / notcfleet.com
- Проверить доступность можно прямо на сайте
- Стоит ~$10-15/год

---

## Желательно (для нативного приложения)

### 5. Apple Developer Account (для App Store)
- Зайти на https://developer.apple.com
- Зарегистрироваться — стоит $99/год
- Нужен Apple ID

### 6. Google Play Developer Account (для Android)
- Зайти на https://play.google.com/console
- Зарегистрироваться — стоит $25 один раз
- Нужен Google аккаунт

### 7. Cloudflare R2 (для хранения фото)
- Зайти на https://cloudflare.com
- Зарегистрироваться (бесплатно)
- Перейти в R2 Storage → создать bucket с именем "notc-uploads"
- Скопировать Account ID, Access Key, Secret Key
- Сохранить — понадобится Claude

---

## Не срочно (можно позже)

- Amazon Appstore (бесплатно, тот же Android APK что и для Google Play)
- Microsoft Store (PWA можно опубликовать бесплатно)

---

## Итого минимальный бюджет для запуска
| Что | Цена |
|---|---|
| Vercel | Бесплатно |
| Neon PostgreSQL | Бесплатно |
| GitHub | Бесплатно |
| Домен | ~$12/год |
| Google Play | $25 (раз) |
| Apple Developer | $99/год |
| **Итого минимум** | **~$136** |

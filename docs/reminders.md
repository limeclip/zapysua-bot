# Нагадування та автоматичні повідомлення ZapysUa

## Огляд

Система нагадувань працює через endpoint `GET/POST /api/cron/reminders`, який викликає `processReminders()` з `lib/reminders.ts`.

## Типи автоматичних повідомлень

| Тип | Коли відправляється | Отримувач |
|-----|---------------------|-----------|
| `reminder_24h` | За 2–24 години до запису | Клієнт |
| `reminder_2h` | За 0–2 години до запису | Клієнт |
| `thank_you` | Через N годин після `completed` | Клієнт |
| `return_client` | Через N днів після останнього візиту | Клієнт |

Усі відправки логуються в таблицю `notifications` — повторна відправка того ж типу для одного запису не виконується.

## Змінні середовища

```env
# Увімкнення нагадувань
REMINDER_24H_ENABLED=true
REMINDER_2H_ENABLED=true

# Рекомендований розклад для зовнішнього cron (документація)
REMINDER_CRON_SCHEDULE="0 * * * *"

# Подяка після візиту
THANK_YOU_ENABLED=true
THANK_YOU_HOURS_AFTER=3

# Повернення клієнтів
RETURN_CLIENTS_ENABLED=true
RETURN_DAYS=30

# Захист cron endpoint
CRON_SECRET=your_random_secret_here
```

> `REMINDER_CRON_SCHEDULE` використовується для документації та відповіді API. Розклад налаштовується у зовнішньому cron-провайдері (Vercel Cron, cron-job.org тощо).

## Налаштування Cron

### Vercel Cron Jobs

У `vercel.json` (якщо використовується):

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

Запит має містити заголовок:

```
Authorization: Bearer <CRON_SECRET>
```

### Зовнішній провайдер (cron-job.org)

1. URL: `https://zapysua-bot.vercel.app/api/cron/reminders`
2. Метод: `GET` або `POST`
3. Заголовок: `Authorization: Bearer <CRON_SECRET>`
4. Розклад: кожну годину (`0 * * * *`) або за вашим `REMINDER_CRON_SCHEDULE`

## Ручне тестування

```bash
curl -X GET "http://localhost:3000/api/cron/reminders" \
  -H "Authorization: Bearer your_cron_secret"
```

### Тест нагадування за 2 години

1. Створіть запис зі статусом `confirmed` і `client_telegram_id`.
2. Встановіть `booking_start` на час через ~1.5 години від поточного.
3. Викличте `/api/cron/reminders`.
4. Перевірте Telegram і таблицю `notifications` (тип `reminder_2h`).

### Тест подяки після візиту

1. Створіть запис зі статусом `completed`, `booking_start` — 4+ години тому.
2. Викличте cron endpoint.
3. Очікуйте повідомлення «Дякуємо за візит!» і запис `thank_you` в `notifications`.

## Повідомлення клієнту та майстру

Тексти формуються в `lib/notifications.ts`:

- `notifyMasterNewBooking` — новий запис від клієнта
- `notifyMasterBookingCreated` — ручне створення майстром
- `notifyMasterBookingStatusChange` — скасування / no-show
- `notifyClientBookingStatusChange` — всі статуси для клієнта

Усі клієнтські повідомлення містять deep link `t.me/Bot/app?startapp={slug}` через `getClientStartAppLink`. Посилання для майстра ведуть на веб-дашборд.

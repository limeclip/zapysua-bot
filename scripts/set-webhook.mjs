import "dotenv/config";

const botToken = process.env.BOT_TOKEN;
const webhookUrl = process.env.WEBHOOK_URL;

if (!botToken || !webhookUrl) {
  console.error(
    "Помилка: встановіть BOT_TOKEN та WEBHOOK_URL у файлі .env або змінних середовища",
  );
  process.exit(1);
}

const response = await fetch(
  `https://api.telegram.org/bot${botToken}/setWebhook`,
  {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ url: webhookUrl }),
  },
);

const result = await response.json();
console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}

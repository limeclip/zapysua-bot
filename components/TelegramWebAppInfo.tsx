"use client";

import { useEffect, useState } from "react";

export function TelegramWebAppInfo() {
  const [userName, setUserName] = useState<string | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;

    if (!webApp) {
      return;
    }

    webApp.ready();
    webApp.expand();
    setIsTelegram(true);

    const user = webApp.initDataUnsafe?.user;
    if (user?.first_name) {
      const fullName = [user.first_name, user.last_name]
        .filter(Boolean)
        .join(" ");
      setUserName(fullName);
    }
  }, []);

  if (!isTelegram) {
    return (
      <p className="text-sm text-zinc-500">
        Відкрийте цю сторінку через Telegram, щоб побачити дані профілю.
      </p>
    );
  }

  if (userName) {
    return (
      <p className="text-sm text-zinc-600">
        Вітаємо, <span className="font-medium text-zinc-900">{userName}</span>!
      </p>
    );
  }

  return (
    <p className="text-sm text-zinc-500">
      Telegram Mini App підключено. Дані профілю недоступні.
    </p>
  );
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type TelegramContextValue = {
  initData: string;
  userId: number | null;
  username?: string;
  firstName?: string;
  ready: boolean;
};

const TelegramContext = createContext<TelegramContextValue>({
  initData: "",
  userId: null,
  ready: false,
});

export function useTelegram() {
  return useContext(TelegramContext);
}

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TelegramContextValue>({
    initData: "",
    userId: null,
    ready: false,
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();

      const user = tg.initDataUnsafe?.user;

      setState({
        initData: tg.initData ?? "",
        userId: user?.id ?? null,
        username: user?.username,
        firstName: user?.first_name,
        ready: true,
      });
      return;
    }

    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID
    ) {
      setState({
        initData: "",
        userId: parseInt(process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID, 10),
        firstName: "Dev",
        ready: true,
      });
      return;
    }

    setState((s) => ({ ...s, ready: true }));
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
  );
}

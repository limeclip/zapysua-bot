"use client";

import { useEffect } from "react";
import { MiniAppShell } from "@/components/MiniAppShell";

export default function Home() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    console.log("[MiniApp Home] URL:", window.location.href);
    console.log("[MiniApp Home] initDataUnsafe:", tg?.initDataUnsafe ?? null);
    console.log(
      "[MiniApp Home] start_param:",
      tg?.initDataUnsafe?.start_param ?? "(немає)",
    );
  }, []);

  return <MiniAppShell />;
}

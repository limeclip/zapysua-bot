"use client";

import { useEffect, useState } from "react";

export default function HomePage() {

  const [logs, setLogs] = useState<string[]>([]);

  function addLog(message: string) {
    console.log(message);

    setLogs((prev) => [...prev, message]);
  }

  useEffect(() => {

    async function init() {

      try {

        const tg = window.Telegram?.WebApp;

        addLog("MINI APP START");

        if (tg) {
          tg.ready();
          tg.expand();

          addLog("Telegram WebApp READY");
        } else {
          addLog("Telegram WebApp NOT FOUND");
        }

        addLog(`URL: ${window.location.href}`);

        let startParam: string | null = null;

        // TELEGRAM PARAM
        if (tg?.initDataUnsafe?.start_param) {

          startParam =
            tg.initDataUnsafe.start_param;

          addLog(
            `start_param from Telegram: ${startParam}`
          );
        }

        // URL FALLBACK
        if (!startParam) {

          const params =
            new URLSearchParams(
              window.location.search
            );

          startParam =
            params.get("tgWebAppStartParam") ||
            params.get("startapp");

          addLog(
            `start_param from URL: ${startParam}`
          );
        }

        // RESULT
        addLog(
          `FINAL START PARAM: ${startParam}`
        );

        // NO PARAM
        if (!startParam) {

          addLog("PARAM NOT FOUND");

          return;
        }

        // TEST REDIRECT
        addLog(
          `REDIRECT TO: /client/${startParam}`
        );

        // НЕ редиректим пока
        // window.location.href =
        //   `/client/${startParam}`;

      } catch (error: any) {

        addLog(
          `ERROR: ${error?.message}`
        );
      }
    }

    init();

  }, []);

  return (
    <div
      style={{
        padding: 20,
        fontSize: 16,
        color: "white",
        background: "black",
        minHeight: "100vh",
      }}
    >
      <h1>DEBUG MINI APP</h1>

      {logs.map((log, index) => (
        <div key={index}>
          {log}
        </div>
      ))}
    </div>
  );
}
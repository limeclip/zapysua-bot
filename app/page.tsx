import Script from "next/script";
import { TelegramWebAppInfo } from "@/components/TelegramWebAppInfo";

export default function Home() {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-6 py-12">
        <main className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
          <div className="mb-2 text-center text-3xl">🤖</div>
          <h1 className="mb-2 text-center text-2xl font-semibold text-zinc-900">
            ZapysUa
          </h1>
          <p className="mb-6 text-center text-zinc-600">
            Ваш особистий кабінет ZapysUa незабаром буде доступний
          </p>
          <div className="rounded-lg bg-zinc-50 p-4">
            <TelegramWebAppInfo />
          </div>
        </main>
      </div>
    </>
  );
}

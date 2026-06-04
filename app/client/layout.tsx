import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Запис — ZapysUa",
  description: "Запишіться до майстра через ZapysUa",
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
      <main className="flex-1 px-4 py-6">{children}</main>
      <footer className="px-4 pb-6 pt-2 text-center text-[10px] text-zinc-400">
        Працює на ZapysUa
      </footer>
    </div>
  );
}

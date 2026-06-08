import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Запис — ZapysUA",
  description: "Запишіться до майстра через ZapysUA",
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
        Працює на
        <Link href={"https://t.me/ZapysUaBot"} target="_blank" className="ml-1 hover:underline">
          ZapysUA
        </Link>
      </footer>
    </div>
  );
}

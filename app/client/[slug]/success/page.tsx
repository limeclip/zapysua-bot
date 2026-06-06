import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ClientBookingSuccessPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-in fade-in">
      <Card className="w-full max-w-sm space-y-4 p-6">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Ваш запис підтверджено!
        </h1>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Нагадування прийде в Telegram. Очікуйте підтвердження від майстра.
        </p>
        <Link href={`/client/${encodeURIComponent(slug)}`} className="block">
          <Button variant="outline" className="w-full">
            Повернутися до профілю
          </Button>
        </Link>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

export default function PaymentPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6">
      <Card className="w-full text-center">
        <CreditCard className="mx-auto mb-4 h-10 w-10 text-zinc-400" />
        <h1 className="mb-2 text-lg font-semibold">Оплата підписки</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Оплата через Telegram Stars з&apos;явиться на наступному етапі
          розробки.
        </p>
        <Link href="/">
          <Button variant="outline" className="w-full">
            Назад до кабінету
          </Button>
        </Link>
      </Card>
    </div>
  );
}

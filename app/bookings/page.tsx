"use client";

import { BookingsPageContent } from "@/components/bookings/BookingsPageContent";
import { MiniAppPageShell } from "@/components/MiniAppPageShell";

export default function BookingsPage() {
  return (
    <MiniAppPageShell title="Записи">
      {(master) => <BookingsPageContent master={master} />}
    </MiniAppPageShell>
  );
}

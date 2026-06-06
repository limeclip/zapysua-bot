"use client";

import { ClientBookingsList } from "@/components/client/ClientBookingsList";

type ClientMasterBookingsProps = {
  masterId: string;
};

export function ClientMasterBookings({ masterId }: ClientMasterBookingsProps) {
  return <ClientBookingsList masterId={masterId} showMaster={false} />;
}

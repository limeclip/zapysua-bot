"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PublicMasterProfile } from "@/types";
import { Camera, Clock } from "lucide-react";

type ServiceItem = PublicMasterProfile["services"][number];

type ClientServicesTabProps = {
  services: ServiceItem[];
  layout: "list" | "grid";
  bookHref: string;
};

function ServiceImagePlaceholder() {
  return (
    <div className="flex aspect-[9/16] w-full items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-800">
      <Camera className="h-6 w-6 text-zinc-400" />
    </div>
  );
}

function ServiceListCard({
  service,
  bookHref,
}: {
  service: ServiceItem;
  bookHref: string;
}) {
  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">
          {service.name}
        </p>
        <p className="mt-1 flex items-center gap-3 text-sm text-zinc-500">
          <span>{service.price} грн</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {service.duration_minutes} хв
          </span>
        </p>
        {service.description && (
          <p className="mt-1 text-xs text-zinc-400">{service.description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {service.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.image_url}
            alt=""
            className="h-12 w-12 rounded-lg object-cover"
          />
        )}
        <Link href={`${bookHref}?service=${encodeURIComponent(service.id)}`}>
          <Button size="sm" variant="outline">
            Обрати
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function ServiceGridCard({
  service,
  bookHref,
}: {
  service: ServiceItem;
  bookHref: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {service.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={service.image_url}
          alt=""
          className="aspect-[9/16] w-full rounded-lg object-cover"
        />
      ) : (
        <ServiceImagePlaceholder />
      )}
      <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
        {service.name}
      </p>
      <p className="text-[11px] text-zinc-500">{service.price} грн</p>
      <Link href={`${bookHref}?service=${encodeURIComponent(service.id)}`}>
        <Button size="sm" variant="outline" className="h-8 w-full text-xs">
          Обрати
        </Button>
      </Link>
    </div>
  );
}

export function ClientServicesTab({
  services,
  layout,
  bookHref,
}: ClientServicesTabProps) {
  if (services.length === 0) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-zinc-500">
          Послуг поки немає
        </p>
      </Card>
    );
  }

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-3 gap-2">
        {services.map((service) => (
          <ServiceGridCard
            key={service.id}
            service={service}
            bookHref={bookHref}
          />
        ))}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {services.map((service) => (
        <li key={service.id}>
          <ServiceListCard service={service} bookHref={bookHref} />
        </li>
      ))}
    </ul>
  );
}

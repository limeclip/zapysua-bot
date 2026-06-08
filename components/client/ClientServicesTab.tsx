"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ServiceDetailsDrawer } from "./ServiceDetailsDrawer";
import type { PublicMasterProfile } from "@/types";
import { CalendarPlus, Camera, Clock, SquareArrowOutUpRight } from "lucide-react";

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
  onViewDetails,
}: {
  service: ServiceItem;
  bookHref: string;
  onViewDetails: () => void;
}) {
  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="flex shrink-0 items-center gap-4">
        {service.image_url && (
          <button onClick={onViewDetails} className="cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={service.image_url}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
          </button>
        )}
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
            <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
              {service.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Button size="icon" variant="outline" onClick={onViewDetails}>
          <SquareArrowOutUpRight className="h-5 w-5" />
        </Button>
        <Link href={`${bookHref}?service=${encodeURIComponent(service.id)}`}>
          <Button size="icon" variant="outline">
          <CalendarPlus className="h-5 w-5"/>
            {/* Обрати */}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function ServiceGridCard({
  service,
  bookHref,
  onViewDetails,
}: {
  service: ServiceItem;
  bookHref: string;
  onViewDetails: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative cursor-pointer" onClick={onViewDetails}>
        {service.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.image_url}
            alt=""
            className="aspect-[9/16] w-full rounded-md object-cover"
          />
        ) : (
          <ServiceImagePlaceholder />
        )}
        <div className="flex flex-col w-full absolute bottom-0 left-0">
          <div className="bg-gradient-to-b from-transparent to-black/80 flex flex-col p-2 pt-12 px-3 w-full text-white rounded-b-md">
            <p className="truncate text-xs font-medium line-clamp-2">
              {service.name}
            </p>
            <p className="text-[11px]">{service.price} грн</p>
          </div>
        </div>
        <div className="absolute top-2 right-2">
          <Link
            href={`${bookHref}?service=${encodeURIComponent(service.id)}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="icon"
              variant="outline"
              className="text-xs dark:bg-secondary dark:hover:bg-secondary/50"
            >
              <CalendarPlus className="text-foreground " />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ClientServicesTab({
  services,
  layout,
  bookHref,
}: ClientServicesTabProps) {
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(
    null,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleViewDetails = (service: ServiceItem) => {
    setSelectedService(service);
    setDrawerOpen(true);
  };

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
      <>
        <div className="grid grid-cols-3 gap-1 -mt-2">
          {services.map((service) => (
            <ServiceGridCard
              key={service.id}
              service={service}
              bookHref={bookHref}
              onViewDetails={() => handleViewDetails(service)}
            />
          ))}
        </div>
        <ServiceDetailsDrawer
          service={selectedService}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          bookHref={bookHref}
        />
      </>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {services.map((service) => (
          <li key={service.id}>
            <ServiceListCard
              service={service}
              bookHref={bookHref}
              onViewDetails={() => handleViewDetails(service)}
            />
          </li>
        ))}
      </ul>
      <ServiceDetailsDrawer
        service={selectedService}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        bookHref={bookHref}
      />
    </>
  );
}
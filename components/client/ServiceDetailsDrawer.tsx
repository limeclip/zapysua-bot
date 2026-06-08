"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Clock, Camera } from "lucide-react";
import Link from "next/link";
import type { PublicMasterProfile } from "@/types";

type ServiceItem = PublicMasterProfile["services"][number];

interface ServiceDetailsDrawerProps {
  service: ServiceItem | null;
  open: boolean;
  onClose: () => void;
  bookHref: string;
}

function ServiceImagePlaceholder() {
  return (
    <div className="flex aspect-[9/16] w-full items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-800">
      <Camera className="h-8 w-8 text-zinc-400" />
    </div>
  );
}

export function ServiceDetailsDrawer({
  service,
  open,
  onClose,
  bookHref,
}: ServiceDetailsDrawerProps) {
  if (!service) return null;

  const bookingUrl = `${bookHref}?service=${encodeURIComponent(service.id)}`;

  return (
    <Drawer open={open} onOpenChange={onClose} direction="right">
      <DrawerContent className="w-full! mx-auto max-w-lg rounded-l-xl">
        <DrawerHeader className="border-b border-zinc-100 dark:border-zinc-800">
          <DrawerTitle className="text-center">Деталі послуги</DrawerTitle>
          <DrawerDescription className="text-center">
            {service.name}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 p-4">
          {/* Фото */}
          {service.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={service.image_url}
              alt={service.name}
              className="w-full rounded-xl object-cover max-h-64"
            />
          ) : (
            <ServiceImagePlaceholder />
          )}

          {/* Ціна та тривалість */}
          <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {service.price} грн
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {service.duration_minutes} хв
            </span>
          </div>

          {/* Повний опис */}
          {service.description && (
            <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {service.description}
              </p>
            </div>
          )}

          {/* Місце для майбутніх відгуків */}
          {/* <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-500">Відгуки</p>
            <p className="text-sm text-zinc-400">Ще немає відгуків</p>
          </div> */}
        </div>

        <DrawerFooter className="border-t border-zinc-100 dark:border-zinc-800">
          <Link href={bookingUrl} onClick={onClose}>
            <Button className="w-full">Записатися</Button>
          </Link>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Закрити
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
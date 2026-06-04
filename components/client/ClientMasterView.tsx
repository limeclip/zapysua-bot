"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PublicMasterProfile } from "@/types";
import { Calendar, Clock } from "lucide-react";

type ClientMasterViewProps = {
  profile: PublicMasterProfile;
};

export function ClientMasterView({ profile }: ClientMasterViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col items-center text-center">
        {profile.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.logo_url}
            alt=""
            className="mb-4 h-28 w-28 rounded-2xl object-cover shadow-sm"
          />
        ) : (
          <div className="mb-4 flex h-28 w-28 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <Calendar className="h-10 w-10 text-zinc-400" />
          </div>
        )}
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {profile.business_name}
        </h1>
        {profile.description && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {profile.description}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Послуги
        </h2>
        {profile.services.length === 0 ? (
          <Card>
            <p className="py-6 text-center text-sm text-zinc-500">
              Послуг поки немає
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {profile.services.map((service) => (
              <Card key={service.id}>
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
                  <p className="mt-2 text-xs text-zinc-400">
                    {service.description}
                  </p>
                )}
              </Card>
            ))}
          </ul>
        )}
      </div>

      <Button className="w-full" disabled>
        Обрати час
      </Button>
      <p className="text-center text-xs text-zinc-400">
        Вибір дати та часу з&apos;явиться незабаром
      </p>
    </div>
  );
}

export function ClientMasterSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <Skeleton className="mb-4 h-28 w-28 rounded-2xl" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function ClientNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <Calendar className="mb-4 h-12 w-12 text-zinc-300" />
      <h1 className="text-lg font-semibold">Такий майстер не існує</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Перевірте посилання або зверніться до майстра
      </p>
    </div>
  );
}

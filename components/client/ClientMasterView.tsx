"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientMasterBookings } from "@/components/client/ClientMasterBookings";
import { ClientServicesTab } from "@/components/client/ClientServicesTab";
import {
  ClientMasterTabBar,
  type ClientMasterTabId,
} from "@/components/client/ClientMasterTabBar";
import { ChatButton } from "@/components/ai/ChatButton";
import { getCategoryLabel } from "@/lib/master-category";
import { cn } from "@/lib/utils";
import type { PublicMasterProfile, SocialLinks } from "@/types";
import { BellIcon, Calendar, Globe, MapPin, Phone, User } from "lucide-react";
import { ThemeToggleIcon } from "../shared/ThemeToggleIcon";

type ClientMasterViewProps = {
  profile: PublicMasterProfile;
};

function SocialIcon({
  network,
  className,
}: {
  network: keyof SocialLinks;
  className?: string;
}) {
  const common = { className, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true as const };
  switch (network) {
    case "instagram":
      return (
        <svg {...common}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.241 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.241 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.241-1.308-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.241-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.18 8.18 0 0 0 4.77 1.52V6.82a4.84 4.84 0 0 1-1.1-.13z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "telegram":
      return (
        <svg {...common}>
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "website":
      return <Globe className={className} aria-hidden />;
  }
}

const SOCIAL_ITEMS: { key: keyof SocialLinks; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "telegram", label: "Telegram" },
  { key: "youtube", label: "YouTube" },
  { key: "website", label: "Веб-сайт" },
];

function getTelegramUserId(): number | null {
  if (typeof window === "undefined") return null;
  const id = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return typeof id === "number" ? id : null;
}

export function ClientMasterView({ profile }: ClientMasterViewProps) {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug ?? "");
  const bookHref = `/client/${encodeURIComponent(slug)}/book`;
  const [tab, setTab] = useState<ClientMasterTabId>("services");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);


  const [showReadMore, setShowReadMore] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (descRef.current && profile.description) {
      const el = descRef.current;
      // Якщо висота тексту більша за висоту блоку (після line-clamp-2) – показуємо кнопку
      setShowReadMore(el.scrollHeight > el.clientHeight);
    }
  }, [profile.description]);

  useEffect(() => {
    setIsAuthenticated(getTelegramUserId() !== null);
  }, []);

  const socialEntries = SOCIAL_ITEMS.filter(
    (item) => profile.social_links?.[item.key],
  );

  return (
    <div className="flex flex-col gap-5 animate-in fade-in pb-8">
      <div className="relative flex flex-col items-center ">

        <div className="absolute right-0 top-0">
          <div className="flex items-center gap-3">
            <ThemeToggleIcon />
            {/* {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
              >
                <BellIcon className="size-5" strokeWidth={1} />
              </Button>
            )} */}
          </div>

        </div>
        {profile.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.logo_url}
            alt=""
            className="mb-3 h-22 w-22 rounded-full object-cover shadow-sm ring-2 ring-zinc-100 dark:ring-zinc-800"
          />
        ) : (
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Calendar className="h-8 w-8 text-zinc-400" />
          </div>
        )}
        {/* Название */}
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {profile.business_name}
        </h1>
        <Badge variant="secondary" className="mt-2">
          {getCategoryLabel(profile.category)}
        </Badge>
      </div>


      {/* Кнопки */}
      <div className="flex flex-row flex-wrap gap-1">
        <Link href={bookHref} className="min-w-0 flex-1">
          <Button className="w-full h-10 rounded-2xl">
            <Calendar className="h-4 w-4" />
            Записатися
            {/* Обрати час */}
          </Button>
        </Link>
        {profile.phone && (
          <a
            href={`tel:${profile.phone}`}
            className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-transparent text-sm font-medium transition-all hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <Phone className="h-4 w-4" />
            Позвонити
          </a>
        )}
        {isAuthenticated && (
          <Button
            type="button"
            onClick={() => router.push("/client/account")}
            className="h-10 w-11 rounded-xl"
            variant={"outline"}
            size={"icon"}
            aria-label="Мій кабінет"
          >
            <User className="h-5 w-5" />
          </Button>
        )}
      </div>

      {profile.description && (
        <div className="flex flex-col items-center gap-1 text-center px-2">
          <p
            ref={descRef}
            className={cn(
              "text-sm leading-relaxed text-zinc-600 dark:text-zinc-400",
              !descriptionExpanded && "line-clamp-2",
            )}
          >
            {profile.description}
          </p>
          {showReadMore && (
            <button
              type="button"
              onClick={() => setDescriptionExpanded((prev) => !prev)}
              className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
            >
              {descriptionExpanded ? "Сховати" : "Читати далі"}
            </button>
          )}
        </div>
      )}

      {/* адрес телефон */}
      {(profile.location || profile.phone) && (
        <div className="flex flex-row flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground dark:text-zinc-400">
          {profile.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
              {profile.location}
            </span>
          )}
          {profile.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4 shrink-0 text-zinc-400" />
              <a
                href={`tel:${profile.phone}`}
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {profile.phone}
              </a>
            </span>
          )}
        </div>
      )}


      {socialEntries.length > 0 && (
        <div className="flex flex-row items-center justify-center gap-4">
          {socialEntries.map(({ key, label }) => {
            const href = profile.social_links?.[key];
            if (!href) return null;
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                <SocialIcon network={key} className="h-5 w-5" />
              </a>
            );
          })}
        </div>
      )}
      <div className="flex flex-col gap-3">
        <ClientMasterTabBar active={tab} onChange={setTab} />

        {tab === "services" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <ClientServicesTab
                services={profile.services}
                layout={profile.services_layout ?? "list"}
                bookHref={bookHref}
              />
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <ClientMasterBookings masterId={profile.id} />
        )}
      </div>

      <ChatButton masterId={profile.id} businessName={profile.business_name} />
    </div>
  );
}

export function ClientMasterSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <Skeleton className="mb-3 h-20 w-20 rounded-full" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-10 w-full" />
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

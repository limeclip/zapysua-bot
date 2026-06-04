"use client";

import { useEffect, useState } from "react";
import {
  ClientMasterSkeleton,
  ClientMasterView,
  ClientNotFound,
} from "@/components/client/ClientMasterView";
import type { PublicMasterProfile } from "@/types";

export function ClientPageContent({ slug }: { slug: string }) {
  const [profile, setProfile] = useState<PublicMasterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/public/masters/${encodeURIComponent(slug)}`,
        );
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (!cancelled) {
          setProfile(data.master);
          setNotFound(false);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <ClientMasterSkeleton />;
  if (notFound || !profile) return <ClientNotFound />;
  return <ClientMasterView profile={profile} />;
}

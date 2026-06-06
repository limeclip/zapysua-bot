import { Suspense } from "react";
import { ClientBookContent } from "@/components/client/ClientBookContent";
import { ClientMasterSkeleton } from "@/components/client/ClientMasterView";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ClientBookPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<ClientMasterSkeleton />}>
      <ClientBookContent slug={slug} />
    </Suspense>
  );
}

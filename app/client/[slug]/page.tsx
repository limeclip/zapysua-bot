import { ClientPageContent } from "@/components/client/ClientPageContent";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ClientMasterPage({ params }: PageProps) {
  const { slug } = await params;
  return <ClientPageContent slug={slug} />;
}

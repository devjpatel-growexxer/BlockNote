import { DocumentWorkspace } from "@/components/document-workspace";
import { SiteHeader } from "@/components/site-header";

export default async function DocumentPage({ params }) {
  const { id } = await params;

  return (
    <main className="app-shell">
      <SiteHeader />
      <DocumentWorkspace documentId={id} />
    </main>
  );
}

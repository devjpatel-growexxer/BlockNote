import { SharedDocumentView } from "@/components/shared-document-view";

export default async function SharedDocumentPage({ params }) {
  const { token } = await params;

  return <SharedDocumentView token={token} />;
}

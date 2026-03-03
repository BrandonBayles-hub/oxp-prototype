import DocumentDetailPage from "./client-page";

export function generateStaticParams() {
  return [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }];
}

export default function Page() {
  return <DocumentDetailPage />;
}

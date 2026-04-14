import { DashboardShell } from "@/components/dashboard-shell";
import { SiteHeader } from "@/components/site-header";

export default function DashboardPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <section className="content-shell">
        <DashboardShell />
      </section>
    </main>
  );
}

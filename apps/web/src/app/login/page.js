import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <section className="content-shell auth-layout">
        <AuthForm mode="login" />
      </section>
    </main>
  );
}

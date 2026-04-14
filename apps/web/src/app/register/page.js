import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";

export default function RegisterPage() {
  return (
    <main className="app-shell">
      <SiteHeader />
      <section className="content-shell auth-layout">
        <AuthForm mode="register" />
      </section>
    </main>
  );
}

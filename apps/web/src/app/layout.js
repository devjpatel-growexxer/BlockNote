import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata = {
  title: "BlockNote Editor",
  description: "Production-grade block editor built without block editor libraries."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

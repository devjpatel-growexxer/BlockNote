import "./globals.css";

export const metadata = {
  title: "BlockNote Editor",
  description: "Production-grade block editor built without block editor libraries."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

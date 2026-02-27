import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopify x Sendit - Order Management",
  description: "Automate order management between Shopify and Sendit delivery service",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZooMarkets - Bet Your Reputation",
  description: "Prediction markets for Zoom calls. Bet Clout on meeting chaos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}

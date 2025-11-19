import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Builder - Build React Apps with AI',
  description: 'Production-ready AI web app builder with 90% token savings',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import './globals.css';
import ThemeRegistry from '@/components/theme-registry';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'X Auto DM',
  description: 'X Auto DM Tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}

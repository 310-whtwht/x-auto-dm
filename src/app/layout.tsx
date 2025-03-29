import '@/styles/globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import type { Metadata } from 'next';

// IBM Plex Sans JPフォントのインポート
import '@fontsource/ibm-plex-sans-jp/300.css';

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
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

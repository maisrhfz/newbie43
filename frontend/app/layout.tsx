import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NAVER Late',
  description: 'Know the latest moment you can leave to make it to your event on time.',
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
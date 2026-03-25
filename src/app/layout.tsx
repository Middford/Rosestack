import type { Metadata } from 'next';
import { Sidebar } from '@/shared/ui/sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'RoseStack Energy Platform',
  description: 'Battery storage deployment and management platform for RoseStack Energy',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-64 flex-1 p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from "@/components/ui/toaster";
import { MobileNavbar } from '@/components/mobile-navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Ailem - Yaşam Asistanı',
  description: 'Modern ve renkli aile yaşam asistanınız.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <main className="p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 h-full">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
        <MobileNavbar />
        <Toaster />
      </body>
    </html>
  );
}

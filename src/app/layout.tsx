import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from "@/components/ui/toaster";

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
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-body antialiased`}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}

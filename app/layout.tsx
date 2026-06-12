import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { POSProvider } from './context/POSContext'
import { Toaster } from '@/components/ui/sonner'
import SignOutButton from '@/components/SignOutButton'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'EDKFT - POS',
  description: 'Point of Sale System for Frozen Treats Dessert Cafe',
  generator: '',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-slate-50">
      <body className="font-sans antialiased bg-slate-50">
        <POSProvider>
          <div className="w-full flex justify-end items-center p-2">
            <SignOutButton />
          </div>
          {children}
        </POSProvider>
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

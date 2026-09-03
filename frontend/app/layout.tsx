import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Manrope, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans-family',
  weight: ['400', '500', '600', '700', '800'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-family',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Packdraft — Pokémon TCG Portfolio & Market Intelligence',
  description:
    'Track your Pokémon card and sealed collection, understand what it is worth, and research the Pokémon TCG market like a serious investor.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0b0f',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark bg-background ${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

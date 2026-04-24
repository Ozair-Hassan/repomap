import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Ask Your Codebase — Repo Intelligence',
  description:
    'Point at any public GitHub repository, ask a question in plain English, and watch an AI agent explore the code to find the answer in real time.',
  keywords: [
    'GitHub',
    'code analysis',
    'AI agent',
    'repository explorer',
    'developer tools',
  ],
  authors: [{ name: 'Repo Intelligence' }],
  openGraph: {
    title: 'Ask Your Codebase',
    description: 'AI-powered code exploration for any public GitHub repo.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Ask Your Codebase',
    description: 'AI-powered code exploration for any public GitHub repo.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a08',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}

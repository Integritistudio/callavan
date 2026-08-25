// app/layout.jsx
// Root layout — sets fonts, meta, and global CSS

import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Call-A-Van',
  description: 'Find live van drivers near you instantly.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}

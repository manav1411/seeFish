import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'seefish',
  description:
    'How many Australians match your dating preferences? Find out with real ABS Census data.',
  keywords: [
    'seefish',
    'dating pool calculator',
    'australia dating statistics',
    'ABS census data',
    'how many single people',
    'dating demographics australia',
  ],
  openGraph: {
    title: 'seefish',
    description: 'Find out how many Australians match your dating preferences using real census data.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full lg:overflow-hidden">
      <body className="h-full bg-white text-black font-sans overflow-y-auto lg:overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-100 shrink-0">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 text-black hover:opacity-80 transition-opacity">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.46-3.44 6-7 6-3.56 0-7.56-2.54-8.5-6z"/>
                <circle cx="15" cy="12" r="2"/>
                <path d="M6.5 12c-1.5 0-3.5-1-5.5-1 2 1 3 3 3 3s-1 2-3 3c2 0 4-1 5.5-1"/>
              </svg>
              <span className="text-base font-semibold tracking-tight">seefish</span>
            </a>
            <div className="text-sm text-gray-500">
              a <a href="https://manavdodia.com" target="_blank" rel="noopener noreferrer" className="text-black hover:underline font-medium">Manav Dodia</a> project
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-5xl mx-auto px-6 min-h-[calc(100vh-57px)] lg:h-[calc(100vh-57px)] overflow-y-auto lg:overflow-hidden pb-12 lg:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}

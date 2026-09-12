import type { Metadata } from 'next';
import './globals.css';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

export const metadata: Metadata = {
  title: 'Dating Pool Calculator — Australia',
  description:
    'How many Australians match your dating preferences? Find out with real ABS Census data. Select age, height, income, ethnicity, and city to see your dating pool.',
  keywords: [
    'dating pool calculator',
    'australia dating statistics',
    'ABS census data',
    'how many single people',
    'dating demographics australia',
  ],
  openGraph: {
    title: 'Dating Pool Calculator — Australia',
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
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💘</span>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  Dating Pool Calculator
                </h1>
                <p className="text-xs text-gray-400">Australia · Powered by ABS Census 2021</p>
              </div>
            </div>
            <a
              href="https://www.abs.gov.au/census/find-census-data"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-primary-500 transition-colors"
            >
              Data source ↗
            </a>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-2xl mx-auto px-4 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-100 bg-white mt-12">
          <div className="max-w-2xl mx-auto px-4 py-6 text-center">
            <p className="text-xs text-gray-400">
              Built with data from the{' '}
              <a
                href="https://www.abs.gov.au"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:underline"
              >
                Australian Bureau of Statistics
              </a>
              . Census 2021 &amp; National Health Survey 2017-18.
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Estimates are statistical approximations. Individual results may vary.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

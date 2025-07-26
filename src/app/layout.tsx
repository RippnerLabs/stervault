import './globals.css'
import { ClusterProvider } from '@/components/cluster/cluster-data-access'
import { SolanaProvider } from '@/components/solana/solana-provider'
import { ReactQueryProvider } from '@/app/react-query-provider'

export const metadata = {
  title: 'Stervault',
  description: 'Lend, borrow, and earn with ultra-fast transactions and competitive rates. Our secure platform makes DeFi accessible to everyone on the Solana blockchain.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          <ClusterProvider>
            <SolanaProvider>
              {children}
            </SolanaProvider>
          </ClusterProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}

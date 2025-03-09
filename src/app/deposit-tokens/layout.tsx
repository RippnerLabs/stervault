import '../../app/globals.css'
import { ClusterProvider } from '@/components/cluster/cluster-data-access'
import { SolanaProvider } from '@/components/solana/solana-provider'
import { ReactQueryProvider } from '../../app/react-query-provider'

export const metadata = {
  title: 'Deposit Tokens',
  description: 'Deposit tokens into a bank',
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

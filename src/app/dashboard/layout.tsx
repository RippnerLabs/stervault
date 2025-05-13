'use client';

import '../../app/globals.css'
import { ClusterProvider } from '@/components/cluster/cluster-data-access'
import { SolanaProvider } from '@/components/solana/solana-provider'
import { UiLayout } from '@/components/ui/ui-layout'
import { ReactQueryProvider } from '../../app/react-query-provider'
import { ThemeProvider } from 'next-themes';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
      {/* <ThemeProvider attribute="class" defaultTheme="system" enableSystem> */}
        <ReactQueryProvider>
          <ClusterProvider>
            <SolanaProvider>
                {children}
            </SolanaProvider>
          </ClusterProvider>
        </ReactQueryProvider>
        {/* </ThemeProvider> */}
        </body>
    </html>
  );
}

import { FC, ReactNode, useMemo, createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  ConnectionProvider, 
  WalletProvider,
  useWallet,
  useConnection
} from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, Connection } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletConfig {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcEndpoint: string;
  crossmintEnabled: boolean;
  aiAgentWallet: string | null;
}

interface SolanaWalletContextType {
  isConnected: boolean;
  publicKey: string | null;
  walletType: 'external' | 'crossmint' | null;
  crossmintWallet: string | null;
  crossmintEmail: string | null;
  config: WalletConfig | null;
  isLoading: boolean;
  error: string | null;
  createCrossmintWallet: (email: string) => Promise<boolean>;
  linkExternalWallet: (walletAddress: string) => Promise<boolean>;
  refreshWalletStatus: () => Promise<void>;
}

const SolanaWalletContext = createContext<SolanaWalletContextType>({
  isConnected: false,
  publicKey: null,
  walletType: null,
  crossmintWallet: null,
  crossmintEmail: null,
  config: null,
  isLoading: true,
  error: null,
  createCrossmintWallet: async () => false,
  linkExternalWallet: async () => false,
  refreshWalletStatus: async () => {},
});

export const useSolanaWallet = () => useContext(SolanaWalletContext);

interface SolanaWalletManagerProps {
  children: ReactNode;
}

const SolanaWalletManager: FC<SolanaWalletManagerProps> = ({ children }) => {
  const { publicKey, connected } = useWallet();
  const [walletStatus, setWalletStatus] = useState<{
    hasWallet: boolean;
    walletType: 'external' | 'crossmint' | null;
    walletAddress: string | null;
    crossmintEmail: string | null;
  }>({
    hasWallet: false,
    walletType: null,
    walletAddress: null,
    crossmintEmail: null,
  });
  const [config, setConfig] = useState<WalletConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletConfig = async () => {
    try {
      const response = await fetch('/api/wallet/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to fetch wallet config:', err);
    }
  };

  const refreshWalletStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/wallet/status');
      if (response.ok) {
        const data = await response.json();
        setWalletStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch wallet status:', err);
      setError('Failed to load wallet status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletConfig();
    refreshWalletStatus();
  }, [refreshWalletStatus]);

  useEffect(() => {
    if (connected && publicKey && !walletStatus.walletAddress) {
      linkExternalWallet(publicKey.toBase58());
    }
  }, [connected, publicKey, walletStatus.walletAddress]);

  const createCrossmintWallet = async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create wallet');
        return false;
      }

      await refreshWalletStatus();
      return true;
    } catch (err) {
      setError('Failed to create wallet');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const linkExternalWallet = async (walletAddress: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/wallet/link-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to link wallet');
        return false;
      }

      await refreshWalletStatus();
      return true;
    } catch (err) {
      setError('Failed to link wallet');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: SolanaWalletContextType = {
    isConnected: walletStatus.hasWallet || connected,
    publicKey: connected && publicKey ? publicKey.toBase58() : walletStatus.walletAddress,
    walletType: connected ? 'external' : walletStatus.walletType,
    crossmintWallet: walletStatus.walletType === 'crossmint' ? walletStatus.walletAddress : null,
    crossmintEmail: walletStatus.crossmintEmail,
    config,
    isLoading,
    error,
    createCrossmintWallet,
    linkExternalWallet,
    refreshWalletStatus,
  };

  return (
    <SolanaWalletContext.Provider value={contextValue}>
      {children}
    </SolanaWalletContext.Provider>
  );
};

export const SolanaWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [endpoint, setEndpoint] = useState<string>(clusterApiUrl('devnet'));

  useEffect(() => {
    fetch('/api/wallet/config')
      .then(res => res.json())
      .then(data => {
        if (data.rpcEndpoint) {
          setEndpoint(data.rpcEndpoint);
        }
      })
      .catch(console.error);
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SolanaWalletManager>
            {children}
          </SolanaWalletManager>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export { WalletMultiButton };

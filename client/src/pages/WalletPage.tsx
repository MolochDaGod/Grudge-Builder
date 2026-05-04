import { useState } from "react";
import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wallet, Coins, ExternalLink, CheckCircle, Loader2, AlertCircle, Copy, Gift, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authHeaders } from "@/lib/grudgeBackend";

interface WalletStatus {
  hasWallet: boolean;
  walletType: 'crossmint' | 'external' | null;
  walletAddress: string | null;
  crossmintEmail: string | null;
  walletId?: string | null;
}

// Hardcoded — backend doesn't serve a config endpoint yet
const WALLET_CONFIG = {
  network: 'devnet' as const,
  crossmintEnabled: true,
};

interface CharacterData {
  name: string;
  avatarUrl: string | null;
  raceId: string;
  classId: string;
  level: number;
  xp: number;
  hp: number;
  attributes: Record<string, number>;
}

interface NFTStatus {
  id: string;
  characterId: string;
  status: string;
  mintAddress: string | null;
  assetId: string | null;
  isCompressed: boolean;
  ownerWallet: string | null;
  character?: CharacterData | null;
}

export default function WalletPage() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // GET /api/wallet/status — returns { hasWallet, walletAddress, walletType, crossmintEmail }
  const { data: walletStatus, isLoading: isLoadingStatus } = useQuery<WalletStatus>({
    queryKey: ["wallet-status"],
    queryFn: async () => {
      const res = await fetch("/api/wallet/status", { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to fetch wallet status");
      const data = await res.json();
      return {
        hasWallet: !!data.hasWallet,
        walletType: data.walletType || null,
        walletAddress: data.walletAddress || null,
        crossmintEmail: data.crossmintEmail || null,
        walletId: data.walletId || null,
      };
    },
  });

  const walletConfig = WALLET_CONFIG;

  // Fetch character cNFTs from backend (GET /api/nfts → all account NFTs)
  const { data: nftsData, isLoading: isLoadingNfts } = useQuery<{ nfts: NFTStatus[] }>({
    queryKey: ["character-nfts"],
    queryFn: async () => {
      const res = await fetch("/api/nfts", { headers: authHeaders() });
      if (!res.ok) return { nfts: [] };
      const data = await res.json();
      return { nfts: Array.isArray(data) ? data : data.nfts || [] };
    },
    enabled: !!walletStatus?.hasWallet,
  });

  // Fetch island cNFTs (GET /api/island-nfts → all island NFTs for account)
  const { data: islandNft } = useQuery<{ nft: NFTStatus | null }>({
    queryKey: ["island-nft"],
    queryFn: async () => {
      const res = await fetch("/api/island-nfts", { headers: authHeaders() });
      if (!res.ok) return { nft: null };
      const data = await res.json();
      const nfts = data.nfts || [];
      return { nft: nfts.length > 0 ? nfts[0] : null };
    },
    enabled: !!walletStatus?.hasWallet,
  });

  const createWalletMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/wallet/create", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create wallet");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Wallet Created",
        description: "Your Solana wallet has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["wallet-status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-wallet-title">
          <Wallet className="h-8 w-8" />
          Wallet & NFTs
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your Solana wallet and character NFTs
        </p>
      </div>

      {/* Network Status */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Network Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant={walletConfig.network === 'mainnet-beta' ? 'default' : 'secondary'}>
              {walletConfig.network === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}
            </Badge>
            {walletConfig.crossmintEnabled && (
              <Badge variant="outline" className="text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Crossmint Enabled
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Wallet Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Your Wallet
          </CardTitle>
          <CardDescription>
            {walletStatus?.hasWallet 
              ? "Your Solana wallet is connected" 
              : "Create a wallet to mint and manage your character NFTs"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStatus ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading wallet status...
            </div>
          ) : walletStatus?.hasWallet ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Wallet Address</p>
                  <p className="font-mono text-sm" data-testid="text-wallet-address">
                    {walletStatus.walletAddress}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {walletStatus.walletType === 'crossmint' ? 'Custodial' : 'External'}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => copyToClipboard(walletStatus.walletAddress!)}
                    data-testid="button-copy-address"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {walletStatus.walletType === 'crossmint' && walletStatus.crossmintEmail && (
                <div className="text-sm text-muted-foreground">
                  Managed by Crossmint • {walletStatus.crossmintEmail}
                </div>
              )}

              <Separator />
              
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={`https://solscan.io/account/${walletStatus.walletAddress}?cluster=${walletConfig?.network === 'mainnet-beta' ? '' : 'devnet'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-view-explorer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Solscan
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Custodial Wallet (Recommended)
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  We'll create a wallet for you using Crossmint. No crypto knowledge required - 
                  we'll manage everything for you. You can export to your own wallet later.
                </p>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1"
                      data-testid="input-wallet-email"
                    />
                  </div>
                  <Button 
                    onClick={() => createWalletMutation.mutate(email)}
                    disabled={!email || createWalletMutation.isPending}
                    data-testid="button-create-wallet"
                  >
                    {createWalletMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Wallet...
                      </>
                    ) : (
                      "Create Wallet"
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Connect External Wallet</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Already have a Solana wallet? Connect it using Phantom, Solflare, or other wallets.
                  You'll pay your own gas fees for transactions.
                </p>
                <Button variant="outline" disabled>
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet (Coming Soon)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Escrowed NFTs — claim section */}
      <EscrowClaimSection
        hasWallet={!!walletStatus?.hasWallet}
        walletConfig={walletConfig}
        queryClient={queryClient}
      />

      {/* Island cNFT Card */}
      {islandNft?.nft && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏝️ Home Island cNFT
            </CardTitle>
            <CardDescription>
              Your home island minted as a compressed NFT on Solana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-100">Home Island</p>
                <Badge variant={islandNft.nft.status === 'minted' ? 'default' : 'secondary'} className="mt-1">
                  {islandNft.nft.isCompressed ? 'cNFT' : 'NFT'} • {islandNft.nft.status}
                  {islandNft.nft.status === 'minting' && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
                </Badge>
              </div>
              {islandNft.nft.mintAddress && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {shortenAddress(islandNft.nft.mintAddress)}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(islandNft.nft!.mintAddress!)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                    <a href={`https://solscan.io/token/${islandNft.nft.mintAddress}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Character NFTs Card */}
      <Card>
        <CardHeader>
          <CardTitle>Character NFTs</CardTitle>
          <CardDescription>
            Your minted character NFTs (compressed NFTs on Solana)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nftsData?.nfts && nftsData.nfts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {nftsData.nfts.map((nft) => (
                <div 
                  key={nft.id} 
                  className="border rounded-lg overflow-hidden bg-card"
                  data-testid={`nft-item-${nft.id}`}
                >
                  {nft.character?.avatarUrl && (
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <img 
                        src={nft.character.avatarUrl}
                        alt={nft.character.name}
                        className="w-full h-full object-cover"
                        data-testid={`nft-image-${nft.id}`}
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg" data-testid={`nft-name-${nft.id}`}>
                        {nft.character?.name || `Character #${nft.characterId.slice(0, 8)}`}
                      </h3>
                      <Badge 
                        variant={nft.status === 'minted' ? 'default' : 'secondary'}
                        data-testid={`nft-status-${nft.id}`}
                      >
                        {nft.isCompressed ? 'cNFT' : 'NFT'} • {nft.status}
                        {nft.status === 'minting' && (
                          <Loader2 className="h-3 w-3 ml-1 animate-spin" />
                        )}
                      </Badge>
                    </div>

                    {nft.character && (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="capitalize" data-testid={`nft-race-${nft.id}`}>
                            {nft.character.raceId}
                          </Badge>
                          <Badge variant="outline" className="capitalize" data-testid={`nft-class-${nft.id}`}>
                            {nft.character.classId}
                          </Badge>
                          <Badge variant="secondary" data-testid={`nft-level-${nft.id}`}>
                            Level {nft.character.level}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">HP</span>
                            <span className="font-medium" data-testid={`nft-hp-${nft.id}`}>{nft.character.hp}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">XP</span>
                            <span className="font-medium" data-testid={`nft-xp-${nft.id}`}>{nft.character.xp}</span>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-4 gap-1 text-xs">
                          {Object.entries(nft.character.attributes).slice(0, 8).map(([attr, value]) => (
                            <div key={attr} className="text-center p-1 bg-muted/50 rounded">
                              <div className="font-medium" data-testid={`nft-attr-${attr.toLowerCase()}-${nft.id}`}>{value}</div>
                              <div className="text-muted-foreground uppercase">{attr.slice(0, 3)}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {nft.mintAddress && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs font-mono text-muted-foreground" data-testid={`nft-address-${nft.id}`}>
                          {shortenAddress(nft.mintAddress)}
                        </span>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(nft.mintAddress!)}
                            data-testid={`button-copy-nft-${nft.id}`}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-6 w-6"
                            asChild
                          >
                            <a 
                              href={`https://solscan.io/token/${nft.mintAddress}?cluster=${walletConfig?.network === 'mainnet-beta' ? '' : 'devnet'}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`link-explorer-nft-${nft.id}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No NFTs minted yet</p>
              <p className="text-sm mt-2">
                {walletStatus?.hasWallet 
                  ? "Visit your heroes to mint them as NFTs" 
                  : "Create a wallet first to start minting NFTs"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
        <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
          About Character NFTs
        </h4>
        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
          <li>• Characters are minted as compressed NFTs (cNFTs) for minimal cost (~$0.01)</li>
          <li>• Your character's name, attributes, and avatar are stored on-chain</li>
          <li>• You can upgrade to a full NFT when transferring to an external wallet</li>
          <li>• NFTs can be traded on Solana marketplaces like Magic Eden</li>
        </ul>
      </div>
    </div>
  );
}

// ── Escrow Claim Section ────────────────────────────────────────────

function EscrowClaimSection({ hasWallet, walletConfig, queryClient }: {
  hasWallet: boolean;
  walletConfig: { network: string };
  queryClient: QueryClient;
}) {
  const { toast } = useToast();

  const { data: escrowedData, isLoading } = useQuery<{ nfts: NFTStatus[] }>({
    queryKey: ["escrowed-nfts"],
    queryFn: async () => {
      const res = await fetch("/api/nfts/escrowed", { headers: authHeaders() });
      if (!res.ok) return { nfts: [] };
      const data = await res.json();
      return { nfts: data.nfts || [] };
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (nftId: string) => {
      const res = await fetch(`/api/nfts/${nftId}/claim`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to claim NFT");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "NFT Claimed!", description: "Your cNFT has been transferred to your wallet." });
      queryClient.invalidateQueries({ queryKey: ["escrowed-nfts"] });
      queryClient.invalidateQueries({ queryKey: ["character-nfts"] });
    },
    onError: (error: Error) => {
      toast({ title: "Claim Failed", description: error.message, variant: "destructive" });
    },
  });

  const escrowed = escrowedData?.nfts || [];
  if (isLoading || escrowed.length === 0) return null;

  return (
    <Card className="mb-6 border-yellow-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
          <Gift className="h-5 w-5" />
          Escrowed NFTs ({escrowed.length})
        </CardTitle>
        <CardDescription>
          These cNFTs were minted during character creation and are held in escrow.
          {hasWallet
            ? " Claim them to transfer to your wallet."
            : " Create a wallet first to claim them."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {escrowed.map((nft) => (
            <div
              key={nft.id}
              className="flex items-center gap-4 p-4 rounded-lg border border-yellow-500/20 bg-yellow-50/50 dark:bg-yellow-950/10"
            >
              {nft.character?.avatarUrl && (
                <img
                  src={nft.character.avatarUrl}
                  alt={nft.character.name || "Character"}
                  className="w-14 h-14 rounded-lg object-cover border border-yellow-500/30"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm">
                  {nft.character?.name || `Character #${nft.characterId.slice(0, 8)}`}
                </h4>
                {nft.character && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {nft.character.raceId} {nft.character.classId} • Level {nft.character.level}
                  </p>
                )}
                <Badge variant="outline" className="mt-1 text-yellow-600 border-yellow-500/30 text-xs">
                  Held in escrow
                </Badge>
              </div>
              <Button
                size="sm"
                disabled={!hasWallet || claimMutation.isPending}
                onClick={() => claimMutation.mutate(nft.id)}
                className="bg-yellow-600 hover:bg-yellow-500 text-white"
              >
                {claimMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Claim <ArrowRight className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
        {!hasWallet && (
          <p className="text-xs text-muted-foreground mt-3">
            Create a wallet above to claim your escrowed NFTs.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

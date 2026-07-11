import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Coins,
  Wallet,
  ArrowLeftRight,
  Send,
  Image,
  Loader2,
  Copy,
  ExternalLink,
  Link2,
  MessageCircle,
} from "lucide-react";
import { TreatyChatPanel } from "./TreatyChatPanel";
import { useToast } from "@/hooks/use-toast";
import {
  authHeaders,
  fetchWalletOverview,
  linkThirdPartyWallet,
  quoteWalletPurchase,
  createWalletPurchaseIntent,
  type WalletOverview,
} from "@/lib/grudgeBackend";

interface NFTStatus {
  id: string;
  characterId: string;
  status: string;
  mintAddress: string | null;
  isCompressed: boolean;
  character?: { name: string; avatarUrl: string | null; raceId: string; classId: string; level: number } | null;
}

function shorten(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

interface GrudgeWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GrudgeWalletModal({ open, onOpenChange }: GrudgeWalletModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [linking, setLinking] = useState(false);
  const [swapDirection, setSwapDirection] = useState<"sol-to-gbux" | "gbux-to-sol">("sol-to-gbux");
  const [swapAmount, setSwapAmount] = useState("0.1");
  const [purchaseCurrency, setPurchaseCurrency] = useState<"SOL" | "USDT">("SOL");
  const [purchaseAmount, setPurchaseAmount] = useState("5");
  const [sendTx, setSendTx] = useState("");
  const [pendingPurchaseId, setPendingPurchaseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("balances");

  const { data: overview, isLoading: loadingOverview } = useQuery<WalletOverview>({
    queryKey: ["wallet-overview"],
    queryFn: fetchWalletOverview,
    enabled: open,
  });

  const { data: nftsData } = useQuery<{ nfts: NFTStatus[] }>({
    queryKey: ["character-nfts"],
    queryFn: async () => {
      const res = await fetch("/api/nfts", { headers: authHeaders() });
      if (!res.ok) return { nfts: [] };
      const data = await res.json();
      return { nfts: Array.isArray(data) ? data : data.nfts || [] };
    },
    enabled: open,
  });

  const { data: islandNft } = useQuery<{ nft: NFTStatus | null }>({
    queryKey: ["island-nft"],
    queryFn: async () => {
      const res = await fetch("/api/island-nfts", { headers: authHeaders() });
      if (!res.ok) return { nft: null };
      const data = await res.json();
      const nfts = data.nfts || [];
      return { nft: nfts[0] ?? null };
    },
    enabled: open,
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: label });
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["wallet-overview"] });
    queryClient.invalidateQueries({ queryKey: ["character-nfts"] });
    queryClient.invalidateQueries({ queryKey: ["island-nft"] });
    queryClient.invalidateQueries({ queryKey: ["wallet-status"] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[55]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-[60] grid w-full max-w-3xl max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 shadow-lg duration-200",
            "border-amber-900/40 bg-slate-950 text-slate-100 sm:rounded-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        >
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
        <DialogHeader>
          <DialogTitle className="font-cinzel text-amber-300 flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-400" />
            Grudge Wallet
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Balances, cNFTs, swaps, Treaty chat (friends, DMs &amp; groups), and linked wallets.
          </DialogDescription>
        </DialogHeader>

        {loadingOverview ? (
          <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading wallet…
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-slate-900/80">
              <TabsTrigger value="balances">Balances</TabsTrigger>
              <TabsTrigger value="cnfts">cNFTs</TabsTrigger>
              <TabsTrigger value="swap">Swap</TabsTrigger>
              <TabsTrigger value="send">Send</TabsTrigger>
              <TabsTrigger value="treaty" className="gap-1">
                <MessageCircle className="h-3.5 w-3.5 hidden sm:inline" />
                Treaty
              </TabsTrigger>
              <TabsTrigger value="wallets">Wallets</TabsTrigger>
            </TabsList>

            <TabsContent value="balances" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <BalanceCard label="GBUX (game)" value={overview?.gbuxBalance ?? 0} accent="cyan" />
                {overview?.onChain?.[0] && (
                  <>
                    <BalanceCard label="SOL" value={overview.onChain[0].sol} accent="purple" decimals={4} />
                    <BalanceCard label="GBUX (chain)" value={overview.onChain[0].gbux} accent="cyan" decimals={2} />
                    <BalanceCard label="USDT" value={overview.onChain[0].usdt} accent="emerald" decimals={2} />
                  </>
                )}
              </div>
              {overview?.primaryWallet && (
                <div className="rounded-lg border border-amber-900/30 bg-slate-900/50 p-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500">Primary wallet</p>
                    <p className="font-mono text-sm">{overview.primaryWallet}</p>
                    <p className="text-xs text-slate-500 capitalize">{overview.walletType || "—"}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copy(overview.primaryWallet!, "Wallet address")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={refresh}>
                Refresh balances
              </Button>
            </TabsContent>

            <TabsContent value="cnfts" className="space-y-3 mt-4 max-h-[50vh] overflow-y-auto">
              {islandNft?.nft && (
                <NftRow
                  title="Home Island"
                  nft={islandNft.nft}
                  onCopy={copy}
                />
              )}
              {(nftsData?.nfts?.length ?? 0) === 0 && !islandNft?.nft && (
                <p className="text-sm text-slate-500 py-6 text-center">No minted cNFTs yet.</p>
              )}
              {nftsData?.nfts?.map((nft) => (
                <NftRow
                  key={nft.id}
                  title={nft.character?.name || `Hero ${nft.characterId.slice(0, 8)}`}
                  nft={nft}
                  onCopy={copy}
                />
              ))}
            </TabsContent>

            <TabsContent value="swap" className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={swapDirection === "sol-to-gbux" ? "default" : "outline"}
                  onClick={() => setSwapDirection("sol-to-gbux")}
                >
                  SOL → GBUX
                </Button>
                <Button
                  size="sm"
                  variant={swapDirection === "gbux-to-sol" ? "default" : "outline"}
                  onClick={() => setSwapDirection("gbux-to-sol")}
                >
                  GBUX → SOL
                </Button>
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  className="mt-1 max-w-xs bg-slate-900"
                />
              </div>
              <Button
                onClick={async () => {
                  const amount = parseFloat(swapAmount);
                  if (!amount) return;
                  try {
                    const res = await fetch("/api/exchange/quote", {
                      method: "POST",
                      headers: { ...authHeaders(), "Content-Type": "application/json" },
                      body: JSON.stringify({ amount, direction: swapDirection }),
                    });
                    const q = await res.json();
                    if (!res.ok) throw new Error(q.error || "Quote failed");
                    toast({
                      title: "Swap quote",
                      description: `${q.fromAmount} ${q.fromCurrency} → ${q.netAmount} ${q.toCurrency} (fee ${q.fee})`,
                    });
                  } catch (e: unknown) {
                    toast({
                      title: "Quote failed",
                      description: e instanceof Error ? e.message : "Error",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Get swap quote
              </Button>
              <p className="text-xs text-slate-500">In-game swap execution connects to your linked wallet on-chain.</p>
            </TabsContent>

            <TabsContent value="send" className="space-y-4 mt-4">
              <p className="text-sm text-slate-400">Buy in-game GBUX with SOL or USDT from a linked wallet.</p>
              <div className="flex gap-2">
                {(["SOL", "USDT"] as const).map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={purchaseCurrency === c ? "default" : "outline"}
                    onClick={() => setPurchaseCurrency(c)}
                  >
                    {c}
                  </Button>
                ))}
              </div>
              <div>
                <Label>Amount ({purchaseCurrency})</Label>
                <Input
                  type="number"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  className="mt-1 max-w-xs bg-slate-900"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const amount = parseFloat(purchaseAmount);
                    try {
                      const q = await quoteWalletPurchase(purchaseCurrency, amount);
                      toast({
                        title: "Purchase quote",
                        description: `${amount} ${purchaseCurrency} → ${q.gbuxOut} GBUX`,
                      });
                    } catch (e: unknown) {
                      toast({
                        title: "Quote failed",
                        description: e instanceof Error ? e.message : "Error",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Quote
                </Button>
                <Button
                  onClick={async () => {
                    const amount = parseFloat(purchaseAmount);
                    try {
                      const intent = await createWalletPurchaseIntent(
                        purchaseCurrency,
                        amount,
                        overview?.primaryWallet || undefined,
                      );
                      setPendingPurchaseId(intent.purchaseId);
                      if (intent.treasuryAddress) copy(intent.treasuryAddress, "Treasury address");
                      toast({
                        title: "Send payment",
                        description: `Send ${intent.amountIn} ${intent.currency} to treasury → ${intent.gbuxOut} GBUX`,
                      });
                    } catch (e: unknown) {
                      toast({
                        title: "Intent failed",
                        description: e instanceof Error ? e.message : "Error",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Create intent
                </Button>
              </div>
              {overview?.treasuryAddress && (
                <p className="text-xs font-mono text-slate-500">
                  Treasury: {shorten(overview.treasuryAddress)}
                </p>
              )}
              {pendingPurchaseId && (
                <div className="space-y-2 rounded-lg border border-amber-900/30 p-3">
                  <Label>Confirm with transaction signature</Label>
                  <Input
                    value={sendTx}
                    onChange={(e) => setSendTx(e.target.value)}
                    placeholder="Solana tx signature"
                    className="bg-slate-900 font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!sendTx.trim()) return;
                      try {
                        const res = await fetch("/api/wallet/purchase/confirm", {
                          method: "POST",
                          headers: { ...authHeaders(), "Content-Type": "application/json" },
                          body: JSON.stringify({ purchaseId: pendingPurchaseId, txSignature: sendTx.trim() }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Confirm failed");
                        toast({ title: "GBUX credited", description: `+${data.credited} GBUX` });
                        setSendTx("");
                        setPendingPurchaseId(null);
                        refresh();
                      } catch (e: unknown) {
                        toast({
                          title: "Confirm failed",
                          description: e instanceof Error ? e.message : "Error",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Confirm payment
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="treaty" className="mt-4 space-y-2">
              <div className="flex justify-end">
                <a
                  href="/treaty"
                  className="text-xs text-amber-500/90 hover:text-amber-400 underline-offset-2 hover:underline"
                >
                  Open full Treaty app →
                </a>
              </div>
              <TreatyChatPanel active={open && activeTab === "treaty"} />
            </TabsContent>

            <TabsContent value="wallets" className="space-y-4 mt-4">
              <p className="text-sm text-slate-400">
                Link Phantom or Solflare for purchases and on-chain balance reads.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={linking}
                  onClick={async () => {
                    setLinking(true);
                    try {
                      const addr = await linkThirdPartyWallet("phantom");
                      toast({ title: "Phantom linked", description: shorten(addr) });
                      refresh();
                    } catch (e: unknown) {
                      toast({
                        title: "Link failed",
                        description: e instanceof Error ? e.message : "Error",
                        variant: "destructive",
                      });
                    } finally {
                      setLinking(false);
                    }
                  }}
                >
                  {linking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                  Link Phantom
                </Button>
                <Button variant="outline" disabled={linking} onClick={async () => {
                  setLinking(true);
                  try {
                    const addr = await linkThirdPartyWallet("solflare");
                    toast({ title: "Solflare linked", description: shorten(addr) });
                    refresh();
                  } catch (e: unknown) {
                    toast({
                      title: "Link failed",
                      description: e instanceof Error ? e.message : "Error",
                      variant: "destructive",
                    });
                  } finally {
                    setLinking(false);
                  }
                }}>
                  Link Solflare
                </Button>
              </div>
              <Separator className="bg-amber-900/20" />
              {(overview?.linkedWallets?.length ?? 0) > 0 ? (
                overview!.linkedWallets.map((w) => {
                  const bal = overview!.onChain.find((b) => b.walletAddress === w.walletAddress);
                  return (
                    <div
                      key={w.id}
                      className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-800 p-3 text-sm"
                    >
                      <div>
                        <p className="font-mono">{shorten(w.walletAddress)}</p>
                        <p className="text-xs text-slate-500 capitalize">{w.provider}{w.isPrimary ? " • primary" : ""}</p>
                      </div>
                      {bal?.rpcConfigured && (
                        <div className="text-xs text-slate-400 flex gap-2">
                          <span>SOL {bal.sol?.toFixed(3)}</span>
                          <span>USDT {bal.usdt?.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">No linked wallets yet.</p>
              )}
              <Button variant="ghost" size="sm" asChild>
                <a href="/wallet">
                  <Wallet className="h-4 w-4 mr-2" />
                  Open full wallet page
                </a>
              </Button>
            </TabsContent>
          </Tabs>
        )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function BalanceCard({
  label,
  value,
  accent,
  decimals = 0,
}: {
  label: string;
  value: number | null | undefined;
  accent: "cyan" | "purple" | "emerald";
  decimals?: number;
}) {
  const colors = {
    cyan: "border-cyan-800/40 bg-cyan-950/30 text-cyan-200",
    purple: "border-purple-800/40 bg-purple-950/30 text-purple-200",
    emerald: "border-emerald-800/40 bg-emerald-950/30 text-emerald-200",
  };
  const display =
    value == null ? "—" : decimals > 0 ? value.toFixed(decimals) : value.toLocaleString();
  return (
    <div className={`rounded-lg border p-3 ${colors[accent]}`}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-lg font-bold font-mono">{display}</p>
    </div>
  );
}

function NftRow({
  title,
  nft,
  onCopy,
}: {
  title: string;
  nft: NFTStatus;
  onCopy: (t: string, l: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 p-3">
      {nft.character?.avatarUrl ? (
        <img src={nft.character.avatarUrl} alt="" className="w-12 h-12 rounded object-cover" />
      ) : (
        <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center">
          <Image className="h-5 w-5 text-slate-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        <Badge variant="secondary" className="text-xs mt-1">
          {nft.isCompressed ? "cNFT" : "NFT"} • {nft.status}
        </Badge>
      </div>
      {nft.mintAddress && (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onCopy(nft.mintAddress!, "Mint address")}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={`https://solscan.io/token/${nft.mintAddress}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
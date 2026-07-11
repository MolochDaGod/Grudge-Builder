/**
 * Treaty app — full-page Grudge ID social (friends, DMs, groups).
 * Account-scoped; same Railway /api/treaty/* SSOT used by wallet widget and fleet games.
 */
import { Link } from "wouter";
import { MessageCircle, Shield, ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import { TreatyChatPanel } from "@/components/grudge-token/TreatyChatPanel";
import { useAccount } from "@/hooks/use-account";
import { getCurrentUser, getSession } from "@/lib/grudgeBackend";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TreatyPage() {
  const { account, loading } = useAccount();
  const user = getCurrentUser();
  const session = getSession();
  const signedIn = !!(session?.token || account?.id);
  const grudgeId = user?.grudgeId || account?.grudgeId || null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-bold font-cinzel text-amber-400 flex items-center gap-3"
              data-testid="text-treaty-title"
            >
              <MessageCircle className="h-8 w-8" />
              Treaty
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Grudge ID social — friends, DMs, and groups across every Grudge Studio game
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/account">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Account
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/wallet">Wallet</Link>
            </Button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <Badge
            variant="outline"
            className={signedIn ? "border-emerald-700 text-emerald-400" : "border-slate-600 text-slate-500"}
          >
            {signedIn ? "Signed in" : "Sign in required"}
          </Badge>
          {grudgeId && (
            <Badge variant="outline" className="border-amber-800 text-amber-300 font-mono">
              {grudgeId}
            </Badge>
          )}
          <Badge variant="outline" className="border-slate-700 text-slate-400">
            Account social · not character-scoped
          </Badge>
        </div>

        {!signedIn && !loading ? (
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader>
              <CardTitle className="text-amber-400 font-cinzel flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sign in with Grudge ID
              </CardTitle>
              <CardDescription>
                Treaty friends, DMs, and groups live on your Grudge account — the same identity used
                for wallet, crafting, and every fleet game.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-gradient-to-r from-amber-600 to-orange-600">
                <a href="/login?redirect_uri=/treaty">Sign in</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-900/60 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-400 font-cinzel text-lg">Inbox</CardTitle>
              <CardDescription>
                Allies, direct messages, and warband groups — available from the wallet FAB in any
                game too.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TreatyChatPanel active expanded />
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

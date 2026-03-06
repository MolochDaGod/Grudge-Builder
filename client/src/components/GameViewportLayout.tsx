import { Link } from "wouter";
import { Home, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface GameViewportLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
}

export function GameViewportLayout({ 
  children, 
  title = "GRUDGE",
  showBackButton = true 
}: GameViewportLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 overflow-hidden">
      <header className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="flex items-center justify-between p-2 pointer-events-auto w-fit">
          {showBackButton && (
            <Link href="/home">
              <Button 
                variant="ghost" 
                size="sm" 
                className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 hover:bg-slate-800 text-amber-400"
                data-testid="btn-back-home"
              >
                <Home className="w-4 h-4 mr-2" />
                Hub
              </Button>
            </Link>
          )}
          
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2 bg-slate-900/80 backdrop-blur-sm border border-slate-700 hover:bg-slate-800"
                data-testid="btn-game-menu"
              >
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-slate-900 border-r-slate-800 p-0 w-64">
              <div className="p-6">
                <h2 className="text-2xl font-cinzel font-bold text-amber-400 mb-6">{title}</h2>
                <nav className="flex flex-col gap-2">
                  <Link href="/home" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Home</Button>
                  </Link>
                  <Link href="/character" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Characters</Button>
                  </Link>
                  <Link href="/island" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Island</Button>
                  </Link>
                  <Link href="/dungeon" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Dungeon</Button>
                  </Link>
                  <Link href="/combat" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Combat</Button>
                  </Link>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      
      <main className="w-full h-full">
        {children}
      </main>
    </div>
  );
}

export default GameViewportLayout;

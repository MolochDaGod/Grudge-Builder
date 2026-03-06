import { PhaserIslandView } from '@/components/PhaserIslandView';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export default function IslandPhaserPage() {
  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/island">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Island
            </Button>
          </Link>
          <h1 className="text-2xl font-cinzel font-bold text-amber-400">
            Island Builder (Phaser)
          </h1>
        </div>
        
        <div className="flex-1 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
          <PhaserIslandView 
            seed="test-island-seed-123"
          />
        </div>
      </div>
    </Layout>
  );
}

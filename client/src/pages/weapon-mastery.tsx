/**
 * WeaponMasteryPage — weapon mastery talent tree reference.
 *
 * Source of truth: shared/definitions/weaponMastery.ts
 * Routes: /weapon-mastery, /weapon-skills, /weaponskills
 */
import {
  MASTERY_TREES, MASTERY_POOL_CAP, MASTERY_TREE_COUNT, MASTERY_STAT_BONUSES,
  MASTERY_TREE_FILL_POINTS, MASTERY_MICRO_COUNT,
  type MasteryTree, type MasteryNode,
} from '@shared/definitions/weaponMastery';

export default function WeaponMasteryPage() {
  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif", background:'#0a0705', color:'#e7d8be', lineHeight:1.55, padding:'32px 20px 64px', maxWidth:1180, margin:'0 auto', minHeight:'100vh' }}>
      <h1 style={{ fontFamily:"'Cinzel',Georgia,serif", fontSize:34, color:'#d4a400', letterSpacing:1 }}>Weapons Mastery</h1>
      <p style={{ color:'#9b7d52', fontSize:14, margin:'6px 0 24px', maxWidth:760 }}>
        A point-allocation talent tree per weapon type. Spend a shared mastery pool — one point per character level — across any of the {MASTERY_TREE_COUNT} trees. Each tree has 7 core talents, {MASTERY_MICRO_COUNT} micro nodes (small passives, crits, procs), and a signature capstone — {MASTERY_TREE_FILL_POINTS} points to fill. Generic passive bonuses fold directly into your combat stats.
      </p>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:32 }}>
        {[{v:MASTERY_POOL_CAP,l:'Shared pool cap'},{v:'1 / level',l:'Points earned'},{v:MASTERY_TREE_COUNT,l:'Weapon trees'},{v:String(MASTERY_TREE_FILL_POINTS),l:'Pts per tree'},{v:'1 / 3 / 5',l:'Core ranks'}].map(r=>(
          <div key={r.l} style={{ background:'#140d08', border:'1px solid #3a2a1a', borderRadius:10, padding:'12px 16px', minWidth:150 }}>
            <strong style={{ display:'block', fontFamily:"'Cinzel',Georgia,serif", fontSize:22, color:'#d4a400' }}>{r.v}</strong>
            <span style={{ fontSize:11, color:'#9b7d52', textTransform:'uppercase', letterSpacing:1 }}>{r.l}</span>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:20 }}>
        {MASTERY_TREES.map(t => <TreeCard key={t.id} tree={t}/>)}
      </div>
      <section style={{ marginTop:40, background:'#140d08', border:'1px solid #3a2a1a', borderRadius:12, padding:'18px 20px' }}>
        <h2 style={{ fontFamily:"'Cinzel',Georgia,serif", letterSpacing:.5 }}>Combat Bonuses</h2>
        <p style={{ color:'#9b7d52', fontSize:13, margin:'6px 0 14px', maxWidth:720 }}>Every talent grants a generic passive that folds straight into the character stat engine. Bonuses sum across all weapon trees.</p>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead><tr>{['Bonus','Stat key','Mode','Per rank'].map(h=><th key={h} style={{ textAlign:'left', color:'#9b7d52', fontSize:11, textTransform:'uppercase', letterSpacing:1, padding:'6px 10px', borderBottom:'1px solid #3a2a1a' }}>{h}</th>)}</tr></thead>
          <tbody>{MASTERY_STAT_BONUSES.map(b=><tr key={b.stat}><td style={{padding:'8px 10px',borderBottom:'1px solid #3a2a1a'}}>{b.label}</td><td style={{padding:'8px 10px',borderBottom:'1px solid #3a2a1a'}}><code style={{fontFamily:"'JetBrains Mono',monospace",color:'#d4a400',fontSize:12}}>{b.statKey}</code></td><td style={{padding:'8px 10px',borderBottom:'1px solid #3a2a1a'}}>{b.mode}</td><td style={{padding:'8px 10px',borderBottom:'1px solid #3a2a1a'}}>{b.perRank}</td></tr>)}</tbody>
        </table>
      </section>
      <footer style={{ marginTop:36, color:'#6b5535', fontSize:11, textAlign:'center' }}>Generated from shared/definitions/weaponMastery.ts — the single source of truth for the in-game mastery system.</footer>
    </div>
  );
}

function TreeCard({ tree }: { tree: MasteryTree }) {
  return (
    <section style={{ background:'#140d08', border:'1px solid #3a2a1a', borderRadius:12, overflow:'hidden' }}>
      <header style={{ padding:'14px 16px', borderBottom:`2px solid ${tree.color}` }}>
        <h2 style={{ fontFamily:"'Cinzel',Georgia,serif", fontSize:19, color:tree.color }}>{tree.name}</h2>
        <p style={{ fontSize:12, color:'#9b7d52', marginTop:2 }}>{tree.description}</p>
        <div style={{ fontSize:11, color:'#6b5535', marginTop:6, fontFamily:"'JetBrains Mono',monospace" }}>Fully fills at <strong>{tree.totalPoints}</strong> points</div>
      </header>
      <div style={{ position:'relative', height:480, margin:8, background:`radial-gradient(circle at 50% 38%, ${tree.color}14, transparent 70%)` }}>
        <svg style={{ position:'absolute', inset:0, pointerEvents:'none' }} width="100%" height="100%">
          {tree.edges.map(([from,to],i)=>{const a=tree.nodes[from],b=tree.nodes[to];if(!a||!b)return null;return <line key={i} x1={`${a.position.x}%`} y1={`${a.position.y}%`} x2={`${b.position.x}%`} y2={`${b.position.y}%`} stroke={`${tree.color}55`} strokeWidth={1.5} strokeDasharray="4 4"/>;})}
        </svg>
        {tree.nodes.map(n => <NodeOrb key={n.id} node={n} color={tree.color}/>)}
      </div>
    </section>
  );
}

function NodeOrb({ node, color }: { node: MasteryNode; color: string }) {
  const isMicro = node.kind === 'micro';
  const isSig = node.kind === 'signature';
  const s = isSig ? 64 : isMicro ? 36 : 52;
  const labelW = isMicro ? 72 : s;
  return (
    <div style={{ position:'absolute', left:`${node.position.x}%`, top:`${node.position.y}%`, transform:'translate(-50%,-50%)', textAlign:'center', width:labelW, zIndex: isMicro ? 1 : 2 }}>
      <div style={{
        width:s, height:s, border:`2px solid ${isMicro ? `${color}99` : color}`,
        borderRadius: isSig ? '50%' : isMicro ? 8 : 12,
        display:'flex', alignItems:'center', justifyContent:'center',
        background: isMicro ? 'linear-gradient(135deg,#120c07,#0a0705)' : 'linear-gradient(135deg,#1e1510,#120c07)',
        margin:'0 auto', boxShadow: isMicro ? `0 0 6px ${color}33` : `0 0 10px ${color}55`,
        opacity: isMicro ? 0.92 : 1,
      }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize: isMicro ? 10 : 13, color }}>{node.maxRanks}</span>
      </div>
      <div style={{ fontFamily:"'Cinzel',Georgia,serif", fontSize: isMicro ? 9 : 11, marginTop: isMicro ? 4 : 8, color:'#e7d8be', lineHeight:1.2 }}>{node.name}</div>
      <div style={{ fontSize: isMicro ? 8 : 10, color:'#d4a400', marginTop:2, lineHeight:1.2 }}>{node.description}</div>
      {!isMicro && (
        <div style={{ fontSize:9, color:'#6b5535', fontFamily:"'JetBrains Mono',monospace" }}>
          {node.requirement === 0 ? 'no requirement' : `req ${node.requirement} pts`}
        </div>
      )}
      {isSig && <span style={{ fontSize:9, textTransform:'uppercase', letterSpacing:1, fontWeight:700, color }}>Signature</span>}
      {isMicro && <span style={{ fontSize:8, textTransform:'uppercase', letterSpacing:0.5, color:'#6b5535' }}>Micro</span>}
    </div>
  );
}

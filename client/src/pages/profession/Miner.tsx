import { BaseProfessionPage } from "./BaseProfessionPage";
import { minerData } from "@/data/crafting/miner";

export default function MinerPage() {
  return (
    <BaseProfessionPage 
      data={minerData}
      professionKey="miner"
      accentColor="amber"
      craftingLabel="Forge"
    />
  );
}

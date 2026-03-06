import { BaseProfessionPage } from "./BaseProfessionPage";
import { engineerData } from "@/data/crafting/engineer";

export default function EngineerPage() {
  return (
    <BaseProfessionPage 
      data={engineerData}
      professionKey="engineer"
      accentColor="slate"
      craftingLabel="Workshop"
    />
  );
}

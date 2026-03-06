import { BaseProfessionPage } from "./BaseProfessionPage";
import { foresterData } from "@/data/crafting/forester";

export default function ForesterPage() {
  return (
    <BaseProfessionPage 
      data={foresterData}
      professionKey="forester"
      accentColor="green"
      craftingLabel="Workshop"
    />
  );
}

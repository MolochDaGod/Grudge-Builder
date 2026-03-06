import { BaseProfessionPage } from "./BaseProfessionPage";
import { mysticData } from "@/data/crafting/mystic";

export default function MysticPage() {
  return (
    <BaseProfessionPage 
      data={mysticData}
      professionKey="mystic"
      accentColor="purple"
      craftingLabel="Arcanum"
    />
  );
}

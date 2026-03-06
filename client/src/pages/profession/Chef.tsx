import { BaseProfessionPage } from "./BaseProfessionPage";
import { chefData } from "@/data/crafting/chef";

export default function ChefPage() {
  return (
    <BaseProfessionPage 
      data={chefData}
      professionKey="chef"
      accentColor="orange"
      craftingLabel="Kitchen"
    />
  );
}

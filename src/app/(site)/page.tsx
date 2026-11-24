import { Story } from "@/components/home/Story";
import { AISection, FarmSection, FinalCTA, ForYou, MenuSection, PlansSection, VoicesSection } from "@/components/home/Sections";

export default function Home() {
  return (
    <>
      <Story />
      <ForYou />
      <MenuSection />
      <PlansSection />
      <FarmSection />
      <AISection />
      <VoicesSection />
      <FinalCTA />
    </>
  );
}

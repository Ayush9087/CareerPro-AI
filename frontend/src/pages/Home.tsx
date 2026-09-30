import { HeroSection } from '../components/home/HeroSection';
import { ProcessSection } from '../components/home/ProcessSection';
import { FeatureShowcase } from '../components/home/FeatureShowcase';
import { ImpactSection } from '../components/home/ImpactSection';
import { Footer } from '../components/home/Footer';

export function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-career-background">
      <HeroSection />
      <ProcessSection />
      <FeatureShowcase />
      <ImpactSection />
      <Footer />
    </div>
  );
}

export default Home;

import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import UserTypes from "@/components/UserTypes";
import CTA from "@/components/CTA";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <UserTypes />
        <CTA />
      </main>
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2025 MatchAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

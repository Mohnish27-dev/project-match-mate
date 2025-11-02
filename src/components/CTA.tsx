import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTA = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-primary p-12 md:p-16 text-center shadow-glow">
          <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground">
              Ready to Find Your Perfect Match?
            </h2>
            <p className="text-xl text-primary-foreground/90">
              Join thousands of successful project owners and talented freelancers
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="xl" 
                variant="secondary"
                className="group bg-white hover:bg-white/90 text-primary"
                onClick={() => navigate('/auth')}
              >
                Get Started Now
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
        </div>
      </div>
    </section>
  );
};

export default CTA;

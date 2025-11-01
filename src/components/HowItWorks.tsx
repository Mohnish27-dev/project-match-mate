import { UserPlus, Search, MessageSquare, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create Your Profile",
    description: "Sign up and tell us about your skills, experience, or project needs.",
  },
  {
    icon: Search,
    title: "AI Analyzes & Matches",
    description: "Our intelligent system finds the best matches based on your unique requirements.",
  },
  {
    icon: MessageSquare,
    title: "Connect & Communicate",
    description: "Start conversations with matched candidates or project owners instantly.",
  },
  {
    icon: CheckCircle,
    title: "Collaborate & Succeed",
    description: "Work together on amazing projects and achieve your goals.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Four simple steps to finding your perfect match
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative text-center space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
                  <Icon className="h-10 w-10 text-primary-foreground" />
                </div>
                <div className="absolute top-10 left-1/2 w-full h-0.5 bg-gradient-primary/20 -z-10 hidden lg:block last:hidden" 
                     style={{ transform: 'translateX(50%)' }} />
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-primary">Step {index + 1}</div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

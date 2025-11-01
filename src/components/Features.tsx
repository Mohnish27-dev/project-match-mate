import { Card, CardContent } from "@/components/ui/card";
import aiMatchingImg from "@/assets/feature-ai-matching.jpg";
import instantConnectImg from "@/assets/feature-instant-connect.jpg";
import smartProfilesImg from "@/assets/feature-smart-profiles.jpg";

const features = [
  {
    title: "AI-Powered Matching",
    description: "Advanced algorithms analyze skills, experience, and project requirements to find perfect matches instantly.",
    image: aiMatchingImg,
  },
  {
    title: "Instant Connections",
    description: "Connect with the right talent or projects in real-time. No more endless searching or waiting.",
    image: instantConnectImg,
  },
  {
    title: "Smart Profiles",
    description: "Showcase your skills and portfolio with intelligent profiles that highlight what makes you unique.",
    image: smartProfilesImg,
  },
];

const Features = () => {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Why Choose Our Platform?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Leverage cutting-edge AI technology to streamline your hiring and job search process
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group border-border/50 bg-card hover:shadow-card transition-all duration-300 hover:-translate-y-2"
            >
              <CardContent className="p-6 space-y-4">
                <div className="aspect-square rounded-lg overflow-hidden bg-gradient-primary/10">
                  <img 
                    src={feature.image} 
                    alt={`${feature.title} feature illustration`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <h3 className="text-2xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

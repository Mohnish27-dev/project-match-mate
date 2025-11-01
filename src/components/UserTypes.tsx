import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Users } from "lucide-react";

const UserTypes = () => {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            Choose Your Path
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you're hiring or looking for work, we've got you covered
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card className="border-2 hover:border-primary transition-all duration-300 hover:shadow-glow">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl">Project Owners</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Post projects and define requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Get matched with qualified freelancers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Review portfolios and ratings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  <span>Manage projects efficiently</span>
                </li>
              </ul>
              <Button className="w-full" size="lg">
                Post a Project
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border-2 hover:border-secondary transition-all duration-300 hover:shadow-glow">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle className="text-3xl">Freelancers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-secondary mt-1">✓</span>
                  <span>Create a compelling profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary mt-1">✓</span>
                  <span>Get matched with relevant projects</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary mt-1">✓</span>
                  <span>Showcase your portfolio</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary mt-1">✓</span>
                  <span>Grow your career</span>
                </li>
              </ul>
              <Button variant="secondary" className="w-full" size="lg">
                Find Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default UserTypes;

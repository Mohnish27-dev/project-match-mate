import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search } from "lucide-react";

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [searchTerm, projects]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*, profiles(full_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data);
      setFilteredProjects(data);
    }
    setLoading(false);
  };

  const filterProjects = () => {
    if (!searchTerm) {
      setFilteredProjects(projects);
      return;
    }

    const filtered = projects.filter(project =>
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.required_skills?.some((skill: string) =>
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setFilteredProjects(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Browse Projects</h1>
          <p className="text-muted-foreground mb-6">
            Find your next opportunity from {projects.length} open projects
          </p>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, skills, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-6">
          {filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No projects found</p>
              </CardContent>
            </Card>
          ) : (
            filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-card transition-all cursor-pointer"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="mb-2">{project.title}</CardTitle>
                      <CardDescription>
                        Posted by {project.profiles?.full_name || 'Anonymous'}
                      </CardDescription>
                    </div>
                    <Badge>Open</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {project.required_skills?.map((skill: string, idx: number) => (
                      <Badge key={idx} variant="outline">{skill}</Badge>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    {project.budget_min && project.budget_max && (
                      <span className="text-muted-foreground">
                        Budget: ${project.budget_min} - ${project.budget_max}
                      </span>
                    )}
                    {project.timeline && (
                      <span className="text-muted-foreground">
                        Timeline: {project.timeline}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Projects;

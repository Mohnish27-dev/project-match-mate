import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send } from "lucide-react";

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [hasApplied, setHasApplied] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();

    setUserRole(profile?.user_role || '');

    // Get project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*, profiles(full_name, bio)')
      .eq('id', id)
      .single();

    if (projectError) {
      toast.error("Project not found");
      navigate('/projects');
      return;
    }

    setProject(projectData);

    // Check if already applied
    if (profile?.user_role === 'freelancer') {
      const { data: application } = await supabase
        .from('applications')
        .select('id')
        .eq('project_id', id)
        .eq('freelancer_id', user.id)
        .single();

      setHasApplied(!!application);
    }

    setLoading(false);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase
        .from('applications')
        .insert({
          project_id: id,
          freelancer_id: user.id,
          cover_letter: coverLetter,
          proposed_rate: proposedRate ? parseFloat(proposedRate) : null,
          status: 'pending',
        });

      if (error) throw error;

      toast.success("Application submitted successfully!");
      setHasApplied(true);
      setCoverLetter("");
      setProposedRate("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setApplying(false);
    }
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
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl mb-2">{project?.title}</CardTitle>
                <CardDescription>
                  Posted by {project?.profiles?.full_name || 'Anonymous'}
                </CardDescription>
              </div>
              <Badge variant={project?.status === 'open' ? 'default' : 'secondary'}>
                {project?.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Project Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {project?.description}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {project?.required_skills?.map((skill: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-sm">{skill}</Badge>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
              {project?.budget_min && project?.budget_max && (
                <div>
                  <h3 className="font-semibold mb-2">Budget</h3>
                  <p className="text-muted-foreground">
                    ${project.budget_min} - ${project.budget_max}
                  </p>
                </div>
              )}
              {project?.timeline && (
                <div>
                  <h3 className="font-semibold mb-2">Timeline</h3>
                  <p className="text-muted-foreground">{project.timeline}</p>
                </div>
              )}
            </div>

            {userRole === 'freelancer' && project?.status === 'open' && (
              <div className="pt-6 border-t">
                {hasApplied ? (
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <p className="text-lg font-semibold">Application Submitted</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      You've already applied to this project
                    </p>
                  </div>
                ) : (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="lg" className="w-full gap-2">
                        <Send className="h-4 w-4" />
                        Apply for this Project
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Apply for Project</DialogTitle>
                        <DialogDescription>
                          Submit your application to work on this project
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="coverLetter">Cover Letter</Label>
                          <Textarea
                            id="coverLetter"
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            placeholder="Explain why you're a great fit for this project..."
                            rows={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="proposedRate">Proposed Rate ($/hr)</Label>
                          <Input
                            id="proposedRate"
                            type="number"
                            value={proposedRate}
                            onChange={(e) => setProposedRate(e.target.value)}
                            placeholder="50"
                          />
                        </div>
                        <Button
                          onClick={handleApply}
                          disabled={applying}
                          className="w-full"
                          size="lg"
                        >
                          {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Submit Application
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProjectDetails;

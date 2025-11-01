import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

const PostProject = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [timeline, setTimeline] = useState("");

  useEffect(() => {
    checkAuth();
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setWorkspaces(data || []);
    } catch (error: any) {
      console.error("Error fetching workspaces:", error);
    }
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', session.user.id)
      .single();

    if (profile?.user_role !== 'project_owner') {
      toast.error("Only project owners can post projects");
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from('projects')
        .insert({
          owner_id: user.id,
          workspace_id: selectedWorkspace || null,
          title,
          description,
          required_skills: skills.split(',').map(s => s.trim()),
          budget_min: budgetMin ? parseFloat(budgetMin) : null,
          budget_max: budgetMax ? parseFloat(budgetMax) : null,
          timeline,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Project posted successfully!");
      
      // Trigger AI matching
      await triggerMatching(data.id);
      
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerMatching = async (projectId: string) => {
    try {
      await supabase.functions.invoke('generate-matches', {
        body: { projectId }
      });
    } catch (error) {
      console.error('Error triggering matches:', error);
    }
  };

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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Post a New Project</CardTitle>
                <CardDescription>
                  Our AI will automatically match you with qualified freelancers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {workspaces.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="workspace">Workspace (Optional)</Label>
                  <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Workspace</SelectItem>
                      {workspaces.map((workspace) => (
                        <SelectItem key={workspace.id} value={workspace.id}>
                          {workspace.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Build a React Dashboard"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project in detail..."
                  rows={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Required Skills (comma separated) *</Label>
                <Input
                  id="skills"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g., React, TypeScript, Node.js"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budgetMin">Min Budget ($)</Label>
                  <Input
                    id="budgetMin"
                    type="number"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    placeholder="1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetMax">Max Budget ($)</Label>
                  <Input
                    id="budgetMax"
                    type="number"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="5000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline</Label>
                <Input
                  id="timeline"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  placeholder="e.g., 2-3 months"
                />
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Post Project & Find Matches
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PostProject;

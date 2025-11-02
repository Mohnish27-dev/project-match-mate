import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Plus, UserPlus, UserMinus, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import WorkspaceChatbot from "@/components/WorkspaceChatbot";

export default function WorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workspace, setWorkspace] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWorkspaceData();
    }
  }, [id]);

  const fetchWorkspaceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", id)
        .single();

      if (workspaceError) throw workspaceError;
      setWorkspace(workspaceData);

      const { data: membersData, error: membersError } = await supabase
        .from("workspace_members")
        .select(`
          *,
          profiles(full_name, email, avatar_url)
        `)
        .eq("workspace_id", id);

      if (membersError) throw membersError;
      setMembers(membersData || []);

      const currentMember = membersData?.find(m => m.user_id === user.id);
      setCurrentUserRole(currentMember?.role || "");

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", id);

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", addMemberEmail)
        .single();

      if (profileError) throw new Error("User not found");

      const { error } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: id,
          user_id: profileData.id,
          role: "member",
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member added successfully",
      });

      setAddMemberOpen(false);
      setAddMemberEmail("");
      fetchWorkspaceData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateMemberRole = async (memberId: string, newRole: "owner" | "admin" | "member") => {
    try {
      const { error } = await supabase
        .from("workspace_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member role updated",
      });

      fetchWorkspaceData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member removed",
      });

      fetchWorkspaceData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const { data, error } = await supabase.functions.invoke("workspace-recommendations", {
        body: { workspaceId: id },
      });

      if (error) throw error;
      setRecommendations(data.recommendations || []);
      toast({
        title: "Success",
        description: `Found ${data.recommendations?.length || 0} recommendations`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingRecommendations(false);
    }
  };


  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button
        variant="ghost"
        onClick={() => navigate("/workspaces")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Workspaces
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">{workspace?.name}</h1>
        <p className="text-muted-foreground">{workspace?.description}</p>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="bg-card">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="recommendations">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage workspace members and their roles</CardDescription>
                </div>
                {canManageMembers && (
                  <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogDescription>
                          Enter the email address of the user you want to add
                        </DialogDescription>
                      </DialogHeader>
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={addMemberEmail}
                          onChange={(e) => setAddMemberEmail(e.target.value)}
                          placeholder="user@example.com"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addMember} disabled={!addMemberEmail}>
                          Add Member
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={member.profiles?.avatar_url} />
                        <AvatarFallback>
                          {member.profiles?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.profiles?.full_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{member.profiles?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                        {member.role}
                      </Badge>
                      {canManageMembers && member.role !== "owner" && (
                        <div className="flex gap-1">
                          {member.role === "member" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMemberRole(member.id, "admin")}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                          )}
                          {member.role === "admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMemberRole(member.id, "member")}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeMember(member.id)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Workspace Projects</CardTitle>
                  <CardDescription>View and manage workspace projects</CardDescription>
                </div>
                <Button onClick={() => navigate("/post-project")}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No projects yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-accent"
                      onClick={() => navigate(`/project/${project.id}`)}
                    >
                      <h3 className="font-semibold mb-2">{project.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                      <div className="flex gap-2">
                        <Badge>{project.status}</Badge>
                        <Badge variant="outline">
                          ${project.budget_min} - ${project.budget_max}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>AI Member Recommendations</CardTitle>
                  <CardDescription>
                    AI-powered suggestions for potential workspace members
                  </CardDescription>
                </div>
                <Button onClick={loadRecommendations} disabled={loadingRecommendations}>
                  {loadingRecommendations ? "Loading..." : "Generate Recommendations"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Click "Generate Recommendations" to find potential members
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{rec.freelancer_name}</h4>
                          <p className="text-sm text-muted-foreground">{rec.freelancer_email}</p>
                        </div>
                        <Badge className="bg-gradient-primary">
                          {rec.match_percentage}% Match
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {rec.skills.map((skill: string, i: number) => (
                          <Badge key={i} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{rec.reason}</p>
                      {canManageMembers && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setAddMemberEmail(rec.freelancer_email);
                            setAddMemberOpen(true);
                          }}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add to Workspace
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
      
      {/* Floating AI Chatbot */}
      {id && <WorkspaceChatbot workspaceId={id} />}
    </div>
  );
}

-- Create workspace role enum
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member');

-- Create workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create workspace_members table
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Add workspace_id to projects
ALTER TABLE projects ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Create workspace_activity table for tracking
CREATE TABLE workspace_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they are members of"
  ON workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update workspaces"
  ON workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Only owners can delete workspaces"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- RLS Policies for workspace_members
CREATE POLICY "Members can view workspace members"
  ON workspace_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can add members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_members.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update member roles"
  ON workspace_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can remove members"
  ON workspace_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for workspace_activity
CREATE POLICY "Members can view workspace activity"
  ON workspace_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_activity.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create activity logs"
  ON workspace_activity FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_activity.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Function to check workspace role
CREATE OR REPLACE FUNCTION has_workspace_role(_workspace_id UUID, _user_id UUID, _role workspace_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = _workspace_id
    AND user_id = _user_id
    AND role = _role
  )
$$;

-- Function to automatically add owner as workspace member
CREATE OR REPLACE FUNCTION add_owner_to_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

-- Trigger to add owner as member
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_workspace();

-- Trigger for workspace updated_at
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
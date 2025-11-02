-- Fix infinite recursion in workspace RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Owners and admins can update workspaces" ON workspaces;

-- Create corrected policies that don't cause recursion
CREATE POLICY "Users can view their owned workspaces"
ON workspaces
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Users can view workspaces where they are members"
ON workspaces
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their workspaces"
ON workspaces
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

-- Create default workspaces for projects that don't have one
-- This will create a workspace for each unique project owner
INSERT INTO workspaces (name, description, owner_id)
SELECT 
  'Default Workspace for ' || COALESCE(p.full_name, p.email),
  'Auto-created workspace for existing projects',
  projects.owner_id
FROM projects
LEFT JOIN profiles p ON p.id = projects.owner_id
WHERE projects.workspace_id IS NULL
GROUP BY projects.owner_id, p.full_name, p.email
ON CONFLICT DO NOTHING;

-- Assign orphan projects to their owner's first workspace
UPDATE projects
SET workspace_id = (
  SELECT id FROM workspaces 
  WHERE workspaces.owner_id = projects.owner_id 
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Now make workspace_id required for projects
ALTER TABLE projects
ALTER COLUMN workspace_id SET NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN projects.workspace_id IS 'Every project must belong to a workspace';

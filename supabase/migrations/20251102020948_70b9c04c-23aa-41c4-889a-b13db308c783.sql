-- Create security definer function to check workspace role without RLS recursion
CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace_id uuid, _user_id uuid, _role workspace_role)
RETURNS boolean
LANGUAGE sql
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

-- Drop existing problematic policies on workspace_members
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update member roles" ON workspace_members;

-- Create new policies using the security definer function
CREATE POLICY "Members can view their workspace members"
ON workspace_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_workspace_role(workspace_id, auth.uid(), 'owner')
  OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
  OR public.has_workspace_role(workspace_id, auth.uid(), 'member')
);

CREATE POLICY "Owners and admins can add members"
ON workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_workspace_role(workspace_id, auth.uid(), 'owner')
  OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
);

CREATE POLICY "Owners and admins can remove members"
ON workspace_members
FOR DELETE
TO authenticated
USING (
  public.has_workspace_role(workspace_id, auth.uid(), 'owner')
  OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
);

CREATE POLICY "Owners and admins can update member roles"
ON workspace_members
FOR UPDATE
TO authenticated
USING (
  public.has_workspace_role(workspace_id, auth.uid(), 'owner')
  OR public.has_workspace_role(workspace_id, auth.uid(), 'admin')
);

-- Also update the add_owner_to_workspace trigger function to be more robust
CREATE OR REPLACE FUNCTION public.add_owner_to_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

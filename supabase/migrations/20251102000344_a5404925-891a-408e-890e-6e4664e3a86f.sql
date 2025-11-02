-- Expand user_role enum to support more user types
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'open_source_maintainer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'open_source_contributor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'startup_founder';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'job_seeker';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hackathon_participant';

-- Add project_type enum for different project categories
CREATE TYPE project_type AS ENUM (
  'freelance_gig',
  'open_source_project',
  'startup_opportunity',
  'full_time_job',
  'hackathon_team',
  'contract_work'
);

-- Add project_type column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_type project_type DEFAULT 'freelance_gig';

-- Add user interests and looking_for fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS interests text[],
ADD COLUMN IF NOT EXISTS looking_for text[];

-- Add more fields to freelancer_profiles to support all user types
ALTER TABLE freelancer_profiles
ADD COLUMN IF NOT EXISTS github_url text,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS open_source_contributions text[],
ADD COLUMN IF NOT EXISTS hackathon_wins integer DEFAULT 0;
/*
  # Comprehensive Group Management System

  1. New Tables
    - `groups` - Core group information with metadata
    - `group_members` - Member relationships with roles and permissions
    - `group_invitations` - Pending invitations to join groups
    - `group_activity` - Activity log for group actions
    - `group_roles` - Predefined roles with permissions

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for CRUD operations
    - Implement role-based access control

  3. Performance
    - Add indexes for optimal query performance
    - Include composite indexes for common queries

  4. Data Integrity
    - Foreign key constraints
    - Check constraints for data validation
    - Triggers for automatic updates
*/

-- Create enum types for better data integrity
CREATE TYPE group_privacy AS ENUM ('public', 'private', 'invite_only');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'moderator', 'member');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE activity_type AS ENUM ('group_created', 'member_joined', 'member_left', 'member_promoted', 'member_demoted', 'group_updated', 'invitation_sent');

-- Groups table with comprehensive metadata
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) >= 2 AND length(name) <= 100),
  description text NOT NULL CHECK (length(description) >= 10 AND length(description) <= 2000),
  privacy group_privacy NOT NULL DEFAULT 'public',
  tags text[] DEFAULT '{}',
  equity_available integer CHECK (equity_available >= 0 AND equity_available <= 100),
  funding_needed text NOT NULL,
  industry text NOT NULL,
  stage text NOT NULL,
  max_members integer NOT NULL DEFAULT 10 CHECK (max_members >= 2 AND max_members <= 1000),
  current_member_count integer NOT NULL DEFAULT 1 CHECK (current_member_count >= 0),
  avatar_url text,
  banner_url text,
  website_url text,
  location text,
  founded_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT valid_member_count CHECK (current_member_count <= max_members)
);

-- Group members with roles and permissions
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id),
  is_active boolean NOT NULL DEFAULT true,
  permissions jsonb DEFAULT '{}',
  
  -- Unique constraint to prevent duplicate memberships
  UNIQUE(group_id, user_id)
);

-- Group invitations system
CREATE TABLE IF NOT EXISTS group_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  invitee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status invitation_status NOT NULL DEFAULT 'pending',
  message text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  
  -- Prevent duplicate pending invitations
  UNIQUE(group_id, invitee_email, status) WHERE status = 'pending'
);

-- Activity log for group actions
CREATE TABLE IF NOT EXISTS group_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type activity_type NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Predefined roles with permissions
CREATE TABLE IF NOT EXISTS group_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}',
  is_system_role boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Insert default system roles
INSERT INTO group_roles (name, description, permissions, is_system_role) VALUES
('owner', 'Group owner with full permissions', '{"manage_group": true, "manage_members": true, "delete_group": true, "invite_members": true, "moderate_content": true}', true),
('admin', 'Administrator with management permissions', '{"manage_members": true, "invite_members": true, "moderate_content": true, "update_group": true}', true),
('moderator', 'Moderator with content management permissions', '{"moderate_content": true, "invite_members": true}', true),
('member', 'Regular member with basic permissions', '{"view_content": true, "participate": true}', true)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_groups_creator_id ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_privacy ON groups(privacy);
CREATE INDEX IF NOT EXISTS idx_groups_industry ON groups(industry);
CREATE INDEX IF NOT EXISTS idx_groups_stage ON groups(stage);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_active ON groups(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_groups_tags ON groups USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);
CREATE INDEX IF NOT EXISTS idx_group_members_active ON group_members(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee_email ON group_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON group_invitations(status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_expires_at ON group_invitations(expires_at);

CREATE INDEX IF NOT EXISTS idx_group_activity_group_id ON group_activity(group_id);
CREATE INDEX IF NOT EXISTS idx_group_activity_user_id ON group_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_group_activity_type ON group_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_group_activity_created_at ON group_activity(created_at DESC);

-- Enable Row Level Security
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups table
CREATE POLICY "Public groups are viewable by everyone"
  ON groups FOR SELECT
  TO authenticated
  USING (privacy = 'public' OR creator_id = auth.uid());

CREATE POLICY "Private groups are viewable by members"
  ON groups FOR SELECT
  TO authenticated
  USING (
    privacy = 'public' OR 
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = groups.id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Group owners and admins can update groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = groups.id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

CREATE POLICY "Only group owners can delete groups"
  ON groups FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- RLS Policies for group_members table
CREATE POLICY "Group members are viewable by group members"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Group owners and admins can manage members"
  ON group_members FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id 
      AND g.creator_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.role IN ('owner', 'admin')
      AND gm.is_active = true
    )
  );

-- RLS Policies for group_invitations table
CREATE POLICY "Users can view their own invitations"
  ON group_invitations FOR SELECT
  TO authenticated
  USING (
    inviter_id = auth.uid() OR 
    invitee_id = auth.uid() OR
    invitee_email = auth.email()
  );

CREATE POLICY "Group members can send invitations"
  ON group_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = group_invitations.group_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin', 'moderator')
      AND is_active = true
    )
  );

CREATE POLICY "Users can update their own invitations"
  ON group_invitations FOR UPDATE
  TO authenticated
  USING (
    inviter_id = auth.uid() OR 
    invitee_id = auth.uid() OR
    invitee_email = auth.email()
  );

-- RLS Policies for group_activity table
CREATE POLICY "Group members can view group activity"
  ON group_activity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members 
      WHERE group_id = group_activity.group_id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "System can insert activity logs"
  ON group_activity FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for group_roles table
CREATE POLICY "Group roles are viewable by authenticated users"
  ON group_roles FOR SELECT
  TO authenticated
  USING (true);

-- Functions and Triggers

-- Function to update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    UPDATE groups 
    SET current_member_count = current_member_count + 1,
        updated_at = now()
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = false AND NEW.is_active = true THEN
      UPDATE groups 
      SET current_member_count = current_member_count + 1,
          updated_at = now()
      WHERE id = NEW.group_id;
    ELSIF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE groups 
      SET current_member_count = current_member_count - 1,
          updated_at = now()
      WHERE id = NEW.group_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_active = true THEN
    UPDATE groups 
    SET current_member_count = current_member_count - 1,
        updated_at = now()
    WHERE id = OLD.group_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update member count
CREATE TRIGGER trigger_update_group_member_count
  AFTER INSERT OR UPDATE OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- Function to automatically add creator as owner
CREATE OR REPLACE FUNCTION add_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO group_members (group_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.creator_id, 'owner', now());
  
  -- Log group creation activity
  INSERT INTO group_activity (group_id, user_id, activity_type, description)
  VALUES (NEW.id, NEW.creator_id, 'group_created', 'Group "' || NEW.name || '" was created');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to add creator as owner when group is created
CREATE TRIGGER trigger_add_creator_as_owner
  AFTER INSERT ON groups
  FOR EACH ROW EXECUTE FUNCTION add_creator_as_owner();

-- Function to log member activities
CREATE OR REPLACE FUNCTION log_member_activity()
RETURNS TRIGGER AS $$
DECLARE
  activity_desc text;
  activity_type_val activity_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    activity_desc := 'User joined the group';
    activity_type_val := 'member_joined';
    
    INSERT INTO group_activity (group_id, user_id, activity_type, description)
    VALUES (NEW.group_id, NEW.user_id, activity_type_val, activity_desc);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role != NEW.role THEN
      activity_desc := 'User role changed from ' || OLD.role || ' to ' || NEW.role;
      activity_type_val := CASE 
        WHEN NEW.role > OLD.role THEN 'member_promoted'
        ELSE 'member_demoted'
      END;
      
      INSERT INTO group_activity (group_id, user_id, activity_type, description)
      VALUES (NEW.group_id, NEW.user_id, activity_type_val, activity_desc);
    END IF;
    
    IF OLD.is_active = true AND NEW.is_active = false THEN
      activity_desc := 'User left the group';
      activity_type_val := 'member_left';
      
      INSERT INTO group_activity (group_id, user_id, activity_type, description)
      VALUES (NEW.group_id, NEW.user_id, activity_type_val, activity_desc);
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    activity_desc := 'User was removed from the group';
    activity_type_val := 'member_left';
    
    INSERT INTO group_activity (group_id, user_id, activity_type, description)
    VALUES (OLD.group_id, OLD.user_id, activity_type_val, activity_desc);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to log member activities
CREATE TRIGGER trigger_log_member_activity
  AFTER INSERT OR UPDATE OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION log_member_activity();

-- Function to update group updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update group updated_at
CREATE TRIGGER trigger_update_group_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_group_updated_at();

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE group_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired invitations (if pg_cron is available)
-- SELECT cron.schedule('cleanup-expired-invitations', '0 0 * * *', 'SELECT cleanup_expired_invitations();');
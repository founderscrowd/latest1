/*
  # Add Slug Support to Groups Table

  1. Changes
    - Add `slug` column to groups table
    - Create unique index on slug for fast lookups
    - Create function to generate URL-friendly slugs
    - Populate existing groups with slugs based on their names
    - Add trigger to auto-generate slug on insert

  2. Security
    - No RLS changes needed (existing policies remain)

  3. Notes
    - Slugs are auto-generated from group names
    - Slugs are unique and URL-friendly
    - If slug conflicts exist, a number suffix is added
*/

-- Add slug column to groups table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'groups' AND column_name = 'slug'
  ) THEN
    ALTER TABLE groups ADD COLUMN slug text;
  END IF;
END $$;

-- Function to generate unique slug for a group
CREATE OR REPLACE FUNCTION generate_unique_group_slug(group_name text, group_id uuid DEFAULT NULL)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Generate base slug from name
  base_slug := lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(group_name, '[^\w\s-]', '', 'g'),
        '\s+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
  
  -- Trim leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'group';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for conflicts and add number suffix if needed
  WHILE EXISTS (
    SELECT 1 FROM groups 
    WHERE slug = final_slug 
    AND (group_id IS NULL OR id != group_id)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Populate slugs for existing groups
UPDATE groups
SET slug = generate_unique_group_slug(name, id)
WHERE slug IS NULL;

-- Make slug column NOT NULL after populating
ALTER TABLE groups ALTER COLUMN slug SET NOT NULL;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_slug ON groups(slug);

-- Function to auto-generate slug before insert
CREATE OR REPLACE FUNCTION set_group_slug_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_unique_group_slug(NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug on insert
DROP TRIGGER IF EXISTS groups_slug_trigger ON groups;
CREATE TRIGGER groups_slug_trigger
BEFORE INSERT ON groups
FOR EACH ROW
EXECUTE FUNCTION set_group_slug_on_insert();

-- Function to update slug when name changes
CREATE OR REPLACE FUNCTION update_group_slug_on_name_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name != OLD.name THEN
    NEW.slug := generate_unique_group_slug(NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update slug when name changes
DROP TRIGGER IF EXISTS groups_slug_update_trigger ON groups;
CREATE TRIGGER groups_slug_update_trigger
BEFORE UPDATE ON groups
FOR EACH ROW
EXECUTE FUNCTION update_group_slug_on_name_change();
/*
  # Add location fields to groups table

  1. New Columns
    - `location_type` (text) - Either 'worldwide' or 'location_based'
    - `country` (text, nullable) - Country name for location-based startups
    - `city` (text, nullable) - City name for location-based startups

  2. Changes
    - Add location_type column with default 'worldwide'
    - Add country and city columns as optional fields
    - Add check constraint to ensure location_type is valid
    - Add check constraint to ensure country/city are provided when location_type is 'location_based'

  3. Security
    - No RLS changes needed as existing policies cover these fields
*/

-- Add location_type column with default value
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'worldwide';

-- Add country and city columns
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS city text;

-- Add check constraint for valid location_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'groups_location_type_check'
  ) THEN
    ALTER TABLE groups 
    ADD CONSTRAINT groups_location_type_check 
    CHECK (location_type IN ('worldwide', 'location_based'));
  END IF;
END $$;

-- Add check constraint to ensure country/city are provided when location_type is 'location_based'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'groups_location_fields_check'
  ) THEN
    ALTER TABLE groups 
    ADD CONSTRAINT groups_location_fields_check 
    CHECK (
      (location_type = 'worldwide') OR 
      (location_type = 'location_based' AND country IS NOT NULL AND city IS NOT NULL)
    );
  END IF;
END $$;
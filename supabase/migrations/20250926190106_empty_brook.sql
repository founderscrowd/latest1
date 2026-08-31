/*
  # Add Site Announcement Settings

  1. New Settings
    - `site_announcement_text` - The text for the site-wide announcement banner (max 50 characters)
    - `site_announcement_enabled` - Whether the site-wide announcement banner is enabled (true/false)

  2. Security
    - Uses existing RLS policies on site_settings table
    - Only site admins can modify these settings
*/

INSERT INTO public.site_settings (key, value, description)
VALUES
    ('site_announcement_text', '', 'The text for the site-wide announcement banner (max 50 characters).'),
    ('site_announcement_enabled', 'false', 'Whether the site-wide announcement banner is enabled (true/false).')
ON CONFLICT (key) DO NOTHING;
-- Add maritime_expertise column to workshop_profiles if it doesn't exist
ALTER TABLE workshop_profiles 
ADD COLUMN IF NOT EXISTS maritime_expertise TEXT[];

-- Update the maritime_expertise column with data from workshops table
UPDATE workshop_profiles wp
SET maritime_expertise = w.expertise
FROM workshops w
WHERE wp.display_id = w.display_id;

-- If no workshop_profiles records exist, insert them from workshops
INSERT INTO workshop_profiles (
  display_id,
  full_name,
  email,
  whatsapp_number,
  home_port,
  maritime_expertise,
  is_active,
  average_rating,
  total_reviews,
  created_at
)
SELECT 
  display_id,
  name as full_name,
  email,
  phone as whatsapp_number,
  port as home_port,
  expertise as maritime_expertise,
  is_active,
  rating as average_rating,
  total_reviews,
  created_at
FROM workshops
WHERE display_id IS NOT NULL
ON CONFLICT (display_id) DO NOTHING;
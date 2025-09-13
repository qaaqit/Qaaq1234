-- Copy workshops data to workshop_profiles table
INSERT INTO workshop_profiles (
  id,
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
  id,
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
ON CONFLICT (id) DO NOTHING;
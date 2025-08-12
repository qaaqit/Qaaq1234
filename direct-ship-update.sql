-- Update GFS Galaxy with correct IMO and position
UPDATE users 
SET 
  current_ship_name = 'GFS Galaxy',
  current_ship_imo = '9401271',
  current_latitude = 26.45551,
  current_longitude = 56.61817,
  location_source = 'Vessel Tracking'
WHERE 
  (current_ship_name = 'GFS Galaxy' OR current_ship_imo = '9734567')
  AND onboard_status = 'ONBOARD';

-- Update Ocean Pioneer to COSCO ADEN with correct position
UPDATE users 
SET 
  current_ship_name = 'COSCO ADEN',
  current_ship_imo = '9484003',
  current_latitude = 1.2044,
  current_longitude = 103.5586,
  location_source = 'Vessel Tracking'
WHERE 
  current_ship_name = 'Ocean Pioneer'
  AND onboard_status = 'ONBOARD';

-- Update SPIL NIKEN with IMO and position
UPDATE users 
SET 
  current_ship_name = 'SPIL NIKEN',
  current_ship_imo = '9273947',
  current_latitude = -0.6856,
  current_longitude = 106.9856,
  location_source = 'Vessel Tracking'
WHERE 
  LOWER(current_ship_name) = 'spil niken'
  AND onboard_status = 'ONBOARD';

-- Show all onboard users after updates
SELECT 
  full_name,
  current_ship_name,
  current_ship_imo,
  current_latitude,
  current_longitude,
  onboard_status
FROM users
WHERE onboard_status = 'ONBOARD'
ORDER BY current_ship_name;

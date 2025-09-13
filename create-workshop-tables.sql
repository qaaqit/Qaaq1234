-- Create workshops table
CREATE TABLE IF NOT EXISTS workshops (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(100),
  port VARCHAR(255),
  country VARCHAR(255),
  expertise TEXT[], -- Array of expertise areas
  competency_expertise TEXT,
  home_port VARCHAR(255),
  visa_status VARCHAR(255),
  companies_worked_for TEXT,
  official_website VARCHAR(500),
  per_day_attendance_rate DECIMAL(10,2),
  remote_troubleshooting_rate DECIMAL(10,2),
  workshop_type VARCHAR(100),
  services_offered TEXT[],
  profile_picture_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  rating DECIMAL(3,2),
  total_reviews INTEGER DEFAULT 0,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample workshops
INSERT INTO workshops (display_id, name, email, phone, port, country, expertise, services_offered, rating, total_reviews) VALUES
('WS001', 'Marine Tech Solutions', 'info@marinetech.com', '+91-22-1234567', 'Mumbai', 'India', ARRAY['marine_mechanic', 'marine_engineer'], ARRAY['Engine Overhaul', 'Valve Replacement', 'System Diagnostics'], 4.5, 23),
('WS002', 'Singapore Ship Services', 'contact@sgships.sg', '+65-6543210', 'Singapore', 'Singapore', ARRAY['marine_electrician', 'marine_engineer'], ARRAY['Generator Service', 'Electrical Systems', 'Load Testing'], 4.8, 47),
('WS003', 'Rotterdam Marine Works', 'info@rotterdammarine.nl', '+31-10-9876543', 'Rotterdam', 'Netherlands', ARRAY['marine_mechanic', 'marine_technician'], ARRAY['Shaft Alignment', 'Propulsion Systems', 'Hull Repairs'], 4.6, 35),
('WS004', 'Dubai Maritime Services', 'services@dubaiships.ae', '+971-4-5551234', 'Dubai', 'UAE', ARRAY['marine_engineer', 'marine_electrician'], ARRAY['Complete Overhaul', 'Electrical Works', 'HVAC Systems'], 4.7, 29),
('WS005', 'Shanghai Marine Engineering', 'info@shanghaimarine.cn', '+86-21-7654321', 'Shanghai', 'China', ARRAY['marine_mechanic', 'marine_engineer', 'marine_electrician'], ARRAY['Engine Services', 'System Integration', 'Automation'], 4.4, 18),
('WS006', 'Hamburg Ship Repairs', 'contact@hamburgrepairs.de', '+49-40-3456789', 'Hamburg', 'Germany', ARRAY['marine_technician', 'marine_engineer'], ARRAY['Emergency Repairs', 'Maintenance', 'Inspections'], 4.9, 52),
('WS007', 'Bhavnagar Marine Workshop', 'info@bhavnagarships.in', '+91-278-9876543', 'Bhavnagar', 'India', ARRAY['marine_mechanic', 'ship_recycling'], ARRAY['Ship Breaking', 'Salvage Operations', 'Repairs'], 4.2, 15),
('WS008', 'Cape Town Maritime', 'services@capetownmarine.za', '+27-21-5551234', 'Cape Town', 'South Africa', ARRAY['marine_engineer', 'marine_electrician'], ARRAY['Engine Services', 'Electrical Systems', 'Navigation Equipment'], 4.5, 21),
('WS009', 'New York Ship Services', 'info@nyships.com', '+1-212-5556789', 'New York/New Jersey', 'USA', ARRAY['marine_engineer', 'marine_technician'], ARRAY['System Upgrades', 'Compliance Checks', 'Repairs'], 4.6, 38),
('WS010', 'Antwerp Maritime Solutions', 'contact@antwerpships.be', '+32-3-2345678', 'Antwerp', 'Belgium', ARRAY['marine_mechanic', 'marine_engineer'], ARRAY['Engine Overhaul', 'Hull Works', 'Painting'], 4.7, 33);

-- Create workshop_expertise_tasks junction table to link workshops with tasks they can perform
CREATE TABLE IF NOT EXISTS workshop_expertise_tasks (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id VARCHAR(255) REFERENCES workshops(id),
  task_id VARCHAR(255),
  expertise VARCHAR(255),
  port VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Link workshops to tasks based on their expertise
INSERT INTO workshop_expertise_tasks (workshop_id, task_id, expertise, port)
SELECT 
  w.id,
  t.id,
  UNNEST(t.required_expertise::text[]),
  w.port
FROM workshops w
CROSS JOIN workshop_service_tasks t
WHERE 
  w.expertise && t.required_expertise::text[]
  AND w.is_active = true
  AND t.is_active = true;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_workshop_expertise_port ON workshop_expertise_tasks(expertise, port);
CREATE INDEX IF NOT EXISTS idx_workshop_port ON workshops(port);
CREATE INDEX IF NOT EXISTS idx_workshop_expertise ON workshops USING GIN (expertise);
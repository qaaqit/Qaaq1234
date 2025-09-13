-- Properly create the workshop_expertise_tasks junction table
DROP TABLE IF EXISTS workshop_expertise_tasks;

CREATE TABLE IF NOT EXISTS workshop_expertise_tasks (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id VARCHAR(255) REFERENCES workshops(id),
  task_id VARCHAR(255),
  expertise VARCHAR(255),
  port VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Properly link workshops to tasks based on their expertise
-- Converting jsonb to individual expertise elements
INSERT INTO workshop_expertise_tasks (workshop_id, task_id, expertise, port)
SELECT DISTINCT
  w.id as workshop_id,
  t.id as task_id,
  we.expertise,
  w.port
FROM workshops w
CROSS JOIN workshop_service_tasks t
CROSS JOIN LATERAL (
  SELECT unnest(w.expertise) as expertise
) we
CROSS JOIN LATERAL (
  SELECT jsonb_array_elements_text(t.required_expertise) as required_expertise
) te
WHERE 
  we.expertise = te.required_expertise
  AND w.is_active = true
  AND t.is_active = true;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_workshop_expertise_port ON workshop_expertise_tasks(expertise, port);
CREATE INDEX IF NOT EXISTS idx_workshop_task ON workshop_expertise_tasks(task_id);
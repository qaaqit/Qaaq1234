-- Create glossary_entries table for tracking glossary terms
CREATE TABLE IF NOT EXISTS glossary_entries (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    term VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    confidence_score DECIMAL(3,2) DEFAULT 0.00,
    auto_generated BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id)
);

-- Create glossary_update_log table for tracking update runs
CREATE TABLE IF NOT EXISTS glossary_update_log (
    id SERIAL PRIMARY KEY,
    last_checked TIMESTAMP NOT NULL,
    terms_processed INTEGER DEFAULT 0,
    terms_added INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_glossary_entries_term ON glossary_entries(term);
CREATE INDEX IF NOT EXISTS idx_glossary_entries_category ON glossary_entries(category);
CREATE INDEX IF NOT EXISTS idx_glossary_entries_active ON glossary_entries(is_active);
CREATE INDEX IF NOT EXISTS idx_glossary_entries_auto_generated ON glossary_entries(auto_generated);
CREATE INDEX IF NOT EXISTS idx_glossary_update_log_last_checked ON glossary_update_log(last_checked);

-- Insert initial log entry if table is empty
INSERT INTO glossary_update_log (last_checked, terms_processed, terms_added)
SELECT CURRENT_TIMESTAMP - INTERVAL '1 day', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM glossary_update_log);

COMMENT ON TABLE glossary_entries IS 'Tracks maritime terms extracted from questions for the glossary';
COMMENT ON TABLE glossary_update_log IS 'Logs glossary auto-update runs and statistics';
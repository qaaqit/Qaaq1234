-- Add message status columns to chat_messages table in parent QAAQ database
-- These columns are needed for single/double tick message status system

ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

-- Update existing messages to have delivered status
UPDATE chat_messages 
SET is_delivered = true, delivered_at = created_at 
WHERE is_delivered IS NULL;

-- Update read messages to have read_at timestamp
UPDATE chat_messages 
SET read_at = created_at 
WHERE is_read = true AND read_at IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_delivered ON chat_messages(is_delivered);
CREATE INDEX IF NOT EXISTS idx_chat_messages_delivered_at ON chat_messages(delivered_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_at ON chat_messages(read_at);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND column_name IN ('is_delivered', 'delivered_at', 'read_at')
ORDER BY column_name;
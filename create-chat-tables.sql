-- Create chat_connections table
CREATE TABLE IF NOT EXISTS chat_connections (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id VARCHAR NOT NULL,
    receiver_id VARCHAR NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT now(),
    accepted_at TIMESTAMP
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id VARCHAR NOT NULL,
    sender_id VARCHAR NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_connections_sender_receiver ON chat_connections(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_connection ON chat_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
-- Safe addition of subscription columns to parent QAAQ database
-- Only adds columns if they don't exist to prevent errors

-- Check if subscription_type column exists, add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'subscription_type'
    ) THEN
        ALTER TABLE users ADD COLUMN subscription_type TEXT;
        RAISE NOTICE 'Added subscription_type column';
    ELSE
        RAISE NOTICE 'subscription_type column already exists';
    END IF;
END $$;

-- Check if subscription_status column exists, add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
        RAISE NOTICE 'Added subscription_status column';
    ELSE
        RAISE NOTICE 'subscription_status column already exists';
    END IF;
END $$;

-- Check if is_premium column exists, add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_premium'
    ) THEN
        ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_premium column';
    ELSE
        RAISE NOTICE 'is_premium column already exists';
    END IF;
END $$;

-- Check if premium_expires_at column exists, add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'premium_expires_at'
    ) THEN
        ALTER TABLE users ADD COLUMN premium_expires_at TIMESTAMP;
        RAISE NOTICE 'Added premium_expires_at column';
    ELSE
        RAISE NOTICE 'premium_expires_at column already exists';
    END IF;
END $$;

-- Check if razorpay_customer_id column exists, add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'razorpay_customer_id'
    ) THEN
        ALTER TABLE users ADD COLUMN razorpay_customer_id TEXT;
        RAISE NOTICE 'Added razorpay_customer_id column';
    ELSE
        RAISE NOTICE 'razorpay_customer_id column already exists';
    END IF;
END $$;

-- Check if payment_method column exists, add if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE users ADD COLUMN payment_method TEXT;
        RAISE NOTICE 'Added payment_method column';
    ELSE
        RAISE NOTICE 'payment_method column already exists';
    END IF;
END $$;

-- Verify all subscription columns are present
SELECT 
    'subscription_type' as column_name,
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='subscription_type') 
         THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'subscription_status' as column_name,
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='subscription_status') 
         THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'is_premium' as column_name,
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_premium') 
         THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'premium_expires_at' as column_name,
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='premium_expires_at') 
         THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'razorpay_customer_id' as column_name,
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='razorpay_customer_id') 
         THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'payment_method' as column_name,
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='payment_method') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;
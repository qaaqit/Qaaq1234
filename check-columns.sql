SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('current_ship_name', 'company', 'rank', 'maritime_rank') ORDER BY column_name;

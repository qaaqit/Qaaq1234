-- Update question counts for sample users to test the Q metric display
-- This simulates real Q&A data that would come from the QAAQ admin panel

UPDATE users SET question_count = 25 WHERE full_name = 'Piyush Gupta';
UPDATE users SET question_count = 18 WHERE full_name = 'Advait Parashare';
UPDATE users SET question_count = 12 WHERE full_name = 'JOEL  VALOOKARAN GEORGE';
UPDATE users SET question_count = 8 WHERE full_name = 'Vandan Tandel';
UPDATE users SET question_count = 35 WHERE full_name = 'Madan govindraj';
UPDATE users SET question_count = 6 WHERE full_name = 'Yaghyavrat Shekhawat';
UPDATE users SET question_count = 14 WHERE full_name = 'Manvendra Singh';
UPDATE users SET question_count = 22 WHERE full_name = 'Akash sadan';
UPDATE users SET question_count = 9 WHERE full_name = 'Hello Professional';

-- Verify the updates
SELECT full_name, question_count FROM users WHERE question_count > 0 ORDER BY question_count DESC;
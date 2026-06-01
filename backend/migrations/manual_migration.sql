-- Migration: Add daging columns to food_data table
ALTER TABLE food_data 
ADD COLUMN IF NOT EXISTS daging_sapi_tersedia FLOAT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS daging_sapi_kebutuhan FLOAT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS daging_ayam_tersedia FLOAT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS daging_ayam_kebutuhan FLOAT NOT NULL DEFAULT 0;

-- Remove default values after adding columns
ALTER TABLE food_data 
ALTER COLUMN daging_sapi_tersedia DROP DEFAULT,
ALTER COLUMN daging_sapi_kebutuhan DROP DEFAULT,
ALTER COLUMN daging_ayam_tersedia DROP DEFAULT,
ALTER COLUMN daging_ayam_kebutuhan DROP DEFAULT;

-- Migration: Add display_name to admin_users table
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS display_name VARCHAR;

-- Update alembic_version to latest revision
UPDATE alembic_version SET version_num = 'd3b7e8f9c2aa';

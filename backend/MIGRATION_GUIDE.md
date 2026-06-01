# Database Migration Guide

## Error yang Terjadi
```
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedColumn) 
column admin_users.display_name does not exist
```

Error ini terjadi karena kolom `display_name` dan kolom daging belum ditambahkan ke database.

## Solusi

### Opsi 1: Menggunakan Alembic (Recommended)

1. Masuk ke direktori backend:
```bash
cd backend
```

2. Jalankan migration:
```bash
alembic upgrade head
```

### Opsi 2: Manual SQL (Jika Alembic Tidak Tersedia)

1. Koneksi ke database PostgreSQL Anda
2. Jalankan SQL script berikut:

```sql
-- Add daging columns to food_data table
ALTER TABLE food_data 
ADD COLUMN IF NOT EXISTS daging_sapi_tersedia FLOAT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS daging_sapi_kebutuhan FLOAT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS daging_ayam_tersedia FLOAT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS daging_ayam_kebutuhan FLOAT NOT NULL DEFAULT 0;

-- Remove default values
ALTER TABLE food_data 
ALTER COLUMN daging_sapi_tersedia DROP DEFAULT,
ALTER COLUMN daging_sapi_kebutuhan DROP DEFAULT,
ALTER COLUMN daging_ayam_tersedia DROP DEFAULT,
ALTER COLUMN daging_ayam_kebutuhan DROP DEFAULT;

-- Add display_name to admin_users table
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS display_name VARCHAR;

-- Update alembic version
UPDATE alembic_version SET version_num = 'd3b7e8f9c2aa';
```

### Opsi 3: Menggunakan psql Command Line

```bash
psql -U your_username -d your_database -f backend/migrations/manual_migration.sql
```

## Verifikasi

Setelah menjalankan migration, verifikasi dengan query berikut:

```sql
-- Cek kolom di food_data
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'food_data' 
AND column_name LIKE '%daging%';

-- Cek kolom di admin_users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admin_users' 
AND column_name = 'display_name';
```

## Urutan Migration

1. `bc10cf5a949a` - init_schema
2. `8100e007209e` - add_catatan_to_food_data
3. `5d6a8c7b9e10` - add_admin_users_table
4. `c2a6b9f4d1aa` - add_profile_photo_to_admin_users
5. `e4c8f9d0b3bb` - add_daging_columns_to_food_data (BARU)
6. `d3b7e8f9c2aa` - add_display_name_to_admin_users (BARU)

## Setelah Migration Berhasil

Restart backend server:
```bash
# Stop server (Ctrl+C)
# Start server again
uvicorn app.main:app --reload
```

Sekarang Anda bisa login ke dashboard admin tanpa error.

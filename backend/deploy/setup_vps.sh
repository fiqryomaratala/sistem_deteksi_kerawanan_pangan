#!/bin/bash
# ==============================================================================
# SKRIP OTOMATISASI SETUP VPS BACKEND & DATABASE (TUGAS AKHIR)
# OS Target: Ubuntu 20.04 / 22.04 LTS (RAM 1 GB)
# ==============================================================================

set -e

echo "=== 1. Update System & Install Dependencies ==="
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx git curl

echo "=== 2. Membuat Swap Space 2GB (Sangat Penting untuk RAM 1GB) ==="
if [ ! -f /swapfile ]; then
    echo "Membuat /swapfile 2GB..."
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap 2GB berhasil diaktifkan!"
else
    echo "Swapfile sudah ada, melompati pembuatan swap."
fi

echo "=== 3. Pengkonfigurasian Database PostgreSQL ==="
# Mengatur nama DB dan user default
DB_NAME="db_kerawanan_pangan"
DB_USER="ta_user"
DB_PASS="ta_password_secure123"

echo "Membuat database dan user PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" || true
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" || true

echo "=== 4. Membuat Direktori Aplikasi di /var/www/ta-backend ==="
sudo mkdir -p /var/www/ta-backend
sudo chown -R $USER:$USER /var/www/ta-backend

echo "=============================================================================="
echo " Setup dasar VPS selesai!"
echo " Silakan clone repository ke /var/www/ta-backend dan ikuti langkah di petunjuk."
echo "=============================================================================="

#!/bin/bash
set -e

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Installing Node.js dependencies ==="
npm install

echo "=== Building React frontend ==="
npm run build

echo "=== Build complete! ==="

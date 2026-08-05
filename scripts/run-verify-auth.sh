#!/data/data/com.termux/files/usr/bin/bash
TOKEN=$(grep "SQUARE_ACCESS_TOKEN" ~/.openclaw/workspace/Gratog/.env.prod | cut -d '=' -f2 | tr -d '"' | tr -d "'")
export SQUARE_ACCESS_TOKEN="$TOKEN"
node ~/.openclaw/workspace/Gratog/scripts/verify-square-auth.js

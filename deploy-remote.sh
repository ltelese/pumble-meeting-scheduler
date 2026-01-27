#!/bin/bash

# Deploy CalBridge to Production Server
# Usage: ./deploy-remote.sh

SERVER_USER="your-user"
SERVER_HOST="calbridge.algeniacloud.com"
SERVER_PATH="/var/www/calbridge"

echo "🚀 Deploying CalBridge to production..."

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# SSH to server and update
echo "🔄 Updating server..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
cd /var/www/calbridge
echo "📥 Pulling latest changes..."
git pull origin main
echo "📦 Installing dependencies..."
npm install --production
echo "🔨 Building TypeScript..."
npm run build
echo "♻️  Restarting application..."
pm2 restart calbridge
echo "✅ Deployment complete!"
pm2 status calbridge
ENDSSH

echo "🎉 Deployment finished! Check https://calbridge.algeniacloud.com"

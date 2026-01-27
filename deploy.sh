#!/bin/bash

# CalBridge Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting CalBridge deployment..."

# Configuration
APP_DIR="/var/www/calbridge"
REPO_URL="https://github.com/ltelese/pumble-meeting-scheduler.git"
NODE_ENV="production"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run with sudo${NC}"
    exit 1
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Installing...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"
echo -e "${GREEN}✓ npm version: $(npm -v)${NC}"

# Create app directory if it doesn't exist
if [ ! -d "$APP_DIR" ]; then
    echo -e "${YELLOW}Creating application directory...${NC}"
    mkdir -p $APP_DIR
fi

# Navigate to app directory
cd $APP_DIR

# Clone or pull latest code
if [ -d ".git" ]; then
    echo -e "${YELLOW}Pulling latest changes...${NC}"
    git pull origin main
else
    echo -e "${YELLOW}Cloning repository...${NC}"
    git clone $REPO_URL .
fi

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install --production

# Build TypeScript
echo -e "${YELLOW}Building application...${NC}"
npm run build

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}⚠️  .env file not found!${NC}"
    echo -e "${YELLOW}Please create .env file with required variables:${NC}"
    echo -e "  - PUMBLE_WEBHOOK_URL"
    echo -e "  - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD"
    echo -e "  - EMAIL_FROM"
    echo -e "  - CALDAV_* (optional)"
    exit 1
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2...${NC}"
    npm install -g pm2
fi

# Stop existing process
echo -e "${YELLOW}Stopping existing process...${NC}"
pm2 stop calbridge 2>/dev/null || true
pm2 delete calbridge 2>/dev/null || true

# Start application with PM2
echo -e "${YELLOW}Starting CalBridge with PM2...${NC}"
pm2 start npm --name "calbridge" -- start
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER 2>/dev/null || true

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}Application is running on http://localhost:3000${NC}"
echo -e "${YELLOW}View logs with: pm2 logs calbridge${NC}"
echo -e "${YELLOW}Restart with: pm2 restart calbridge${NC}"

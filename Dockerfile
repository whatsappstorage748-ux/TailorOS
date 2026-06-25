FROM node:18-slim

# Install Chromium and required dependencies for Puppeteer/headless browser execution
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system-installed Chromium binary
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package management files from backend and install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy Prisma schema from backend and run client generation
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy the rest of the backend source files
COPY backend/ .

# Expose the Express port
EXPOSE 5000

# Run the Express server
CMD ["node", "server.js"]

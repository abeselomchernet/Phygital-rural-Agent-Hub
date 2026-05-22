# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install cleanly
RUN npm ci

# Copy project files into the container
COPY . .

# Build the Vite frontend application
RUN npm run build

# Expose the API and Kiosk port
EXPOSE 3000

# Set environment to production to serve static frontend
ENV NODE_ENV=production

# Execute the Sovereign Node backend
CMD ["npx", "tsx", "server.ts"]

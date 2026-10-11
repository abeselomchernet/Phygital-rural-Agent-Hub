FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production DATA_MODE=synthetic ALLOW_EXTERNAL_TELEMETRY=false HOST=0.0.0.0
EXPOSE 3000
CMD ["npm", "start"]

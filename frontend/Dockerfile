# Weekly Vehicle Leasing Platform - Frontend Dockerfile
# Salvage-to-Lux Fleet Management - Next.js Frontend

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies only when needed
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Start development server
CMD ["npm", "run", "dev"]

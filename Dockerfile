# FirmOS Runner Engine Dockerfile
FROM node:20-alpine

# Install Git and SSH for repository operations
RUN apk add --no-cache git openssh-client

# Set working directory for the FirmOS engine itself
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the compiled code and essential assets
COPY dist ./dist
COPY src/state/migrations ./src/state/migrations
COPY runner-entrypoint.sh ./
RUN chmod +x runner-entrypoint.sh

# Create a directory for isolated target projects
RUN mkdir /workspace
WORKDIR /workspace

# Default environment variables
ENV NODE_ENV=production
ENV TARGET_WORKSPACE=/workspace

ENTRYPOINT ["/app/runner-entrypoint.sh"]

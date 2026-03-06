# Use Microsoft's Playwright image as base since it has all browser dependencies
FROM mcr.microsoft.com/playwright:v1.45.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and prompt config
COPY . .

# Build the project
RUN npm run build

# Expose port (MCP typically uses stdio, but some hosts might use HTTP)
# EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Set default command to run the MCP server
CMD ["npm", "start"]

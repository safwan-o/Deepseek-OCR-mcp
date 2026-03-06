# Use Microsoft's Playwright image as base since it has all browser dependencies
FROM mcr.microsoft.com/playwright:v1.45.0-jammy

# Create a non-root user and group
RUN groupadd -r mcpuser && useradd -r -g mcpuser -m -d /home/mcpuser mcpuser

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and prompt config
COPY . .

# Build the project
RUN npm run build

# Set ownership of the application directory to the non-root user
RUN chown -R mcpuser:mcpuser /app

# Switch to the non-root user
USER mcpuser

# Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Set default command to run the MCP server
CMD ["npm", "start"]

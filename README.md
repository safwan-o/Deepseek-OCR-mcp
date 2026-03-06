# Deepseek-OCR-mcp

An MCP (Model Context Protocol) server that provides OCR capabilities using Deepseek models.

## Features

- **OCR Image**: Perform high-quality OCR on image files.

## Prerequisites

- Node.js (v18 or later)
- npm

## Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the server:
   ```bash
   npm run build
   ```

## Usage

To use this server with an MCP-compatible host (like Claude Desktop), add it to your configuration file:

```json
{
  "mcpServers": {
    "deepseek-ocr": {
      "command": "node",
      "args": ["/path/to/Deepseek-OCR-mcp/dist/index.js"]
    }
  }
}
```

## Development

- Run in development mode with hot-reloading:
  ```bash
  npm run dev
  ```
- Build the project:
  ```bash
  npm run build
  ```

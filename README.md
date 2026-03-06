# Deepseek-OCR-mcp

An advanced MCP (Model Context Protocol) server that provides high-fidelity OCR and document analysis capabilities by automating the Deepseek Chat web interface.

## Features

- **High-Fidelity OCR**: Extract text exactly as it appears in images or PDFs.
- **Table Support**: Automatically converts document tables into Markdown format.
- **Stealth Automation**: Built-in evasion techniques to bypass anti-bot measures.
- **Session Persistence**: Authenticate once and reuse the session for multiple operations.
- **Docker Ready**: Fully containerized for easy deployment.
- **Structured Logging**: Uses `pino` for production-grade, non-interfering logs.

## Prerequisites

- Node.js (v18 or later)
- npm
- A Deepseek account

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/safwan-o/Deepseek-OCR-mcp.git
   cd Deepseek-OCR-mcp
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the server:
   ```bash
   npm run build
   ```

## Usage

### 1. Authentication
To use the server, you must first authenticate. The LLM can invoke the `authenticate` tool, which will launch a browser window for you to sign in manually.

- **Tool**: `authenticate`
- **Result**: Saves session data to `.deepseek-session.json`.

### 2. OCR Extraction
Once authenticated, use the `ocr_document` tool to process files.

- **Tool**: `ocr_document`
- **Arguments**: `file_path` (Absolute path to image or PDF)
- **Workflow**: The server will upload the file, send the OCR extraction prompt, wait for stability in the response, and return the final text.

### 3. Custom Data Sending
- **Tool**: `send_data`
- **Arguments**: `file_path`, `prompt`
- **Usage**: Use this for specialized analysis or questions about a document.

## Configuration

### Custom Prompts
You can modify `OCR-extraction-prompt.json` in the root directory to change the default behavior of the OCR and analysis tools.

### Environment Variables
- `OCR_PROMPT_FILE`: Path to a custom prompt JSON file.
- `DEEPSEEK_SESSION_JSON`: Inject session data directly via environment variable (useful for Docker/Headless deployments).
- `ALLOW_INTERACTIVE_AUTH`: Set to `true` to allow headed browser launch in specific environments.
- `LOG_LEVEL`: Adjust logging verbosity (`info`, `debug`, `error`).

## Docker Deployment

You can run the server in a container using the provided `Dockerfile`.

1. Build the image:
   ```bash
   docker build -t deepseek-ocr-mcp .
   ```
2. Run the container:
   ```bash
   docker run -i --rm -e DEEPSEEK_SESSION_JSON='<YOUR_SESSION_JSON_STRING>' deepseek-ocr-mcp
   ```

## Integration Guides

### Adding to `gemini-cli`
To add this server to your `gemini-cli` configuration:

1. Locate your `gemini-cli` config (typically in `~/.gemini/config.json` or as specified in your setup).
2. Add the following entry to the `mcpServers` section:
   ```json
   {
     "mcpServers": {
       "deepseek-ocr": {
         "command": "node",
         "args": ["<path-to-project>/dist/index.js"]
       }
     }
   }
   ```
   *Note: Replace the path with the absolute path to your `dist/index.js`.*

### Adding to MCP Docker Toolkit
If you are using the MCP Docker Toolkit:

1. Copy the `Dockerfile` and source code into your toolkit's management directory.
2. Add the service to your `docker-compose.yml`:
   ```yaml
   services:
     deepseek-ocr:
       build: ./Deepseek-OCR-mcp
       stdin_open: true
       tty: true
       environment:
         - DEEPSEEK_SESSION_JSON=${DEEPSEEK_SESSION_JSON}
   ```

## Troubleshooting

- **Session Expired**: Run the `authenticate` tool again to refresh your cookies.
- **Stability Timeout**: If a document is very large, the server might timeout waiting for generation. Try increasing `MAX_WAIT_STABLE` in `src/utils/uploader.ts`.
- **403 Forbidden**: Ensure you are not running in a heavily restricted network. The stealth plugin handles most basic detections.

## Development

- **Run Dev**: `npm run dev`
- **Run Tests**: `npm test`
- **Lint**: `npm run lint`

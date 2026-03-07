# Deepseek OCR MCP Server

An advanced Model Context Protocol (MCP) server that provides high-fidelity OCR and document analysis capabilities by automating the Deepseek Chat web interface using Playwright.

## 🚀 Features

- **High-Fidelity OCR**: Extract text exactly as it appears in images or PDFs using Deepseek's latest models.
- **Table Support**: Automatically detects and converts document tables into clean Markdown format.
- **Auto-Cleanup**: Automatically deletes the conversation from your Deepseek dashboard after extraction to keep your history clean.
- **Stealth Automation**: Uses advanced evasion techniques and stealth plugins to bypass anti-bot measures.
- **Session Persistence**: Robust authentication system that saves sessions for seamless reuse.
- **Docker Ready**: Fully containerized and optimized for cloud or local deployment.
- **Production-Grade Logging**: Integrated with `pino` for structured, non-interfering logging.

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher.
- **npm**: v9.0.0 or higher.
- **Deepseek Account**: A valid account is required for authentication.

## 🛠️ Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/safwan-o/Deepseek-OCR-mcp.git
   cd Deepseek-OCR-mcp
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Project**:
   ```bash
   npm run build
   ```

## 🔐 Authentication

To use the server, you must authenticate your Deepseek account. This process captures your session cookies and local storage to allow the automation to run.

- **Interactive Auth**: Run the `authenticate` tool. This will open a headed browser window.
- **Manual Login**: Sign in to your Deepseek account in the browser window.
- **Success**: Once you reach the chat dashboard, the server will automatically save your session to `.deepseek-session.json` and hibernate.

## 📖 Usage

### OCR Extraction
Use the `ocr_document` tool for standard text and table extraction.

- **Tool**: `ocr_document`
- **Arguments**: `file_path` (Absolute path to `.jpg`, `.png`, `.webp`, or `.pdf`)
- **Result**: Returns the extracted text in Markdown format.

### Custom Data Analysis
Use the `send_data` tool to ask specific questions about a document.

- **Tool**: `send_data`
- **Arguments**: 
  - `file_path`: Path to the document.
  - `prompt`: Your specific question or analysis request.

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OCR_PROMPT_FILE` | Path to custom prompt JSON | `OCR-extraction-prompt.json` |
| `LOG_LEVEL` | Logging verbosity (`debug`, `info`, `warn`, `error`) | `info` |
| `DEEPSEEK_SESSION_JSON` | Direct session injection for CI/CD | `undefined` |

## 🧪 Testing

The project includes a comprehensive suite of unit and integration tests using `vitest`.

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🐳 Docker Deployment

The server is fully compatible with Docker for isolated environments.

```bash
# Build
docker build -t deepseek-ocr-mcp .

# Run
docker run -i --rm -e DEEPSEEK_SESSION_JSON='<SESSION_DATA>' deepseek-ocr-mcp
```

## 🤝 Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feat/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feat/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

Distributed under the ISC License. See `LICENSE` for more information.

---
*Disclaimer: This project is an unofficial tool and is not affiliated with Deepseek.*

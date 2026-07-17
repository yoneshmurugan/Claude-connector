<div align="center">
  <img src="assets/icon.png" width="150" height="150" alt="Claude Connector Logo">
  
  # Claude Connector
  
  **A powerful, multi-account desktop client for Claude.ai with conversation bridging, local context vaulting, and seamless anti-detection.**
</div>

---

## ⚡ Overview

**Claude Connector** is an unofficial, highly optimized Electron desktop application designed to supercharge your Claude.ai workflow. 

Instead of constantly logging in and out of different accounts, this application allows you to run up to 5 completely isolated Claude sessions simultaneously. Furthermore, it introduces revolutionary cross-account features like the ability to "Extend" a conversation from Account A directly into Account B, and a local Context Vault to inject frequently used `.md` files directly into your prompts.

## ✨ Key Features

* **🎭 Multi-Account Isolation:** Run multiple Claude sessions side-by-side. Each account runs in an isolated `<webview>` partition, meaning cookies and local storage are strictly separated. 
* **🌉 Conversation Bridging (Extend Convo):** Hit a usage limit on Account 1? Click "Extend Convo". The app will silently scrape the DOM of your current chat, parse it into Markdown, and inject it straight into the ProseMirror editor of Account 2 so you can pick up exactly where you left off.
* **🗄️ Context Vault:** Export any conversation as a clean Markdown file saved directly to your hard drive. Drop your own `.md` files into the Vault panel, and inject them instantly into any Claude chat with a single click.
* **🛡️ Anti-Detection Built-In:** Claude uses Cloudflare to block automated bots. This app intercepts outbound network requests and dynamically spoofs strict Google Chrome `User-Agent` and `sec-ch-ua` headers, allowing the webviews to bypass security checks entirely.
* **🎨 Premium macOS Aesthetic:** Built with a stunning, lightweight UI. Features a frameless draggable window, deep violet ambient gradients, glassmorphism elements, and highly optimized, zero-CPU CSS animations.

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v16 or higher)
* npm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yoneshmurugan/Claude-connector.git
   cd Claude-connector
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the app in development mode:
   ```bash
   npm start
   ```

---

## 📦 Building for Production

This project uses `electron-builder` to package standalone desktop executables. The build configuration is optimized for macOS (DMG) and Windows (Portable EXE).

**To build the macOS Installer (.dmg):**
```bash
npm run build:mac
```

**To build the Windows Executable (.exe):**
```bash
npm run build:win
```
*Note: Due to NSIS architecture limitations on Apple Silicon, the Windows build generates a Portable Executable. This means Windows users can simply double-click the `.exe` to run the app without needing to install it!*

Find your compiled builds in the `dist/` folder.

---

## 🛠️ Architecture

* **Main Process (`src/main/`):** Manages the Electron lifecycle, window creation, native file system access for the Context Vault, and intercepting/spoofing HTTP headers.
* **Renderer Process (`src/renderer/`):** Manages the frontend UI. It dynamically spawns `<webview>` tags and handles the logic for switching tabs, updating the Vault UI, and triggering IPC events.
* **Injection Scripts (`src/scripts/`):** JavaScript files that are executed *inside* the isolated Claude webviews using `webview.executeJavaScript()`. 
  * `scraper.js`: Traverses the Claude React DOM to extract messages.
  * `auto-paster.js`: Simulates `DataTransfer` paste events to inject text directly into Claude's complex ProseMirror rich-text editor.

---

## ⚠️ Disclaimer

**This is an unofficial, community-built tool.** 
Claude Connector is not affiliated with, endorsed by, or sponsored by Anthropic. 

By using this application, you are wrapping the Claude.ai web interface and utilizing DOM scraping techniques. This violates Anthropic's Terms of Service regarding automated access and web scraping. 

**Use this tool strictly at your own risk.** Excessive automation, superhuman interaction speeds, or running many accounts simultaneously from a single IP address may result in your Claude accounts being flagged or banned by Anthropic. The creators of this repository hold no liability for lost accounts or data.

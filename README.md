<div align="center">
  <img src="assets/icon.png" width="150" height="150" alt="Claude Connector Logo">
  
  # Claude Connector
  
  **The ultimate multi-account desktop client for Claude.ai.**  
  *Run multiple accounts simultaneously, bypass limits, and share context across chats seamlessly.*
  
  <br>
  
  [![Download for Mac](https://img.shields.io/badge/Download_for_Mac-DMG-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/yoneshmurugan/Claude-connector/releases/download/v1.0.0/Claude.Connector-1.0.0-arm64.dmg)
  [![Download for Windows](https://img.shields.io/badge/Download_for_Windows-ZIP-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/yoneshmurugan/Claude-connector/releases/download/v1.0.0/Claude.Connector-1.0.0-arm64-win.zip)

</div>

---

## Why use Claude Connector?

If you rely on Claude heavily, you know the pain of hitting message limits and having to manually log out and log back in with a different account. **Claude Connector** solves this entirely. 

Designed with a beautiful, lightweight macOS-native interface, this app allows you to:
* **Run up to 10 Accounts at Once:** Each account is completely isolated. Stay logged into 10 different accounts at the exact same time without them interfering with each other.
* **Bridge Your Conversations (Extend Convo):** Hit a message limit on Account 1? With one click, the app automatically copies your current conversation and pastes it directly into Account 2 so you never lose your train of thought.
* **Build a Context Vault:** Save your favorite prompt instructions or long code snippets as Markdown files directly on your computer. Inject them into any Claude chat instantly.
* **Bypass Restrictions:** The app spoofs its headers so Claude (and Cloudflare) sees your connection as a standard Google Chrome browser, preventing you from being blocked as a "bot."

## How to Install (For Regular Users)

1. **Download:** Click one of the Download buttons at the very top of this page.
2. **Mac Users:** Open the downloaded `.dmg` file and drag the Claude Connector icon into your Applications folder.
3. **Windows Users:** Extract the downloaded `.zip` file and double-click `Claude Connector.exe` to run the app instantly!
4. **Login:** Click the `+` button in the app sidebar to add an account. *Important: You must log in using your Email address, as Google Login is blocked by Google for security reasons.*

> [!NOTE]
> **macOS Users:** Because this is an unsigned open-source app, macOS Gatekeeper may show a "Malware" warning the first time you open it. 
> To bypass this: Go to your Applications folder, **Right-Click** the Claude Connector icon, and select **Open**. Click "Open" again on the warning popup to launch the app!
---

<br>

# Developer Guide

Want to run the app from the source code or build it yourself? Follow the steps below.

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

### Building for Production
This project uses `electron-builder` to package standalone desktop executables. 

**To build the macOS Installer (.dmg):**
```bash
npm run build:mac
```

**To build the Windows Executable (.zip):**
```bash
npm run build:win
```
Find your compiled builds in the `dist/` folder.

---

## Architecture Overview

```mermaid
graph TD
    classDef mainProcess fill:#1e1e38,stroke:#a855f7,stroke-width:2px,color:#fff,rx:8px
    classDef renderer fill:#2a2a4a,stroke:#6366f1,stroke-width:2px,color:#fff,rx:8px
    classDef webview fill:#111122,stroke:#06b6d4,stroke-width:2px,color:#fff,rx:5px
    classDef script fill:#312e81,stroke:#818cf8,stroke-width:1px,color:#e0e7ff,rx:4px

    subgraph Backend ["Node.js Main Process"]
        Main["main.js"]:::mainProcess
        Headers["Header Interceptor"]:::mainProcess
        Vault["Vault File System"]:::mainProcess
    end

    subgraph Frontend ["Chromium Renderer Process"]
        UI["UI / Sidebar / App State"]:::renderer
        Webview1["Webview Partition 1"]:::webview
        Webview2["Webview Partition 2"]:::webview
        
        Scraper["scraper.js"]:::script
        Paster["auto-paster.js"]:::script
    end

    ClaudeAI(("Claude.ai Servers"))

    Main <-->|"IPC Bridge"| UI
    Main -->|"Spoofs User-Agent"| Headers
    Main <-->|"Read/Write .md files"| Vault

    UI -->|"Spawns"| Webview1
    UI -->|"Spawns"| Webview2

    Webview1 -->|"Injects"| Scraper
    Webview2 -->|"Injects"| Paster

    Webview1 -.->|"Outbound HTTP"| Headers
    Webview2 -.->|"Outbound HTTP"| Headers

    Headers -.->|"Bypasses Cloudflare"| ClaudeAI
```

* **Main Process (`src/main/`):** Manages the Electron lifecycle, window creation, native file system access for the Context Vault, and intercepting/spoofing HTTP headers.
* **Renderer Process (`src/renderer/`):** Manages the frontend UI. It dynamically spawns `<webview>` tags and handles the logic for switching tabs, updating the Vault UI, and triggering IPC events.
* **Injection Scripts (`src/scripts/`):** JavaScript files that are executed *inside* the isolated Claude webviews using `webview.executeJavaScript()`.

---

## 🔮 Future Works / Roadmap

Here are some powerful features and architectural upgrades planned for the future:

* **🛡️ Per-Account IP Proxies (Ultimate Anti-Ban):** Assign a different proxy server to each webview via Electron's `session.setProxy()`. Account 1 could look like it's in New York, while Account 2 routes through London!
* **⚡ Global Keyboard Shortcuts:** Summon the app instantly from anywhere on your Mac using a global hotkey, or rapidly snap between accounts using `Cmd + 1` etc.
* **🧠 Smart Auto-Routing (Load Balancing):** The app could run a quick DOM scrape across all webviews to read message limits, and automatically route your next prompt to the account with the most remaining usage!
* **🗂️ Claude Artifact Auto-Downloader:** Automatically detect when Claude generates an "Artifact" (React code, HTML, SVG) and instantly download it as a real file to your local hard drive.
* **🪟 Multi-Monitor Pop-Outs:** Tear a specific `<webview>` out of the main window into its own floating Electron `BrowserWindow` to view accounts side-by-side on dual monitors.

---

## ⚠️ Disclaimer

**This is an unofficial, community-built tool.** 
Claude Connector is not affiliated with, endorsed by, or sponsored by Anthropic. 

By using this application, you are wrapping the Claude.ai web interface and utilizing DOM scraping techniques. This violates Anthropic's Terms of Service regarding automated access and web scraping. 

**Use this tool strictly at your own risk.** Excessive automation or superhuman interaction speeds may result in your Claude accounts being flagged or banned by Anthropic. The creators of this repository hold no liability for lost accounts or data.

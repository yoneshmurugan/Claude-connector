# Claude Connector: Technical Breakdown

This document serves as an educational overview of the architecture, techniques, and specific engineering solutions used to build the Claude Connector application. 

## 1. Core Architecture: Electron & Webviews
At its core, this app is built on **Electron**, a framework that allows you to build desktop applications using web technologies (HTML, CSS, JavaScript) combined with a Node.js backend.

Instead of trying to use an official API, we used a technique called **Web Wrapping**. 
* **The `<webview>` Tag:** Electron provides a `<webview>` tag, which is essentially an isolated browser instance embedded directly into our app. Every time you click "Add Account," the app dynamically creates a new `<webview>` pointing to `claude.ai`.
* **Session Isolation:** If you open two standard tabs to `claude.ai`, they share the same cookies and log you into the same account. To fix this, we assigned a unique `partition` string to each webview (e.g., `persist:account1`, `persist:account2`). Electron creates completely separate cookie jars and local storage for each partition, allowing you to log into 10 different accounts simultaneously.

## 2. Bypassing Bot Protection
Modern websites like Claude use highly sophisticated bot protection (like Cloudflare) to prevent automated scripts from accessing their site. By default, Electron sends a User-Agent that clearly identifies it as an automated Electron app, which triggers an immediate block.

To bypass this, we implemented **Header Spoofing** in `main.js`:
* We intercepted all outbound web requests using `session.webRequest.onBeforeSendHeaders`.
* We replaced the default Electron `User-Agent` and `sec-ch-ua` headers with the exact headers a standard Google Chrome browser would send. Cloudflare sees these headers, assumes the app is just a normal user running Chrome on a Mac, and lets the connection through.

## 3. DOM Scraping & Injection (The "Extend Convo" feature)
The core feature of this app is the ability to grab a conversation from one account and paste it into another. Because the webviews are securely isolated, they cannot naturally talk to each other. 

We solved this using **Inter-Process Communication (IPC)** and **JavaScript Injection**:
1. **Extraction (Scraping):** When you click "Extend Convo", the Renderer process asks the Main process to execute a script (`scraper.js`) *inside* the source webview. This script reads the HTML Document Object Model (DOM), finds Claude's messages, formats them into Markdown, and sends the text back to our app.
2. **Injection (Pasting):** The app then takes that Markdown and executes another script (`auto-paster.js`) inside the *target* webview. Claude uses a complex rich-text editor called ProseMirror. You cannot simply set `textarea.value = text`. Instead, our script has to simulate real user events (creating an HTML `DataTransfer` object and dispatching a `paste` event directly onto the `.ProseMirror` element) to trick the website into thinking a human pressed `Cmd+V`.

## 4. The Context Vault & Node.js File System
Unlike a standard website, Electron apps have full access to the user's hard drive via Node.js.
* We created a local `vault` folder next to the app's source code.
* Using Node's `fs` (File System) module, the Main process can read, write, and delete `.md` files.
* When you click "Export MD", the app scrapes the chat and silently saves a physical file to your hard drive, which immediately appears in the right-hand Vault panel. 
* To inject files from the Vault into Claude, we built an "Inject" button that reads the file from the hard drive and uses our `auto-paster.js` logic to dump the file's contents into the chat box.

## 5. UI/UX: Lightweight Native macOS Feel
To make this web wrapper feel like a native macOS application without draining your laptop's battery, we employed lightweight UI techniques:
* **Frameless Window:** We removed the standard ugly grey Windows/Mac title bar by setting `titleBarStyle: 'hiddenInset'` in `main.js`. We then created our own HTML `<header>` and gave it `-webkit-app-region: drag`, allowing you to drag the window around by clicking our custom HTML element.
* **Performance Optimization:** Instead of using expensive GPU filters like `backdrop-filter: blur()`, the app uses sleek, solid background colors (`var(--bg-surface)`). We specifically removed infinite CSS animations (like pulsating shadows and glowing borders) to ensure the Electron renderer process sits at ~0% CPU usage when idle, making it highly efficient for all systems.
* **Efficient Transitions:** We kept hardware-accelerated animations strictly for user interactions (like hover states and clicking) using lightweight properties like `transform` and `opacity`.

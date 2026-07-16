# Implementation Plan: Claude Multi-Account Wrapper 
**Target Environment:** Desktop application (macOS/Windows/Linux)
**Core Framework:** Electron.js (Node.js)
**Objective:** Build a hybrid, semi-automated desktop wrapper that runs multiple isolated Claude free-tier accounts simultaneously. It must include an IPC bridge to safely scrape chat history from one session, format it as a markdown payload, and copy it to the system clipboard while switching tabs, completely avoiding bot-detection bans.

---

## 1. Project Scaffolding & Setup (Terminal Task)
**Agent Instructions:** Initialize the project repository and install required dependencies.
- Initialize a blank Node.js project.
- Install `electron` as a dev dependency.
- Create the foundational file structure: `main.js`, `preload.js`, `renderer.js`, `index.html`.
- Update `package.json` to include `"start": "electron ."` and set `"main": "main.js"`.

**Acceptance Criteria (Artifact):**
- Terminal output shows successful `npm install`.
- `package.json` reflects correct entry points.
- Project folder contains the four empty foundational files.

---

## 2. Core Main Process Architecture (`main.js`)
**Agent Instructions:** Construct the main Electron process with strict security partitions to ensure independent cookie jars for each account.
- Initialize `BrowserWindow` with `webviewTag: true`, `contextIsolation: true`, and `nodeIntegration: false`.
- Set the `preload` path securely.
- **IPC Setup:** Create an `ipcMain` listener named `bridge-conversation`.
- Inside the listener, implement the DOM scraping logic using `webContents.executeJavaScript` targeted at the sender webview.
- **Scraper Target:** Extract `.font-claude-message`, `.font-user-message`, and `<p>` tags. 
- Format the scraped text into the predefined System Instruction Markdown payload.
- Write the final payload to the system clipboard using Electron's `clipboard` module.
- Emit a `switch-tab` event back to the UI.

**Acceptance Criteria:**
- `main.js` correctly registers the IPC listener and handles asynchronous Javascript injection without crashing.

---

## 3. Security Bridge (`preload.js`)
**Agent Instructions:** Expose a secure API to the renderer process.
- Use `contextBridge.exposeInMainWorld` to create an `electronAPI` object.
- Expose a `bridgeConversation` method (to trigger the scrape).
- Expose an `onSwitchTab` listener (to handle the UI update after scraping).

---

## 4. User Interface & Layout (`index.html`)
**Agent Instructions:** Build a split layout UI that leverages Electron's `webview` tags for isolated browsing.
- **Sidebar:** Include navigation buttons for "Account 1" and "Account 2". 
- **Action Button:** Include a prominent "Extend Convo" button.
- **Main View:** Implement two `<webview>` tags pointing to `https://claude.ai`. 
- **CRITICAL:** Assign different `partition` attributes (e.g., `partition="persist:acc1"` and `partition="persist:acc2"`) to ensure cookies and local storage remain completely isolated.
- Hide inactive webviews using CSS (`visibility: hidden` and `position: absolute` rather than `display: none` to keep the instances alive).

**Acceptance Criteria (Artifact):**
- The UI renders cleanly without horizontal scrollbars.
- DOM inspector confirms both `<webview>` tags possess unique `partition` attributes.

---

## 5. Frontend UI Logic (`renderer.js`)
**Agent Instructions:** Implement the event listeners for tab switching and payload triggering.
- Add click listeners to the sidebar buttons to toggle the `.active` CSS class on the corresponding `<webview>`.
- Add a click listener to the "Extend Convo" button.
- When clicked, determine the `currentActiveView` and target view.
- Call `window.electronAPI.bridgeConversation({ from: currentActiveView, to: targetView })`.
- Implement the `onSwitchTab` callback to automatically change the active tab once the main process finishes pushing the payload to the clipboard.

**Acceptance Criteria:**
- Clicking tabs toggles the visible `webview`.
- Clicking "Extend Convo" fires the IPC bridge and automatically switches the active UI view.

---

## 6. Verification & Edge Cases (Browser/Agent Task)
**Agent Instructions:** Run the application locally and verify the following edge cases.
- **Edge Case 1 (Dynamic DOM):** If Anthropic alters CSS class names, the scraper must fall back to grabbing standard `<p>` tags gracefully without throwing fatal errors.
- **Edge Case 2 (Empty Scrape):** If the scraper finds no text, the clipboard must not overwrite the user's current clipboard state with a blank payload.
- **Edge Case 3 (Process Hanging):** Wrap the `executeJavaScript` injection in a `try/catch` block with a timeout to prevent the Electron main thread from hanging.

**Final Deliverable:** 
Once the code is generated and verified, package the source files and generate a task list Artifact confirming all Acceptance Criteria have been met.
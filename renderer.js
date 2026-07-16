// renderer.js — Shell UI Logic (Webview Architecture)
// Manages webview lifecycle, tab switching, and Extend Convo flow entirely in the DOM.

// ─── State ───────────────────────────────────────────────────────────────────
let activeAccountId = null;
let accountCount = 0;
let nextAccountId = 1;
const MAX_ACCOUNTS = 5;
const accounts = []; // Array of { id, webview }

// ─── DOM Elements ────────────────────────────────────────────────────────────
const accountTabsContainer = document.getElementById('account-tabs');
const addAccountBtn = document.getElementById('add-account-btn');
const webviewContainer = document.getElementById('webview-container');
const extendBtn = document.getElementById('extend-btn');
const targetSelect = document.getElementById('target-account-select');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const accountCountDisplay = document.getElementById('account-count');
const toastContainer = document.getElementById('toast-container');

// ─── Toast & Status ──────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3000);
}

function setStatus(state, text) {
  statusIndicator.className = `status-${state}`;
  statusText.textContent = text;
}

// ─── Account Management ──────────────────────────────────────────────────────

async function createAccount() {
  if (accountCount >= MAX_ACCOUNTS) {
    showToast('Maximum 5 accounts reached', 'warning');
    return;
  }

  const id = nextAccountId++;
  const partitionName = `persist:acc${id}`;

  try {
    // Tell main process to configure the session anti-detection headers
    await window.electronAPI.configureSession(partitionName);

    // Create the webview element
    const webview = document.createElement('webview');
    webview.setAttribute('src', 'https://claude.ai');
    webview.setAttribute('partition', partitionName);
    webview.setAttribute('preload', './webview-preload.js');
    webview.setAttribute('disablewebsecurity', 'false'); // Let standard web security apply
    webview.className = 'hidden'; // Hide initially

    // Intercept Google/Apple OAuth to open in system browser
    webview.addEventListener('will-navigate', (e) => {
      const url = e.url;
      if (
        url.includes('accounts.google.com') ||
        url.includes('appleid.apple.com') ||
        url.includes('oauth')
      ) {
        // Prevent default action (Note: In <webview>, will-navigate is often just informational.
        // If it still tries to load, we might need a different approach, but let's try this first.)
        // Actually, webviews handle popups differently. Let's listen for 'new-window'.
      }
    });

    // The reliable way to catch OAuth popups in <webview>
    webview.addEventListener('new-window', (e) => {
      const url = e.url;
      if (
        url.includes('accounts.google.com') ||
        url.includes('appleid.apple.com') ||
        url.includes('oauth')
      ) {
        window.electronAPI.openExternal(url);
      }
    });

    webviewContainer.appendChild(webview);
    accounts.push({ id, webview });
    accountCount++;

    renderTabs();
    if (accountCount === 1) {
      switchTab(1); // Auto-select if first account
    }

    if (id > 2) {
      showToast(`Account ${id} created`, 'success');
    }

  } catch (err) {
    showToast(`Failed to create account: ${err.message}`, 'error');
  }
}

function switchTab(id) {
  accounts.forEach((acc) => {
    if (acc.id === id) {
      acc.webview.classList.remove('hidden');
    } else {
      acc.webview.classList.add('hidden');
    }
  });
  activeAccountId = id;
  renderTabs();
}

function renderTabs() {
  accountTabsContainer.innerHTML = '';
  accounts.forEach((acc) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'account-tab-wrapper';

    const tab = document.createElement('button');
    tab.className = `account-tab${acc.id === activeAccountId ? ' active' : ''}`;
    tab.textContent = `A${acc.id}`;
    tab.title = `Account ${acc.id}`;
    tab.addEventListener('click', () => switchTab(acc.id));
    
    const rmBtn = document.createElement('button');
    rmBtn.className = 'remove-tab-btn';
    rmBtn.innerHTML = '×';
    rmBtn.title = 'Remove Account';
    rmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeAccount(acc.id);
    });

    wrapper.appendChild(tab);
    wrapper.appendChild(rmBtn);
    accountTabsContainer.appendChild(wrapper);
  });

  // Update target dropdown
  targetSelect.innerHTML = '';
  accounts.forEach((acc) => {
    if (acc.id === activeAccountId) return;
    const option = document.createElement('option');
    option.value = acc.id;
    option.textContent = `Account ${acc.id}`;
    targetSelect.appendChild(option);
  });

  accountCountDisplay.textContent = `${accountCount} / ${MAX_ACCOUNTS}`;
  addAccountBtn.disabled = accountCount >= MAX_ACCOUNTS;
}

function removeAccount(id) {
  const index = accounts.findIndex(a => a.id === id);
  if (index === -1) return;
  
  const acc = accounts[index];
  
  // Remove webview from DOM
  webviewContainer.removeChild(acc.webview);
  
  // Remove from state
  accounts.splice(index, 1);
  accountCount--;
  
  showToast(`Account ${id} removed`, 'info');
  
  // If we removed the active tab, switch to the first available one
  if (activeAccountId === id) {
    if (accounts.length > 0) {
      switchTab(accounts[0].id);
    } else {
      activeAccountId = null;
      renderTabs();
    }
  } else {
    renderTabs();
  }
}

addAccountBtn.addEventListener('click', createAccount);

// ─── Export MD Flow ──────────────────────────────────────────────────────────

const exportMdBtn = document.getElementById('export-md-btn');
exportMdBtn.addEventListener('click', async () => {
  const prompt = `I am transferring this session to a new tab. Please generate a highly comprehensive, token-efficient Markdown document summarizing our entire conversation. Include all established rules, current state, and the immediate next steps so another AI can flawlessly resume our work.

At the very end of the markdown file, please include this exact phrase:
"Please read this summary and continue our work from here."`;

  const activeAcc = accounts.find(a => a.id === activeAccountId);
  if (!activeAcc) return;

  try {
    const escapedPrompt = prompt.replace(/\n/g, '\\n').replace(/"/g, '\\"').replace(/'/g, "\\'");
    
    // Attempt to autofill using document.execCommand to bypass React/ProseMirror state issues
    const fillScript = `
      (function() {
        const editor = document.querySelector('.ProseMirror');
        if (editor) {
          editor.focus();
          // Select all existing text and replace it, or just insert
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, '${escapedPrompt}');
          return true;
        }
        return false;
      })()
    `;
    
    const success = await activeAcc.webview.executeJavaScript(fillScript);
    
    if (success) {
      showToast('Prompt autofilled! Just hit Send.', 'success');
    } else {
      // Fallback to clipboard if editor isn't found
      await navigator.clipboard.writeText(prompt);
      showToast('Autofill failed. Prompt copied! Press Cmd+V to paste.', 'warning');
    }
  } catch (err) {
    await navigator.clipboard.writeText(prompt);
    showToast('Prompt copied! Press Cmd+V in chat to paste.', 'success');
  }
});

// ─── Extend Convo Flow ───────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

extendBtn.addEventListener('click', async () => {
  const targetId = parseInt(targetSelect.value, 10);
  if (!targetId || targetId === activeAccountId) {
    showToast('Select a different target account', 'warning');
    return;
  }

  const sourceAcc = accounts.find(a => a.id === activeAccountId);
  const targetAcc = accounts.find(a => a.id === targetId);
  if (!sourceAcc || !targetAcc) return;

  extendBtn.disabled = true;

  try {
    // 1. Scrape
    setStatus('working', 'Scraping...');
    const scrapeScript = await window.electronAPI.getScraperScript();
    
    // Execute script via webview method
    const scrapeResult = await sourceAcc.webview.executeJavaScript(
      `(function() { ${scrapeScript} })()`
    );

    if (!scrapeResult || scrapeResult.length === 0) {
      setStatus('error', 'No messages found');
      showToast('No messages found. Is a conversation open?', 'warning');
      return;
    }
    showToast(`Scraped ${scrapeResult.length} messages`, 'info');

    // 2. Format
    setStatus('working', 'Formatting...');
    const payload = formatPayloadLocally(scrapeResult);

    // 3. Switch & Auto-Paste
    setStatus('working', `Pasting to A${targetId}...`);
    switchTab(targetId);
    
    // Human delay
    await sleep(Math.floor(Math.random() * 500) + 400);

    const pasterScript = await window.electronAPI.getPasterScript();
    const escapedPayload = JSON.stringify(payload);
    
    await targetAcc.webview.executeJavaScript(`
      (function() {
        const __payload = ${escapedPayload};
        ${pasterScript}
      })()
    `);

    setStatus('ready', 'Ready');
    showToast(`Conversation extended to Account ${targetId}!`, 'success');

  } catch (err) {
    setStatus('error', 'Error');
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    extendBtn.disabled = false;
  }
});

// Local payload formatter
function formatPayloadLocally(messages) {
  let historyToKeep = messages;
    
  // Token Saver: If the conversation is huge, keep only the original prompt and the last 10 turns
  if (messages.length > 12) {
    const firstMessage = messages[0];
    const recentMessages = messages.slice(-10);
    historyToKeep = [firstMessage, { role: 'assistant', content: '... [Older conversation history truncated for token efficiency] ...' }, ...recentMessages];
  }

  const conversationLines = historyToKeep.map(msg => {
    const label = msg.role === 'user' ? '**Human**' : '**Assistant**';
    return `${label}:\n${msg.content}`;
  });

  const lastMessage = messages[messages.length - 1];
  const actionInstruction = lastMessage.role === 'user' 
    ? "The last message in the transcript was from me. Please provide your response to it now as if we were continuing seamlessly."
    : "The last message in the transcript was from you. Please simply reply with 'Context restored. Ready to continue!' and wait for my next instruction.";

  return [
    '# 🔄 Context Transferred from Previous Session',
    '',
    'Our previous conversation reached its length limit. I have copied the transcript of our discussion below.',
    'Please read it carefully to regain the full context, understand the technical details, and align with the ongoing goals of our project.',
    '',
    '---',
    '### Conversation Transcript',
    '',
    conversationLines.join('\n\n'),
    '',
    '---',
    '',
    '### Instructions for you',
    '1. Review the transcript above to fully absorb the current state of our work.',
    `2. ${actionInstruction}`
  ].join('\n');
}

// ─── Context Vault Flow ──────────────────────────────────────────────────────

const vaultToggleBtn = document.getElementById('vault-toggle-btn');
const vaultPanel = document.getElementById('vault-panel');
const vaultDropZone = document.getElementById('vault-drop-zone');
const vaultFileList = document.getElementById('vault-file-list');

// Toggle Vault Panel
vaultToggleBtn.addEventListener('click', () => {
  vaultPanel.classList.toggle('hidden');
  if (!vaultPanel.classList.contains('hidden')) {
    refreshVault();
  }
});

// Render Vault Files
async function refreshVault() {
  const files = await window.electronAPI.listVaultFiles();
  vaultFileList.innerHTML = '';
  
  if (files.length === 0) {
    vaultFileList.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 20px;">Vault is empty.</div>';
    return;
  }

  files.forEach(file => {
    const item = document.createElement('div');
    item.className = 'vault-file-item';
    item.draggable = true; // Enable HTML5 dragging
    
    // Prevent default drag and start Electron native drag!
    item.addEventListener('dragstart', (e) => {
      e.preventDefault();
      window.electronAPI.startVaultDrag(file.name);
    });

    const nameSpan = document.createElement('span');
    nameSpan.className = 'vault-file-name';
    nameSpan.textContent = file.name;
    nameSpan.title = file.name;

    const delBtn = document.createElement('button');
    delBtn.className = 'vault-file-delete';
    delBtn.innerHTML = '🗑️';
    delBtn.title = 'Delete File';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.electronAPI.deleteVaultFile(file.name);
      refreshVault();
      showToast(`${file.name} deleted`, 'info');
    });

    item.appendChild(nameSpan);
    item.appendChild(delBtn);
    vaultFileList.appendChild(item);
  });
}

// Drag & Drop INTO Vault
vaultDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  vaultDropZone.classList.add('dragover');
});

vaultDropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  vaultDropZone.classList.remove('dragover');
});

vaultDropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  vaultDropZone.classList.remove('dragover');

  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    
    // Only accept .md or .txt files for now
    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      showToast('Only .md or .txt files are supported in the Vault.', 'warning');
      return;
    }

    try {
      const text = await file.text();
      const res = await window.electronAPI.saveVaultFile(file.name, text);
      if (res.success) {
        showToast(`${file.name} saved to Vault!`, 'success');
        refreshVault();
      } else {
        showToast(`Failed to save: ${res.error}`, 'error');
      }
    } catch (err) {
      showToast(`Error reading file: ${err.message}`, 'error');
    }
  }
});

// Auto-saved from downloads
window.electronAPI.onVaultAutoSaved((filename) => {
  showToast(`Auto-saved ${filename} to Vault!`, 'success');
  if (!vaultPanel.classList.contains('hidden')) {
    refreshVault();
  } else {
    // Optionally auto-open the vault or just flash the button
    const btn = document.getElementById('vault-toggle-btn');
    btn.style.boxShadow = '0 0 15px var(--accent)';
    setTimeout(() => btn.style.boxShadow = 'none', 1000);
  }
});


// ─── Initialize ──────────────────────────────────────────────────────────────

// Create first two accounts on launch
(async () => {
  await createAccount();
  await createAccount();
  setStatus('ready', 'Ready');
})();

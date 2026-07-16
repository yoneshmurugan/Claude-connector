// auto-paster.js — Auto-Paste Logic
// This file is read as a string and executed inside the target Claude.ai WebContentsView
// via webContents.executeJavaScript(). The variable `__payload` is injected
// by main.js before this script runs.
//
// It locates Claude's input box and simulates a realistic paste event.

// ─── Find the input element ────────────────────────────────────────────────
function findInputElement() {
  // Tier 1: contenteditable div (Claude's primary input)
  const contentEditable = document.querySelector(
    'div[contenteditable="true"], [contenteditable="true"]'
  );
  if (contentEditable) return contentEditable;

  // Tier 2: ProseMirror editor (used by some Claude versions)
  const proseMirror = document.querySelector('.ProseMirror, [class*="prosemirror"]');
  if (proseMirror) return proseMirror;

  // Tier 3: textarea fallback
  const textarea = document.querySelector('textarea');
  if (textarea) return textarea;

  // Tier 4: Any input in the footer area
  const footer = document.querySelector('footer, [class*="footer"], [class*="input-area"]');
  if (footer) {
    const input = footer.querySelector('input, textarea, [contenteditable]');
    if (input) return input;
  }

  return null;
}

// ─── Simulate realistic text input ─────────────────────────────────────────
function pasteIntoElement(element, text) {
  // Focus the element
  element.focus();

  // Small delay to let focus settle
  return new Promise((resolve) => {
    setTimeout(() => {
      if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        // For standard input elements
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // For contenteditable divs (Claude's input)
        // Clear existing content
        element.innerHTML = '';

        // Create a DataTransfer to simulate paste
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', text);

        // Dispatch paste event — this is what Claude's React app listens for
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer,
        });

        element.dispatchEvent(pasteEvent);

        // If paste event was prevented (React handled it), we're done.
        // If not, fall back to setting innerText directly.
        if (element.innerText.trim().length === 0) {
          // Fallback: insert text via execCommand (deprecated but works in Electron's Chromium)
          document.execCommand('insertText', false, text);
        }

        // If still empty, last resort: set innerText and fire input
        if (element.innerText.trim().length === 0) {
          element.innerText = text;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      resolve({ success: true });
    }, 100);
  });
}

// ─── Execute ───────────────────────────────────────────────────────────────
const inputEl = findInputElement();

if (!inputEl) {
  return { success: false, error: 'Could not find Claude input field. Is a conversation open?' };
}

return pasteIntoElement(inputEl, __payload);

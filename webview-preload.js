// webview-preload.js — Guest Page Preload Script
// Injected into each Claude.ai WebContentsView session.
// Comprehensive anti-detection: makes Electron look like a real Chrome browser.

// ─── Anti-Detection: Remove navigator.webdriver ────────────────────────────
// Chromium sets this to `true` for automated/embedded contexts.
// This is the #1 check bot detection runs.
try {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined, // Real Chrome returns undefined, not false
    configurable: true,
  });
} catch (e) {
  // Silently fail
}

// ─── Anti-Detection: Patch chrome.runtime ──────────────────────────────────
// Real Chrome always has chrome.runtime with an id. Its absence is a fingerprint.
try {
  if (!window.chrome) {
    window.chrome = {};
  }
  if (!window.chrome.runtime) {
    window.chrome.runtime = {
      connect: function () {},
      sendMessage: function () {},
    };
  }
} catch (e) {
  // Silently fail
}

// ─── Anti-Detection: Patch navigator.plugins ───────────────────────────────
// Electron has an empty plugins array. Real Chrome has at least 5 default plugins.
// An empty array is a massive fingerprint.
try {
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      // Simulate real Chrome plugins
      const fakePlugins = [
        { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 },
        { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: '', length: 1 },
        { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: '', length: 1 },
        { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: '', length: 1 },
        { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: '', length: 1 },
      ];
      // Make it look like a PluginArray
      fakePlugins.item = (i) => fakePlugins[i] || null;
      fakePlugins.namedItem = (name) => fakePlugins.find(p => p.name === name) || null;
      fakePlugins.refresh = () => {};
      return fakePlugins;
    },
    configurable: true,
  });
} catch (e) {
  // Silently fail
}

// ─── Anti-Detection: Patch navigator.languages ─────────────────────────────
// Ensure languages are set (sometimes missing in Electron)
try {
  Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en'],
    configurable: true,
  });
} catch (e) {
  // Silently fail
}

// ─── Anti-Detection: Patch Permissions API ─────────────────────────────────
// Make the Permissions API behave like a real browser
try {
  const originalQuery = window.navigator.permissions?.query;
  if (originalQuery) {
    window.navigator.permissions.query = (parameters) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: Notification.permission });
      }
      return originalQuery.call(window.navigator.permissions, parameters);
    };
  }
} catch (e) {
  // Silently fail
}

// ─── Anti-Detection: Patch WebGL Renderer ──────────────────────────────────
// Some detection scripts check for specific WebGL renderer strings.
// We leave the real GPU info intact (patching it incorrectly is WORSE than not patching).

// ─── Anti-Detection: Prevent detection of DevTools ─────────────────────────
// Some scripts detect if DevTools is open as a signal of automation
try {
  Object.defineProperty(window, 'outerWidth', {
    get: () => window.innerWidth,
    configurable: true,
  });
  Object.defineProperty(window, 'outerHeight', {
    get: () => window.innerHeight + 85, // Account for toolbar
    configurable: true,
  });
} catch (e) {
  // Silently fail
}

// ─── Anti-Detection: Block automation detection scripts ────────────────────
// Intercept common automation detection patterns
try {
  // Prevent detection of the "Electron" string in the process object
  if (typeof process !== 'undefined') {
    // In a properly isolated context, process shouldn't be available,
    // but just in case:
    Object.defineProperty(window, 'process', {
      get: () => undefined,
      configurable: true,
    });
  }
} catch (e) {
  // Silently fail
}

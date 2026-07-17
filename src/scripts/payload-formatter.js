// payload-formatter.js — Markdown Payload Template Engine
// Takes an array of { role, content } messages and formats them
// into a clean markdown payload for continuing a conversation.

/**
 * Formats scraped messages into a markdown conversation payload.
 * @param {Array<{role: string, content: string}>} messages
 * @param {number} maxExchanges - Maximum number of exchanges to include (0 = all)
 * @returns {string} Formatted markdown payload
 */
function formatPayload(messages, maxExchanges = 0) {
  if (!messages || messages.length === 0) {
    return '';
  }

  // Trim to last N exchanges if maxExchanges is set
  let trimmedMessages = messages;
  if (maxExchanges > 0) {
    const maxItems = maxExchanges * 2; // Each exchange = 1 user + 1 assistant
    if (messages.length > maxItems) {
      trimmedMessages = messages.slice(-maxItems);
    }
  }

  // Build the conversation history section
  const conversationLines = trimmedMessages.map(msg => {
    const label = msg.role === 'user' ? '**Human**' : '**Assistant**';
    return `${label}:\n${msg.content}`;
  });

  const payload = [
    '## Continuing Conversation',
    '',
    'The following is a conversation history from a previous session. Please continue naturally from where we left off.',
    '',
    '---',
    '',
    '### Conversation History',
    '',
    conversationLines.join('\n\n'),
    '',
    '---',
    '',
    'Please continue this conversation. Respond to the last message above.',
  ].join('\n');

  return payload;
}

module.exports = { formatPayload };

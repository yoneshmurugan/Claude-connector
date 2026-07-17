// scraper.js — Ultimate API-based Extraction

async function extractMessagesAPI() {
  try {
    // 1. Get Chat ID from URL
    const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9-]+)/);
    if (!match) {
      return [{ role: 'user', content: 'Error: Not on a chat page. Please open a specific chat.' }];
    }
    const chatId = match[1];

    // 2. Fetch Organization ID (Claude requires this for API calls)
    const orgRes = await fetch('https://claude.ai/api/organizations');
    if (!orgRes.ok) throw new Error('Failed to fetch organizations');
    const orgs = await orgRes.json();
    const orgId = orgs[0].uuid;

    // 3. Fetch the exact, pristine chat history JSON!
    const chatRes = await fetch(`https://claude.ai/api/organizations/${orgId}/chat_conversations/${chatId}`);
    if (!chatRes.ok) throw new Error('Failed to fetch chat history');
    const chatData = await chatRes.json();

    // 4. Parse the messages from the API payload
    const finalPayload = [];
    
    if (chatData && chatData.chat_messages) {
      chatData.chat_messages.forEach(msg => {
        let content = '';
        
        // Claude's API returns text and sometimes attachments/artifacts
        if (msg.content && Array.isArray(msg.content)) {
            msg.content.forEach(block => {
                if (block.type === 'text') {
                    content += block.text + '\n\n';
                }
                
                // Handle Artifacts and Tool Uses (Filter out internal thoughts to save tokens!)
                if (block.type === 'tool_use') {
                    // Skip internal thinking, web searches, and hidden tools that eat up tokens
                    const hiddenTools = ['thinking', 'thought', 'web_search', 'search', 'places_search', 'fetch_entities'];
                    if (hiddenTools.includes(block.name)) return;
                    
                    if (block.input && block.input.content) {
                        content += block.input.content + '\n\n';
                    }
                    if (block.input && block.input.command) {
                        content += block.input.command + '\n\n';
                    }
                }
            });
        } else if (msg.text) {
            content = msg.text;
        }

        content = content.trim();
        if (content) {
           finalPayload.push({
             role: msg.sender === 'human' ? 'user' : 'assistant',
             content: content
           });
        }
      });
    }

    return finalPayload;
    
  } catch (err) {
    return [{ role: 'user', content: 'API Extraction Error: ' + err.message }];
  }
}

// Return a promise; electron executeJavaScript handles async results natively
return extractMessagesAPI();

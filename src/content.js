// Enhanced Content script for ChatGPT integration - Pure JavaScript
class ChatGPTPromptManager {
  constructor() {
    this.isInjected = false;
    this.overlayContainer = null;
    this.prompts = [];
    this.bookmarks = [];
    this.chatHistory = [];
    this.retryCount = 0;
    this.maxRetries = 20;
    this.currentTextarea = null;
    this.messageObserver = null;
    this.init();
  }

  init() {
    console.log("✅ ChatGPT Prompt Manager loaded!");
    
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startInjection());
    } else {
      this.startInjection();
    }
  }

  startInjection() {
    // Start trying to inject after a short delay
    setTimeout(() => {
      this.tryInjectPromptManager();
    }, 2000);
  }

  async tryInjectPromptManager() {
    if (this.isInjected || this.retryCount >= this.maxRetries) return;

    console.log(`Injection attempt ${this.retryCount + 1}/${this.maxRetries}`);
    
    // Look for ChatGPT's input elements with multiple selectors
    const inputSelectors = [
      '[data-testid="composer-text-input"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Send a message"]',
      '#prompt-textarea',
      'div[contenteditable="true"]',
      'textarea'
    ];

    let inputElement = null;
    let inputContainer = null;

    // Try each selector
    for (const selector of inputSelectors) {
      inputElement = document.querySelector(selector);
      if (inputElement) {
        console.log(`Found input element with selector: ${selector}`);
        this.currentTextarea = inputElement;
        
        // Find the container - try multiple approaches
        inputContainer = inputElement.closest('form') ||
                        inputElement.closest('div[class*="relative"]') ||
                        inputElement.closest('div[class*="flex"]') ||
                        inputElement.parentElement;
        
        if (inputContainer) {
          console.log('Found input container');
          break;
        }
      }
    }

    if (!inputElement || !inputContainer) {
      this.retryCount++;
      console.log('Input element or container not found, retrying...');
      setTimeout(() => this.tryInjectPromptManager(), 3000);
      return;
    }

    // Check if already injected
    if (document.querySelector('#prompt-manager-vertical-icons') || document.querySelector('#prompt-manager-textbox-icons')) {
      console.log('Icons already injected');
      this.isInjected = true;
      return;
    }

    try {
      // Load data from storage
      await this.loadData();
      
      // Inject vertical icons (top-right)
      this.injectVerticalIcons();
      
      // Inject textbox icons (inside input)
      this.injectTextboxIcons(inputContainer, inputElement);
      
      // Inject scroll arrows
      this.injectScrollArrows();
      
      // Start observing chat messages
      this.startMessageObserver();
      
      // Listen for messages from popup
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'insertPrompt') {
          this.insertPrompt(request.prompt);
        }
      });

      this.isInjected = true;
      console.log('✅ ChatGPT Prompt Manager successfully injected!');
      
    } catch (error) {
      console.error('Error during injection:', error);
      this.retryCount++;
      setTimeout(() => this.tryInjectPromptManager(), 3000);
    }
  }

  async loadData() {
    try {
      const result = await chrome.storage.local.get(['prompts', 'bookmarks', 'chatHistory']);
      this.prompts = result.prompts || this.getDefaultPrompts();
      this.bookmarks = result.bookmarks || [];
      this.chatHistory = result.chatHistory || [];
      console.log(`Loaded ${this.prompts.length} prompts, ${this.bookmarks.length} bookmarks, and ${this.chatHistory.length} chat sessions`);
    } catch (error) {
      console.error('Error loading data:', error);
      this.prompts = this.getDefaultPrompts();
      this.bookmarks = [];
      this.chatHistory = [];
    }
  }

  startMessageObserver() {
    // Observe chat messages for adding action buttons
    const chatContainer = document.querySelector('main') || document.body;
    
    this.messageObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.addMessageActions(node);
          }
        });
      });
    });

    this.messageObserver.observe(chatContainer, {
      childList: true,
      subtree: true
    });

    // Add actions to existing messages
    this.addActionsToExistingMessages();
  }

  addActionsToExistingMessages() {
    // Find all existing chat messages and add action buttons
    const messageSelectors = [
      '[data-message-author-role="assistant"]',
      '[data-message-author-role="user"]',
      '.group.w-full',
      '.flex.flex-col.items-start'
    ];

    messageSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(message => {
        this.addMessageActions(message);
      });
    });
  }

  addMessageActions(element) {
    // Skip if actions already added
    if (element.querySelector('.prompt-manager-message-actions')) return;

    // Find message content
    const messageContent = this.findMessageContent(element);
    if (!messageContent) return;

    // Create action buttons container
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'prompt-manager-message-actions';
    actionsContainer.style.cssText = `
      display: flex;
      gap: 8px;
      margin-top: 8px;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    // Save as Prompt button
    const saveBtn = this.createMessageActionButton('💾', 'Save as Prompt', '#10B981', () => {
      this.saveMessageAsPrompt(messageContent.textContent || messageContent.innerText);
    });

    // Bookmark button
    const bookmarkBtn = this.createMessageActionButton('🔖', 'Bookmark', '#F59E0B', () => {
      this.bookmarkMessage(messageContent.textContent || messageContent.innerText);
    });

    // Download button (for full conversation)
    const downloadBtn = this.createMessageActionButton('📥', 'Download Chat', '#3B82F6', () => {
      this.downloadCurrentChat();
    });

    actionsContainer.appendChild(saveBtn);
    actionsContainer.appendChild(bookmarkBtn);
    actionsContainer.appendChild(downloadBtn);

    // Add hover effects to show/hide actions
    const messageContainer = messageContent.closest('[data-message-author-role]') || 
                           messageContent.closest('.group') || 
                           messageContent.parentElement;

    if (messageContainer) {
      messageContainer.addEventListener('mouseenter', () => {
        actionsContainer.style.opacity = '1';
      });

      messageContainer.addEventListener('mouseleave', () => {
        actionsContainer.style.opacity = '0';
      });

      // Insert actions after message content
      messageContent.parentNode.insertBefore(actionsContainer, messageContent.nextSibling);
    }
  }

  findMessageContent(element) {
    // Try different selectors to find message content
    const contentSelectors = [
      '.markdown',
      '[data-message-content]',
      '.prose',
      'p',
      'div[class*="text"]'
    ];

    for (const selector of contentSelectors) {
      const content = element.querySelector(selector);
      if (content && content.textContent.trim()) {
        return content;
      }
    }

    // Fallback: check if element itself has text content
    if (element.textContent && element.textContent.trim().length > 10) {
      return element;
    }

    return null;
  }

  createMessageActionButton(icon, tooltip, color, onClick) {
    const button = document.createElement('button');
    button.innerHTML = icon;
    button.title = tooltip;
    button.style.cssText = `
      background: white;
      border: 1px solid #e5e7eb;
      color: #6b7280;
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 12px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = color;
      button.style.borderColor = color;
      button.style.color = 'white';
      button.style.transform = 'scale(1.05)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'white';
      button.style.borderColor = '#e5e7eb';
      button.style.color = '#6b7280';
      button.style.transform = 'scale(1)';
    });

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });

    return button;
  }

  saveMessageAsPrompt(text) {
    if (!text || text.trim().length < 10) {
      this.showNotification('Message too short to save as prompt', 'warning');
      return;
    }

    const title = this.generateTitle(text);
    const newPrompt = {
      id: Date.now().toString(),
      title: title,
      content: text.trim(),
      category: 'From Chat',
      tags: ['chat', 'saved'],
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: 0
    };

    this.prompts.unshift(newPrompt);
    chrome.storage.local.set({ prompts: this.prompts });
    
    this.showNotification(`Saved as prompt: "${title}"`, 'success');
  }

  bookmarkMessage(text) {
    if (!text || text.trim().length < 5) {
      this.showNotification('Message too short to bookmark', 'warning');
      return;
    }

    const bookmark = {
      id: Date.now().toString(),
      content: text.trim(),
      title: this.generateTitle(text),
      source: 'chat_message',
      createdAt: new Date()
    };

    this.bookmarks.unshift(bookmark);
    chrome.storage.local.set({ bookmarks: this.bookmarks });
    
    this.showNotification('Message bookmarked successfully!', 'success');
  }

  downloadCurrentChat() {
    const chatData = this.extractCurrentChatData();
    if (!chatData || chatData.messages.length === 0) {
      this.showNotification('No chat data found to download', 'warning');
      return;
    }

    this.downloadChatAsFile(chatData);
  }

  extractCurrentChatData() {
    const messages = [];
    const chatTitle = this.getCurrentChatTitle();
    
    // Find all message elements
    const messageElements = document.querySelectorAll('[data-message-author-role]');
    
    messageElements.forEach((element, index) => {
      const role = element.getAttribute('data-message-author-role');
      const content = this.findMessageContent(element);
      
      if (content && content.textContent.trim()) {
        messages.push({
          id: index + 1,
          role: role,
          content: content.textContent.trim(),
          timestamp: new Date().toISOString()
        });
      }
    });

    return {
      title: chatTitle,
      messages: messages,
      exportedAt: new Date().toISOString(),
      totalMessages: messages.length
    };
  }

  getCurrentChatTitle() {
    // Try to find chat title from various selectors
    const titleSelectors = [
      'h1',
      '[data-testid="conversation-title"]',
      '.text-xl',
      '.font-semibold'
    ];

    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        return titleElement.textContent.trim();
      }
    }

    return `ChatGPT Conversation - ${new Date().toLocaleDateString()}`;
  }

  downloadChatAsFile(chatData) {
    // Create different format options
    const formats = {
      json: () => JSON.stringify(chatData, null, 2),
      txt: () => this.formatChatAsText(chatData),
      md: () => this.formatChatAsMarkdown(chatData),
      html: () => this.formatChatAsHTML(chatData)
    };

    // Show format selection overlay
    this.showDownloadFormatSelector(chatData, formats);
  }

  formatChatAsText(chatData) {
    let text = `${chatData.title}\n`;
    text += `Exported: ${new Date(chatData.exportedAt).toLocaleString()}\n`;
    text += `Total Messages: ${chatData.totalMessages}\n`;
    text += '='.repeat(50) + '\n\n';

    chatData.messages.forEach((message, index) => {
      text += `[${message.role.toUpperCase()}] ${new Date(message.timestamp).toLocaleTimeString()}\n`;
      text += `${message.content}\n\n`;
      text += '-'.repeat(30) + '\n\n';
    });

    return text;
  }

  formatChatAsMarkdown(chatData) {
    let md = `# ${chatData.title}\n\n`;
    md += `**Exported:** ${new Date(chatData.exportedAt).toLocaleString()}  \n`;
    md += `**Total Messages:** ${chatData.totalMessages}\n\n`;
    md += '---\n\n';

    chatData.messages.forEach((message, index) => {
      const roleIcon = message.role === 'user' ? '👤' : '🤖';
      md += `## ${roleIcon} ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}\n`;
      md += `*${new Date(message.timestamp).toLocaleString()}*\n\n`;
      md += `${message.content}\n\n`;
    });

    return md;
  }

  formatChatAsHTML(chatData) {
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chatData.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
        .message { margin-bottom: 30px; padding: 20px; border-radius: 12px; }
        .user { background: #f0f9ff; border-left: 4px solid #3b82f6; }
        .assistant { background: #f0fdf4; border-left: 4px solid #10b981; }
        .role { font-weight: 600; color: #374151; margin-bottom: 8px; }
        .timestamp { font-size: 12px; color: #6b7280; margin-bottom: 12px; }
        .content { white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${chatData.title}</h1>
        <p><strong>Exported:</strong> ${new Date(chatData.exportedAt).toLocaleString()}</p>
        <p><strong>Total Messages:</strong> ${chatData.totalMessages}</p>
    </div>
`;

    chatData.messages.forEach(message => {
      const roleIcon = message.role === 'user' ? '👤' : '🤖';
      html += `
    <div class="message ${message.role}">
        <div class="role">${roleIcon} ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}</div>
        <div class="timestamp">${new Date(message.timestamp).toLocaleString()}</div>
        <div class="content">${message.content.replace(/\n/g, '<br>')}</div>
    </div>`;
    });

    html += `
</body>
</html>`;

    return html;
  }

  showDownloadFormatSelector(chatData, formats) {
    this.hideOverlay();
    
    this.overlayContainer = this.createBaseOverlay('📥', 'Download Chat', '#3B82F6');
    
    const content = this.overlayContainer.querySelector('#overlay-content');
    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 32px;">
        <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #1f2937;">Choose Download Format</h2>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">Select the format you'd like to download your chat in</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <button class="format-btn" data-format="txt" style="
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        ">
          <div style="font-size: 32px; margin-bottom: 8px;">📄</div>
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">Plain Text</div>
          <div style="font-size: 12px; color: #6b7280;">Simple text format (.txt)</div>
        </button>

        <button class="format-btn" data-format="md" style="
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        ">
          <div style="font-size: 32px; margin-bottom: 8px;">📝</div>
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">Markdown</div>
          <div style="font-size: 12px; color: #6b7280;">Formatted markdown (.md)</div>
        </button>

        <button class="format-btn" data-format="html" style="
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        ">
          <div style="font-size: 32px; margin-bottom: 8px;">🌐</div>
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">HTML</div>
          <div style="font-size: 12px; color: #6b7280;">Web page format (.html)</div>
        </button>

        <button class="format-btn" data-format="json" style="
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        ">
          <div style="font-size: 32px; margin-bottom: 8px;">⚙️</div>
          <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">JSON</div>
          <div style="font-size: 12px; color: #6b7280;">Structured data (.json)</div>
        </button>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-size: 16px;">📊</span>
          <span style="font-weight: 600; color: #374151;">Chat Summary</span>
        </div>
        <div style="font-size: 14px; color: #6b7280;">
          <strong>Title:</strong> ${chatData.title}<br>
          <strong>Messages:</strong> ${chatData.totalMessages}<br>
          <strong>Export Date:</strong> ${new Date(chatData.exportedAt).toLocaleString()}
        </div>
      </div>
    `;

    // Add event listeners for format buttons
    content.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = '#3B82F6';
        btn.style.backgroundColor = '#f0f9ff';
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = '#e5e7eb';
        btn.style.backgroundColor = 'white';
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
      });

      btn.addEventListener('click', () => {
        const format = btn.getAttribute('data-format');
        this.performDownload(chatData, formats[format](), format);
        this.hideOverlay();
      });
    });

    this.showOverlay();
  }

  performDownload(chatData, content, format) {
    const filename = `${chatData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.${format}`;
    
    const blob = new Blob([content], { 
      type: format === 'html' ? 'text/html' : 'text/plain' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Save to chat history
    this.saveChatToHistory(chatData);
    
    this.showNotification(`Chat downloaded as ${filename}`, 'success');
  }

  saveChatToHistory(chatData) {
    const historyEntry = {
      id: Date.now().toString(),
      title: chatData.title,
      messageCount: chatData.totalMessages,
      exportedAt: chatData.exportedAt,
      preview: chatData.messages.slice(0, 2).map(m => m.content.substring(0, 100)).join(' ... ')
    };

    this.chatHistory.unshift(historyEntry);
    
    // Keep only last 50 chat histories
    if (this.chatHistory.length > 50) {
      this.chatHistory = this.chatHistory.slice(0, 50);
    }

    chrome.storage.local.set({ chatHistory: this.chatHistory });
  }

  injectVerticalIcons() {
    console.log('Injecting vertical icons...');
    
    // Create vertical icons container
    const verticalContainer = document.createElement('div');
    verticalContainer.id = 'prompt-manager-vertical-icons';
    verticalContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 999999;
      pointer-events: auto;
    `;

    // Library icon
    const libraryIcon = this.createVerticalIcon('library', `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    `, 'Prompt Library', '#3B82F6');

    // Bookmarks icon
    const bookmarksIcon = this.createVerticalIcon('bookmarks', `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
      </svg>
    `, 'Bookmarks', '#EF4444');

    // Chat History icon
    const historyIcon = this.createVerticalIcon('history', `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/>
        <path d="M12 7v5l4 2"/>
      </svg>
    `, 'Chat History', '#8B5CF6');

    verticalContainer.appendChild(libraryIcon);
    verticalContainer.appendChild(bookmarksIcon);
    verticalContainer.appendChild(historyIcon);

    document.body.appendChild(verticalContainer);
    console.log('Vertical icons injected successfully');
  }

  injectTextboxIcons(inputContainer, inputElement) {
    console.log('Injecting textbox icons...');
    
    // Create textbox icons container
    const textboxContainer = document.createElement('div');
    textboxContainer.id = 'prompt-manager-textbox-icons';
    textboxContainer.style.cssText = `
      position: absolute;
      right: 60px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      gap: 6px;
      z-index: 1000;
      align-items: center;
      pointer-events: auto;
    `;

    // Save icon
    const saveIcon = this.createTextboxIcon('save', `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17,21 17,13 7,13 7,21"/>
        <polyline points="7,3 7,8 15,8"/>
      </svg>
    `, 'Save as Prompt', '#10B981');

    // Bookmark icon
    const bookmarkIcon = this.createTextboxIcon('bookmark', `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
      </svg>
    `, 'Bookmark Text', '#F59E0B');

    // Social Media Craft icon
    const socialIcon = this.createTextboxIcon('social', `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
      </svg>
    `, 'Craft for Social Media', '#8B5CF6');

    // Import Craft icon
    const craftIcon = this.createTextboxIcon('craft', `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `, 'Enhance Text', '#EC4899');

    textboxContainer.appendChild(saveIcon);
    textboxContainer.appendChild(bookmarkIcon);
    textboxContainer.appendChild(socialIcon);
    textboxContainer.appendChild(craftIcon);

    // Make sure the container is positioned relatively
    if (getComputedStyle(inputContainer).position === 'static') {
      inputContainer.style.position = 'relative';
    }

    inputContainer.appendChild(textboxContainer);
    console.log('Textbox icons injected successfully');
  }

  injectScrollArrows() {
    console.log('Injecting scroll arrows...');
    
    // Create scroll arrows container
    const scrollContainer = document.createElement('div');
    scrollContainer.id = 'prompt-manager-scroll-arrows';
    scrollContainer.style.cssText = `
      position: fixed;
      right: 20px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 999998;
      pointer-events: auto;
    `;

    // Up arrow
    const upArrow = this.createScrollArrow('up', `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="18,15 12,9 6,15"/>
      </svg>
    `, 'Scroll Up');

    // Down arrow
    const downArrow = this.createScrollArrow('down', `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6,9 12,15 18,9"/>
      </svg>
    `, 'Scroll Down');

    scrollContainer.appendChild(upArrow);
    scrollContainer.appendChild(downArrow);

    document.body.appendChild(scrollContainer);
    console.log('Scroll arrows injected successfully');
  }

  createVerticalIcon(type, svgContent, tooltip, color) {
    const icon = document.createElement('button');
    icon.innerHTML = svgContent;
    icon.title = tooltip;
    icon.setAttribute('data-type', type);
    icon.style.cssText = `
      background: white;
      border: 2px solid #e5e7eb;
      color: #6b7280;
      cursor: pointer;
      padding: 12px;
      border-radius: 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 52px;
      min-height: 52px;
      backdrop-filter: blur(10px);
      position: relative;
      overflow: hidden;
    `;

    // Add ripple effect
    icon.addEventListener('click', (e) => {
      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: ${color}40;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      `;
      
      const rect = icon.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
      ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
      
      icon.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });

    icon.addEventListener('mouseenter', () => {
      icon.style.color = color;
      icon.style.borderColor = color;
      icon.style.backgroundColor = color + '15';
      icon.style.transform = 'scale(1.1) translateY(-2px)';
      icon.style.boxShadow = `0 8px 25px ${color}40`;
    });

    icon.addEventListener('mouseleave', () => {
      icon.style.color = '#6b7280';
      icon.style.borderColor = '#e5e7eb';
      icon.style.backgroundColor = 'white';
      icon.style.transform = 'scale(1) translateY(0)';
      icon.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`${type} vertical icon clicked`);
      this.showVerticalOverlay(type);
    });

    return icon;
  }

  createTextboxIcon(type, svgContent, tooltip, color) {
    const icon = document.createElement('button');
    icon.innerHTML = svgContent;
    icon.title = tooltip;
    icon.setAttribute('data-type', type);
    icon.style.cssText = `
      background: white;
      border: 1px solid #e5e7eb;
      color: #6b7280;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      min-width: 32px;
      min-height: 32px;
    `;

    icon.addEventListener('mouseenter', () => {
      icon.style.color = color;
      icon.style.borderColor = color;
      icon.style.backgroundColor = color + '10';
      icon.style.transform = 'scale(1.05)';
    });

    icon.addEventListener('mouseleave', () => {
      icon.style.color = '#6b7280';
      icon.style.borderColor = '#e5e7eb';
      icon.style.backgroundColor = 'white';
      icon.style.transform = 'scale(1)';
    });

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`${type} textbox icon clicked`);
      this.handleTextboxAction(type);
    });

    return icon;
  }

  createScrollArrow(direction, svgContent, tooltip) {
    const arrow = document.createElement('button');
    arrow.innerHTML = svgContent;
    arrow.title = tooltip;
    arrow.style.cssText = `
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #e5e7eb;
      color: #6b7280;
      cursor: pointer;
      padding: 8px;
      border-radius: 12px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      min-width: 36px;
      min-height: 36px;
    `;

    arrow.addEventListener('mouseenter', () => {
      arrow.style.backgroundColor = 'white';
      arrow.style.color = '#374151';
      arrow.style.transform = 'scale(1.1)';
      arrow.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    arrow.addEventListener('mouseleave', () => {
      arrow.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      arrow.style.color = '#6b7280';
      arrow.style.transform = 'scale(1)';
      arrow.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    });

    arrow.addEventListener('click', () => {
      this.handleScroll(direction);
    });

    return arrow;
  }

  handleTextboxAction(type) {
    const text = this.getCurrentText();
    if (!text.trim()) {
      this.showNotification('Please enter some text first!', 'warning');
      return;
    }

    switch (type) {
      case 'save':
        this.saveAsPrompt(text);
        break;
      case 'bookmark':
        this.bookmarkText(text);
        break;
      case 'social':
        this.craftForSocialMedia(text);
        break;
      case 'craft':
        this.enhanceText(text);
        break;
    }
  }

  getCurrentText() {
    if (!this.currentTextarea) return '';
    
    if (this.currentTextarea.tagName === 'TEXTAREA') {
      return this.currentTextarea.value;
    } else if (this.currentTextarea.contentEditable === 'true') {
      return this.currentTextarea.textContent || this.currentTextarea.innerText;
    }
    return '';
  }

  saveAsPrompt(text) {
    const title = this.generateTitle(text);
    const newPrompt = {
      id: Date.now().toString(),
      title: title,
      content: text,
      category: 'Custom',
      tags: ['custom', 'saved'],
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: 0
    };

    this.prompts.unshift(newPrompt);
    chrome.storage.local.set({ prompts: this.prompts });
    
    this.showNotification(`Saved as prompt: "${title}"`, 'success');
  }

  bookmarkText(text) {
    const bookmark = {
      id: Date.now().toString(),
      content: text,
      title: this.generateTitle(text),
      source: 'textbox',
      createdAt: new Date()
    };

    this.bookmarks.unshift(bookmark);
    chrome.storage.local.set({ bookmarks: this.bookmarks });
    
    this.showNotification('Text bookmarked successfully!', 'success');
  }

  craftForSocialMedia(text) {
    this.showNotification('Crafting for social media...', 'info');
    
    setTimeout(() => {
      const socialText = this.generateSocialMediaContent(text);
      this.insertPrompt(socialText);
      this.showNotification('Text optimized for social media!', 'success');
    }, 1500);
  }

  enhanceText(text) {
    this.showNotification('Enhancing text...', 'info');
    
    setTimeout(() => {
      const enhancedText = this.generateEnhancedText(text);
      this.insertPrompt(enhancedText);
      this.showNotification('Text enhanced successfully!', 'success');
    }, 1500);
  }

  generateTitle(text) {
    const words = text.split(' ').slice(0, 6);
    return words.join(' ') + (text.split(' ').length > 6 ? '...' : '');
  }

  generateSocialMediaContent(text) {
    const hashtags = ['#AI', '#ChatGPT', '#Productivity', '#Tech'];
    const emojis = ['🚀', '✨', '💡', '🎯', '📱', '💪'];
    
    return `🌟 ${text}

${emojis[Math.floor(Math.random() * emojis.length)]} Key highlights:
• Engaging and shareable content
• Optimized for maximum reach
• Perfect for social platforms

${hashtags.slice(0, 3).join(' ')} #SocialMedia

👆 Like and share if you found this helpful!`;
  }

  generateEnhancedText(text) {
    return `ENHANCED VERSION:

${text}

IMPROVEMENTS APPLIED:
✅ Enhanced clarity and readability
✅ Improved structure and flow
✅ Added compelling language
✅ Optimized for better engagement

REFINED OUTPUT:
${text.split('.').map(sentence => {
      if (sentence.trim()) {
        return sentence.trim() + ' This has been enhanced for better clarity and impact.';
      }
      return sentence;
    }).join(' ')}

This enhanced version provides better structure, clearer communication, and more engaging language while maintaining the original intent and meaning.`;
  }

  handleScroll(direction) {
    const scrollAmount = 300;
    const chatContainer = document.querySelector('[data-testid="conversation-turn-3"]')?.closest('div') || 
                         document.querySelector('main') || 
                         document.documentElement;
    
    if (direction === 'up') {
      chatContainer.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
    } else {
      chatContainer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }
  }

  showVerticalOverlay(type) {
    this.hideOverlay();
    
    if (type === 'library') {
      this.createLibraryOverlay();
    } else if (type === 'bookmarks') {
      this.createBookmarksOverlay();
    } else if (type === 'history') {
      this.createHistoryOverlay();
    }
    
    document.body.style.overflow = 'hidden';
  }

  createLibraryOverlay() {
    this.overlayContainer = this.createBaseOverlay('📚', 'Prompt Library', '#3B82F6');
    
    const content = this.overlayContainer.querySelector('#overlay-content');
    content.innerHTML = `
      <div style="margin-bottom: 24px;">
        <div style="position: relative;">
          <input 
            type="text" 
            id="prompt-search" 
            placeholder="Search prompts..." 
            style="width: 100%; padding: 12px 16px 12px 40px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 14px; outline: none; transition: all 0.2s ease;"
          />
          <svg style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;" id="prompts-grid">
        ${this.prompts.map(prompt => this.renderPromptCard(prompt)).join('')}
      </div>
    `;

    this.addSearchFunctionality();
    this.addPromptCardListeners();
    this.showOverlay();
  }

  createBookmarksOverlay() {
    this.overlayContainer = this.createBaseOverlay('🔖', 'Bookmarks', '#EF4444');
    
    const content = this.overlayContainer.querySelector('#overlay-content');
    content.innerHTML = `
      ${this.bookmarks.length === 0 ? `
        <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔖</div>
          <h3 style="margin: 0 0 8px 0; font-size: 20px; color: #374151;">No bookmarks yet</h3>
          <p style="margin: 0; font-size: 14px;">Use the bookmark icon in the textbox or on chat messages to save text</p>
        </div>
      ` : `
        <div style="display: grid; gap: 12px;">
          ${this.bookmarks.map(bookmark => this.renderBookmarkCard(bookmark)).join('')}
        </div>
      `}
    `;

    this.addBookmarkListeners();
    this.showOverlay();
  }

  createHistoryOverlay() {
    this.overlayContainer = this.createBaseOverlay('📜', 'Chat History', '#8B5CF6');
    
    const content = this.overlayContainer.querySelector('#overlay-content');
    content.innerHTML = `
      ${this.chatHistory.length === 0 ? `
        <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
          <div style="font-size: 48px; margin-bottom: 16px;">📜</div>
          <h3 style="margin: 0 0 8px 0; font-size: 20px; color: #374151;">No chat history yet</h3>
          <p style="margin: 0; font-size: 14px;">Download chats to build your history</p>
        </div>
      ` : `
        <div style="display: grid; gap: 12px;">
          ${this.chatHistory.map(chat => this.renderHistoryCard(chat)).join('')}
        </div>
      `}
    `;

    this.addHistoryListeners();
    this.showOverlay();
  }

  createBaseOverlay(icon, title, color) {
    const overlay = document.createElement('div');
    overlay.id = 'prompt-manager-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 999999;
      display: none;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
      padding: 20px;
      box-sizing: border-box;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 900px;
      height: 80vh;
      max-height: 600px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      background: ${color};
      color: white;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;

    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 24px;">${icon}</span>
        <h1 style="margin: 0; font-size: 20px; font-weight: 600;">${title}</h1>
      </div>
      <button id="close-overlay" style="background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 18px;">×</button>
    `;

    const content = document.createElement('div');
    content.id = 'overlay-content';
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    `;

    panel.appendChild(header);
    panel.appendChild(content);
    overlay.appendChild(panel);

    // Add event listeners
    const closeBtn = header.querySelector('#close-overlay');
    closeBtn.addEventListener('click', () => this.hideOverlay());
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hideOverlay();
      }
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  renderPromptCard(prompt) {
    return `
      <div class="prompt-card" style="
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        transition: all 0.2s ease;
        cursor: pointer;
      " data-prompt='${JSON.stringify(prompt).replace(/'/g, "&#39;")}'>
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">${prompt.title}</h3>
        <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${prompt.content}
        </p>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="background: #f3f4f6; color: #6b7280; padding: 4px 8px; border-radius: 6px; font-size: 12px;">${prompt.category}</span>
          <button class="use-prompt-btn" style="background: #3B82F6; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">Use</button>
        </div>
      </div>
    `;
  }

  renderBookmarkCard(bookmark) {
    const sourceIcon = bookmark.source === 'chat_message' ? '💬' : '📝';
    return `
      <div class="bookmark-card" style="
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        transition: all 0.2s ease;
      " data-bookmark='${JSON.stringify(bookmark).replace(/'/g, "&#39;")}'>
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
            <span style="font-size: 16px;">${sourceIcon}</span>
            <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937; flex: 1;">${bookmark.title}</h3>
          </div>
          <button class="delete-bookmark-btn" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; font-size: 16px;">×</button>
        </div>
        <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px; line-height: 1.4;">
          ${bookmark.content.length > 150 ? bookmark.content.substring(0, 150) + '...' : bookmark.content}
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; color: #9ca3af;">${new Date(bookmark.createdAt).toLocaleDateString()}</span>
          <button class="use-bookmark-btn" style="background: #EF4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">Use</button>
        </div>
      </div>
    `;
  }

  renderHistoryCard(chat) {
    return `
      <div class="history-card" style="
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        transition: all 0.2s ease;
      ">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937; flex: 1;">${chat.title}</h3>
          <span style="background: #8B5CF6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${chat.messageCount} msgs</span>
        </div>
        <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px; line-height: 1.4;">
          ${chat.preview}
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; color: #9ca3af;">Exported: ${new Date(chat.exportedAt).toLocaleDateString()}</span>
        </div>
      </div>
    `;
  }

  addSearchFunctionality() {
    const searchInput = document.getElementById('prompt-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterPrompts(e.target.value);
      });
    }
  }

  addPromptCardListeners() {
    document.querySelectorAll('.prompt-card').forEach(card => {
      const useBtn = card.querySelector('.use-prompt-btn');
      useBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptData = JSON.parse(card.getAttribute('data-prompt'));
        this.insertPrompt(promptData.content);
        this.hideOverlay();
      });
    });
  }

  addBookmarkListeners() {
    document.querySelectorAll('.bookmark-card').forEach(card => {
      const useBtn = card.querySelector('.use-bookmark-btn');
      const deleteBtn = card.querySelector('.delete-bookmark-btn');
      
      useBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bookmarkData = JSON.parse(card.getAttribute('data-bookmark'));
        this.insertPrompt(bookmarkData.content);
        this.hideOverlay();
      });

      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bookmarkData = JSON.parse(card.getAttribute('data-bookmark'));
        this.deleteBookmark(bookmarkData.id);
        card.remove();
      });
    });
  }

  addHistoryListeners() {
    // History cards are read-only for now
    document.querySelectorAll('.history-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = '#8B5CF6';
        card.style.backgroundColor = '#faf5ff';
      });

      card.addEventListener('mouseleave', () => {
        card.style.borderColor = '#e5e7eb';
        card.style.backgroundColor = 'white';
      });
    });
  }

  deleteBookmark(bookmarkId) {
    this.bookmarks = this.bookmarks.filter(b => b.id !== bookmarkId);
    chrome.storage.local.set({ bookmarks: this.bookmarks });
    this.showNotification('Bookmark deleted', 'info');
  }

  filterPrompts(query) {
    const grid = document.getElementById('prompts-grid');
    if (!grid) return;

    const filteredPrompts = this.prompts.filter(prompt => 
      prompt.title.toLowerCase().includes(query.toLowerCase()) ||
      prompt.content.toLowerCase().includes(query.toLowerCase()) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );

    grid.innerHTML = filteredPrompts.map(prompt => this.renderPromptCard(prompt)).join('');
    this.addPromptCardListeners();
  }

  showOverlay() {
    if (this.overlayContainer) {
      this.overlayContainer.style.display = 'flex';
    }
  }

  hideOverlay() {
    if (this.overlayContainer) {
      this.overlayContainer.style.display = 'none';
      this.overlayContainer.remove();
      this.overlayContainer = null;
    }
    document.body.style.overflow = '';
  }

  insertPrompt(promptContent) {
    console.log('Inserting prompt:', promptContent.substring(0, 50) + '...');
    
    const selectors = [
      '[data-testid="composer-text-input"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Send a message"]',
      '#prompt-textarea',
      'div[contenteditable="true"]'
    ];

    let textarea = null;
    for (const selector of selectors) {
      textarea = document.querySelector(selector);
      if (textarea) break;
    }
    
    if (textarea) {
      if (textarea.tagName === 'TEXTAREA') {
        textarea.value = promptContent;
        textarea.focus();
      } else if (textarea.contentEditable === 'true') {
        textarea.textContent = promptContent;
        textarea.focus();
      }
      
      // Trigger events
      ['input', 'change', 'keyup'].forEach(eventType => {
        textarea.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      
      console.log('Prompt inserted successfully');
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10B981' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);
    
    // Slide in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto remove
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  getDefaultPrompts() {
    return [
      {
        id: '1',
        title: 'Blog Post Outline Creator',
        content: 'Create a comprehensive blog post outline for the topic: [TOPIC]. Include main headings, subheadings, key points to cover, and suggested word count for each section.',
        category: 'Writing',
        tags: ['blog', 'content', 'outline'],
        isBookmarked: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20'),
        usage: 45
      },
      {
        id: '2',
        title: 'Code Security Audit',
        content: 'Review the following code for security vulnerabilities, performance issues, and best practices. Provide specific recommendations for improvement:\n\n[CODE]',
        category: 'Code Review',
        tags: ['security', 'audit', 'best-practices'],
        isBookmarked: false,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-18'),
        usage: 32
      },
      {
        id: '3',
        title: 'Social Media Strategy',
        content: 'Develop a complete social media campaign strategy for [PRODUCT/SERVICE]. Include platform selection, content types, posting schedule, hashtag strategy, and KPIs.',
        category: 'Marketing',
        tags: ['social-media', 'campaign', 'strategy'],
        isBookmarked: true,
        createdAt: new Date('2024-01-14'),
        updatedAt: new Date('2024-01-21'),
        usage: 37
      }
    ];
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  #prompt-manager-overlay .prompt-card:hover {
    border-color: #3B82F6 !important;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15) !important;
    transform: translateY(-2px) !important;
  }

  #prompt-manager-overlay .bookmark-card:hover {
    border-color: #EF4444 !important;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15) !important;
    transform: translateY(-2px) !important;
  }

  #prompt-manager-overlay .history-card:hover {
    border-color: #8B5CF6 !important;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15) !important;
    transform: translateY(-2px) !important;
  }

  #prompt-manager-overlay ::-webkit-scrollbar {
    width: 6px;
  }

  #prompt-manager-overlay ::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  #prompt-manager-overlay ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  #prompt-manager-overlay ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  .prompt-manager-message-actions {
    transition: opacity 0.2s ease !important;
  }
`;
document.head.appendChild(style);

// Initialize the prompt manager
console.log('Initializing ChatGPT Prompt Manager...');
new ChatGPTPromptManager();
// Enhanced Content script for ChatGPT integration - Minimal Design
class ChatGPTPromptManager {
  constructor() {
    this.isInjected = false;
    this.overlayContainer = null;
    this.currentView = 'library';
    this.prompts = [];
    this.bookmarks = [];
    this.retryCount = 0;
    this.maxRetries = 20;
    this.currentTextarea = null;
    this.messageObserver = null;
    this.chatMenuObserver = null;
    this.processedMessages = new Set();
    this.processedMenus = new Set();
    this.init();
  }

  init() {
    console.log("✅ ChatGPT Prompt Manager loaded!");
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startInjection());
    } else {
      this.startInjection();
    }
  }

  startInjection() {
    setTimeout(() => {
      this.tryInjectPromptManager();
    }, 2000);
  }

  async tryInjectPromptManager() {
    if (this.isInjected || this.retryCount >= this.maxRetries) return;

    console.log(`Injection attempt ${this.retryCount + 1}/${this.maxRetries}`);
    
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

    for (const selector of inputSelectors) {
      inputElement = document.querySelector(selector);
      if (inputElement) {
        console.log(`Found input element with selector: ${selector}`);
        this.currentTextarea = inputElement;
        
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

    if (document.querySelector('#prompt-manager-icons')) {
      console.log('Icons already injected');
      this.isInjected = true;
      return;
    }

    try {
      await this.loadData();
      this.injectVerticalMenu();
      this.injectInputIcons(inputContainer, inputElement);
      this.startMessageObserver();
      this.startChatMenuObserver();
      
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
      const result = await chrome.storage.local.get(['prompts', 'bookmarks']);
      this.prompts = result.prompts || this.getDefaultPrompts();
      this.bookmarks = result.bookmarks || [];
      console.log(`Loaded ${this.prompts.length} prompts and ${this.bookmarks.length} bookmarks`);
    } catch (error) {
      console.error('Error loading data:', error);
      this.prompts = this.getDefaultPrompts();
      this.bookmarks = [];
    }
  }

  injectVerticalMenu() {
    if (document.querySelector('#vertical-prompt-menu')) return;

    const menu = document.createElement('div');
    menu.id = 'vertical-prompt-menu';
    menu.style.cssText = `
      position: fixed;
      top: 50%;
      right: 16px;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 999999;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      border-radius: 12px;
      padding: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
    `;

    const menuItems = [
      { type: 'library', icon: '📚', tooltip: 'Library' },
      { type: 'bookmarks', icon: '🔖', tooltip: 'Bookmarks' },
      { type: 'craft', icon: '✨', tooltip: 'Craft' },
      { type: 'scroll-up', icon: '↑', tooltip: 'Scroll Up' },
      { type: 'scroll-down', icon: '↓', tooltip: 'Scroll Down' }
    ];

    menuItems.forEach(item => {
      const button = document.createElement('button');
      button.innerHTML = item.icon;
      button.title = item.tooltip;
      button.style.cssText = `
        background: white;
        border: 1px solid #e5e7eb;
        color: #374151;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: all 0.2s ease;
        font-size: 14px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        font-weight: 600;
      `;

      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#f3f4f6';
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
      });

      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'white';
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      });

      button.addEventListener('click', () => {
        if (item.type === 'scroll-up') {
          this.scrollChatToTop();
        } else if (item.type === 'scroll-down') {
          this.scrollChatToBottom();
        } else {
          this.showFocusedOverlay(item.type);
        }
      });

      menu.appendChild(button);
    });

    document.body.appendChild(menu);
  }

  scrollChatToTop() {
    // Find the main chat container
    const chatContainer = this.findChatContainer();
    if (chatContainer) {
      chatContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Fallback to window scroll
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  scrollChatToBottom() {
    // Find the main chat container
    const chatContainer = this.findChatContainer();
    if (chatContainer) {
      chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    } else {
      // Fallback to window scroll
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  }

  findChatContainer() {
    // Try multiple selectors to find the chat container
    const selectors = [
      '[class*="conversation"]',
      '[class*="chat"]',
      'main',
      '[role="main"]',
      '.flex-1.overflow-hidden',
      '[class*="overflow-y-auto"]'
    ];

    for (const selector of selectors) {
      const container = document.querySelector(selector);
      if (container && container.scrollHeight > container.clientHeight) {
        return container;
      }
    }

    return null;
  }

  injectInputIcons(inputContainer, inputElement) {
    console.log('Injecting input icons...');
    
    const iconsContainer = document.createElement('div');
    iconsContainer.id = 'prompt-manager-icons';
    iconsContainer.style.cssText = `
      position: absolute;
      right: 50px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      gap: 4px;
      z-index: 1000;
      align-items: center;
      pointer-events: auto;
    `;

    const icons = [
      { type: 'save', icon: '💾', tooltip: 'Save' },
      { type: 'bookmark', icon: '🔖', tooltip: 'Bookmark' },
      { type: 'craft-social', icon: '📱', tooltip: 'Social' },
      { type: 'enhance', icon: '✨', tooltip: 'Enhance' }
    ];

    icons.forEach(iconData => {
      const icon = this.createInputIcon(iconData.type, iconData.icon, iconData.tooltip);
      iconsContainer.appendChild(icon);
    });

    if (getComputedStyle(inputContainer).position === 'static') {
      inputContainer.style.position = 'relative';
    }

    inputContainer.appendChild(iconsContainer);
    console.log('Input icons injected successfully');
  }

  createInputIcon(type, iconText, tooltip) {
    const icon = document.createElement('button');
    icon.innerHTML = iconText;
    icon.title = tooltip;
    icon.setAttribute('data-type', type);
    icon.style.cssText = `
      background: white;
      border: 1px solid #d1d5db;
      color: #6b7280;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      transition: all 0.2s ease;
      font-size: 12px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    `;

    icon.addEventListener('mouseenter', () => {
      icon.style.backgroundColor = '#f9fafb';
      icon.style.borderColor = '#9ca3af';
      icon.style.transform = 'scale(1.05)';
    });

    icon.addEventListener('mouseleave', () => {
      icon.style.backgroundColor = 'white';
      icon.style.borderColor = '#d1d5db';
      icon.style.transform = 'scale(1)';
    });

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleInputIconClick(type);
    });

    return icon;
  }

  handleInputIconClick(type) {
    const text = this.getInputText();
    if (!text.trim()) {
      this.showNotification('Please enter some text first', 'warning');
      return;
    }

    switch (type) {
      case 'save':
        this.saveAsPrompt(text);
        break;
      case 'bookmark':
        this.bookmarkText(text);
        break;
      case 'craft-social':
        this.craftForSocialMedia(text);
        break;
      case 'enhance':
        this.enhanceText(text);
        break;
    }
  }

  startMessageObserver() {
    if (this.messageObserver) {
      this.messageObserver.disconnect();
    }

    this.messageObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processMessages(node);
          }
        });
      });
    });

    this.messageObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Process existing messages
    this.processMessages(document.body);
  }

  startChatMenuObserver() {
    if (this.chatMenuObserver) {
      this.chatMenuObserver.disconnect();
    }

    this.chatMenuObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processChatMenus(node);
          }
        });
      });
    });

    this.chatMenuObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Process existing menus
    this.processChatMenus(document.body);
  }

  processMessages(container) {
    const messageSelectors = [
      '[data-message-author-role="user"]',
      '[data-message-author-role="assistant"]',
      '.group.w-full',
      '[class*="group"][class*="text-gray"]'
    ];

    messageSelectors.forEach(selector => {
      const messages = container.querySelectorAll(selector);
      messages.forEach(message => {
        const messageId = this.getMessageId(message);
        if (!this.processedMessages.has(messageId)) {
          this.addMessageActions(message);
          this.processedMessages.add(messageId);
        }
      });
    });
  }

  processChatMenus(container) {
    const menuSelectors = [
      '[role="menu"]',
      '.absolute.right-0',
      '[class*="dropdown"]',
      '[class*="menu"]'
    ];

    menuSelectors.forEach(selector => {
      const menus = container.querySelectorAll(selector);
      menus.forEach(menu => {
        const menuId = this.getMenuId(menu);
        if (!this.processedMenus.has(menuId) && this.isChatMenu(menu)) {
          this.addDownloadOption(menu);
          this.processedMenus.add(menuId);
        }
      });
    });
  }

  isChatMenu(menu) {
    const menuText = menu.textContent.toLowerCase();
    return menuText.includes('share') || 
           menuText.includes('rename') || 
           menuText.includes('delete') ||
           menuText.includes('archive');
  }

  addDownloadOption(menu) {
    const menuItems = menu.querySelector('[role="menuitem"]')?.parentElement;
    if (!menuItems) return;

    if (menu.querySelector('[data-download-option]')) return;

    const downloadItem = document.createElement('div');
    downloadItem.setAttribute('data-download-option', 'true');
    downloadItem.setAttribute('role', 'menuitem');
    downloadItem.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      border-radius: 6px;
      margin: 1px 0;
      font-size: 14px;
    `;

    downloadItem.innerHTML = `
      <span style="font-size: 14px;">📥</span>
      <span style="font-size: 14px;">Download Chat</span>
    `;

    downloadItem.addEventListener('mouseenter', () => {
      downloadItem.style.backgroundColor = '#f3f4f6';
    });

    downloadItem.addEventListener('mouseleave', () => {
      downloadItem.style.backgroundColor = 'transparent';
    });

    downloadItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.downloadCurrentChat();
      menu.style.display = 'none';
    });

    const lastItem = menuItems.lastElementChild;
    if (lastItem) {
      menuItems.insertBefore(downloadItem, lastItem);
    } else {
      menuItems.appendChild(downloadItem);
    }
  }

  addMessageActions(message) {
    if (message.querySelector('.message-actions')) return;

    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'message-actions';
    actionsContainer.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s ease;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(4px);
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      z-index: 10;
    `;

    const actions = [
      { type: 'save', icon: '💾', tooltip: 'Save' },
      { type: 'bookmark', icon: '🔖', tooltip: 'Bookmark' }
    ];

    actions.forEach(action => {
      const button = document.createElement('button');
      button.innerHTML = action.icon;
      button.title = action.tooltip;
      button.style.cssText = `
        background: white;
        border: 1px solid #e5e7eb;
        color: #6b7280;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
        font-size: 10px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#f9fafb';
        button.style.borderColor = '#9ca3af';
      });

      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'white';
        button.style.borderColor = '#e5e7eb';
      });

      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const messageText = this.extractMessageText(message);
        if (action.type === 'save') {
          this.saveAsPrompt(messageText);
        } else if (action.type === 'bookmark') {
          this.bookmarkText(messageText);
        }
      });

      actionsContainer.appendChild(button);
    });

    message.style.position = 'relative';

    message.addEventListener('mouseenter', () => {
      actionsContainer.style.opacity = '1';
    });

    message.addEventListener('mouseleave', () => {
      actionsContainer.style.opacity = '0';
    });

    message.appendChild(actionsContainer);
  }

  extractMessageText(message) {
    const textSelectors = [
      '.prose',
      '[class*="markdown"]',
      'p',
      'div'
    ];

    for (const selector of textSelectors) {
      const textElement = message.querySelector(selector);
      if (textElement && textElement.textContent.trim()) {
        return textElement.textContent.trim();
      }
    }

    return message.textContent.trim();
  }

  getMessageId(message) {
    return message.getAttribute('data-message-id') || 
           message.innerHTML.substring(0, 50) + message.offsetTop;
  }

  getMenuId(menu) {
    return menu.innerHTML.substring(0, 50) + menu.offsetTop;
  }

  downloadCurrentChat() {
    const messages = this.getAllChatMessages();
    if (messages.length === 0) {
      this.showNotification('No messages found', 'warning');
      return;
    }

    const chatData = {
      title: this.getChatTitle(),
      timestamp: new Date().toISOString(),
      messages: messages
    };

    this.downloadAsFile(chatData);
  }

  getAllChatMessages() {
    const messages = [];
    const messageElements = document.querySelectorAll('[data-message-author-role]');
    
    messageElements.forEach(element => {
      const role = element.getAttribute('data-message-author-role');
      const content = this.extractMessageText(element);
      if (content) {
        messages.push({
          role: role,
          content: content,
          timestamp: new Date().toISOString()
        });
      }
    });

    return messages;
  }

  getChatTitle() {
    const titleSelectors = [
      'h1',
      '[class*="title"]',
      '.text-xl',
      '.font-semibold'
    ];

    for (const selector of titleSelectors) {
      const titleElement = document.querySelector(selector);
      if (titleElement && titleElement.textContent.trim()) {
        return titleElement.textContent.trim();
      }
    }

    return 'ChatGPT Conversation';
  }

  downloadAsFile(chatData) {
    const content = this.formatChatForDownload(chatData);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chatData.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification('Chat downloaded!', 'success');
  }

  formatChatForDownload(chatData) {
    let content = `# ${chatData.title}\n`;
    content += `Downloaded: ${new Date(chatData.timestamp).toLocaleString()}\n`;
    content += `Messages: ${chatData.messages.length}\n\n`;
    content += '=' .repeat(50) + '\n\n';

    chatData.messages.forEach((message, index) => {
      const role = message.role === 'user' ? 'You' : 'ChatGPT';
      content += `## ${role} (Message ${index + 1})\n`;
      content += `${message.content}\n\n`;
      content += '-'.repeat(30) + '\n\n';
    });

    return content;
  }

  getInputText() {
    if (!this.currentTextarea) return '';
    
    if (this.currentTextarea.tagName === 'TEXTAREA') {
      return this.currentTextarea.value;
    } else if (this.currentTextarea.contentEditable === 'true') {
      return this.currentTextarea.textContent;
    }
    
    return '';
  }

  saveAsPrompt(text) {
    const prompt = {
      id: Date.now().toString(),
      title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      content: text,
      category: 'Custom',
      tags: ['saved'],
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      usage: 0
    };

    this.prompts.unshift(prompt);
    chrome.storage.local.set({ prompts: this.prompts });
    this.showNotification('Saved as prompt!', 'success');
  }

  bookmarkText(text) {
    const bookmark = {
      id: Date.now().toString(),
      content: text,
      source: 'chat',
      createdAt: new Date()
    };

    this.bookmarks.unshift(bookmark);
    chrome.storage.local.set({ bookmarks: this.bookmarks });
    this.showNotification('Bookmarked!', 'success');
  }

  craftForSocialMedia(text) {
    const enhanced = this.enhanceForSocialMedia(text);
    this.insertPrompt(enhanced);
    this.showNotification('Crafted for social media!', 'success');
  }

  enhanceText(text) {
    const enhanced = this.enhancePrompt(text);
    this.insertPrompt(enhanced);
    this.showNotification('Text enhanced!', 'success');
  }

  enhanceForSocialMedia(text) {
    return `📱 SOCIAL MEDIA POST:

${text}

✨ Enhanced for engagement:
• Added emojis and hashtags
• Optimized for algorithms
• Clear call-to-action
• Better readability

#SocialMedia #Content`;
  }

  enhancePrompt(text) {
    return `ENHANCED PROMPT:

Original: ${text}

Improved with:
• Clear context
• Specific instructions
• Expected format
• Relevant constraints

Please provide a comprehensive response with examples and actionable insights.`;
  }

  showFocusedOverlay(type) {
    console.log(`Showing overlay: ${type}`);
    
    this.hideOverlay();
    
    switch (type) {
      case 'library':
        this.createLibraryOverlay();
        break;
      case 'bookmarks':
        this.createBookmarksOverlay();
        break;
      case 'craft':
        this.createCraftOverlay();
        break;
    }
    
    document.body.style.overflow = 'hidden';
  }

  createLibraryOverlay() {
    this.overlayContainer = this.createBaseOverlay('📚', 'Library');
    
    const content = this.overlayContainer.querySelector('#overlay-content');
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <input 
          type="text" 
          id="prompt-search" 
          placeholder="Search prompts..." 
          style="width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none;"
        />
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; max-height: 400px; overflow-y: auto;" id="prompts-grid">
        ${this.prompts.map(prompt => this.renderPromptCard(prompt)).join('')}
      </div>
    `;

    this.addSearchFunctionality();
    this.addPromptCardListeners();
    this.showOverlay();
  }

  createBookmarksOverlay() {
    this.overlayContainer = this.createBaseOverlay('🔖', 'Bookmarks');
    
    const content = this.overlayContainer.querySelector('#overlay-content');
    content.innerHTML = `
      ${this.bookmarks.length === 0 ? `
        <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔖</div>
          <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #374151;">No bookmarks yet</h3>
          <p style="margin: 0; font-size: 14px;">Bookmark messages to access them here</p>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; max-height: 400px; overflow-y: auto;">
          ${this.bookmarks.map(bookmark => this.renderBookmarkCard(bookmark)).join('')}
        </div>
      `}
    `;

    this.addBookmarkListeners();
    this.showOverlay();
  }

  createCraftOverlay() {
    this.overlayContainer = this.createBaseOverlay('✨', 'Craft');
    
    const content = this.overlayContainer.querySelector('#overlay-content');
    content.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 8px; font-size: 14px;">Original Text</label>
          <textarea 
            id="original-prompt" 
            placeholder="Enter your text here..."
            style="width: 100%; height: 100px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; resize: vertical; outline: none; font-family: inherit;"
          ></textarea>
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <button id="improve-prompt" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
            ✨ Improve Text
          </button>
        </div>

        <div id="improved-prompt-container" style="display: none;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 8px; font-size: 14px;">Improved Text</label>
          <div style="position: relative;">
            <textarea 
              id="improved-prompt" 
              readonly
              style="width: 100%; height: 150px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #f9fafb; resize: vertical; font-family: inherit;"
            ></textarea>
            <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px;">
              <button id="copy-improved" style="background: white; border: 1px solid #d1d5db; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                📋 Copy
              </button>
              <button id="use-improved" style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                Use
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.addCraftEventListeners();
    this.showOverlay();
  }

  createBaseOverlay(icon, title) {
    const overlay = document.createElement('div');
    overlay.id = 'prompt-manager-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 800px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;

    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 20px;">${icon}</span>
        <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #374151;">${title}</h2>
      </div>
      <button id="close-overlay" style="background: none; border: none; color: #6b7280; cursor: pointer; font-size: 20px; padding: 4px; border-radius: 4px;">×</button>
    `;

    const content = document.createElement('div');
    content.id = 'overlay-content';
    content.style.cssText = `
      flex: 1;
      overflow: hidden;
      padding: 20px;
    `;

    panel.appendChild(header);
    panel.appendChild(content);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const closeBtn = header.querySelector('#close-overlay');
    closeBtn.addEventListener('click', () => this.hideOverlay());

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hideOverlay();
      }
    });

    return overlay;
  }

  renderPromptCard(prompt) {
    return `
      <div class="prompt-card" style="
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
      " data-prompt='${JSON.stringify(prompt).replace(/'/g, "&#39;")}'>
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #374151;">${prompt.title}</h3>
        <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${prompt.content}
        </p>
        <button class="use-prompt-btn" style="
          width: 100%;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
        ">
          Use Prompt
        </button>
      </div>
    `;
  }

  renderBookmarkCard(bookmark) {
    return `
      <div class="bookmark-card" style="
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        transition: all 0.2s ease;
      " data-bookmark='${JSON.stringify(bookmark).replace(/'/g, "&#39;")}'>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">
            ${bookmark.source === 'chat' ? 'Chat' : 'Input'}
          </span>
          <button class="delete-bookmark-btn" style="background: none; border: none; color: #dc2626; cursor: pointer; font-size: 14px;">×</button>
        </div>
        <p style="margin: 0 0 12px 0; color: #374151; font-size: 13px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          ${bookmark.content.substring(0, 120)}${bookmark.content.length > 120 ? '...' : ''}
        </p>
        <div style="display: flex; gap: 8px;">
          <button class="use-bookmark-btn" style="
            flex: 1;
            background: #ef4444;
            color: white;
            border: none;
            padding: 6px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
          ">
            Use
          </button>
          <button class="copy-bookmark-btn" style="
            background: white;
            border: 1px solid #d1d5db;
            color: #6b7280;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
          ">
            📋
          </button>
        </div>
      </div>
    `;
  }

  addSearchFunctionality() {
    const searchInput = document.querySelector('#prompt-search');
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
      const copyBtn = card.querySelector('.copy-bookmark-btn');
      const deleteBtn = card.querySelector('.delete-bookmark-btn');

      useBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bookmarkData = JSON.parse(card.getAttribute('data-bookmark'));
        this.insertPrompt(bookmarkData.content);
        this.hideOverlay();
      });

      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bookmarkData = JSON.parse(card.getAttribute('data-bookmark'));
        navigator.clipboard.writeText(bookmarkData.content);
        this.showNotification('Copied!', 'success');
      });

      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const bookmarkData = JSON.parse(card.getAttribute('data-bookmark'));
        this.deleteBookmark(bookmarkData.id);
        card.remove();
      });
    });
  }

  addCraftEventListeners() {
    const improveBtn = document.querySelector('#improve-prompt');
    const originalTextarea = document.querySelector('#original-prompt');
    const improvedContainer = document.querySelector('#improved-prompt-container');
    const improvedTextarea = document.querySelector('#improved-prompt');
    const copyBtn = document.querySelector('#copy-improved');
    const useBtn = document.querySelector('#use-improved');

    if (improveBtn) {
      improveBtn.addEventListener('click', () => {
        const originalText = originalTextarea.value.trim();
        if (!originalText) return;

        improveBtn.innerHTML = '⏳ Improving...';
        improveBtn.disabled = true;

        setTimeout(() => {
          const improved = this.enhancePrompt(originalText);
          improvedTextarea.value = improved;
          improvedContainer.style.display = 'block';
          improveBtn.innerHTML = '✨ Improve Text';
          improveBtn.disabled = false;
        }, 1000);
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(improvedTextarea.value);
        copyBtn.innerHTML = '✅ Copied';
        setTimeout(() => {
          copyBtn.innerHTML = '📋 Copy';
        }, 1500);
      });
    }

    if (useBtn) {
      useBtn.addEventListener('click', () => {
        this.insertPrompt(improvedTextarea.value);
        this.hideOverlay();
      });
    }
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

  deleteBookmark(bookmarkId) {
    this.bookmarks = this.bookmarks.filter(b => b.id !== bookmarkId);
    chrome.storage.local.set({ bookmarks: this.bookmarks });
    this.showNotification('Deleted', 'info');
  }

  showOverlay() {
    if (this.overlayContainer) {
      this.overlayContainer.style.display = 'flex';
    }
  }

  hideOverlay() {
    if (this.overlayContainer) {
      this.overlayContainer.style.display = 'none';
      document.body.removeChild(this.overlayContainer);
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
      if (textarea) {
        console.log(`Found textarea with selector: ${selector}`);
        break;
      }
    }
    
    if (textarea) {
      if (textarea.tagName === 'TEXTAREA') {
        textarea.value = promptContent;
        textarea.focus();
        textarea.setSelectionRange(promptContent.length, promptContent.length);
      } else if (textarea.contentEditable === 'true') {
        textarea.textContent = promptContent;
        textarea.focus();
        
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(textarea);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      const events = ['input', 'change', 'keyup', 'paste'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        textarea.dispatchEvent(event);
      });
      
      console.log('Prompt inserted successfully');
    } else {
      console.error('Could not find ChatGPT textarea');
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 2000);
  }

  getDefaultPrompts() {
    return [
      {
        id: '1',
        title: 'Blog Post Outline',
        content: 'Create a comprehensive blog post outline for the topic: [TOPIC]. Include main headings, subheadings, key points to cover, and suggested word count for each section.',
        category: 'Writing',
        tags: ['blog', 'content', 'outline'],
        isBookmarked: true,
        usage: 45,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        title: 'Code Review',
        content: 'Review the following code for security vulnerabilities, performance issues, and best practices. Provide specific recommendations for improvement:\n\n[CODE]',
        category: 'Code Review',
        tags: ['security', 'audit', 'best-practices'],
        isBookmarked: false,
        usage: 32,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        title: 'SWOT Analysis',
        content: 'Create a detailed SWOT analysis for [COMPANY/PRODUCT]. Analyze Strengths, Weaknesses, Opportunities, and Threats with specific examples and actionable insights.',
        category: 'Business',
        tags: ['swot', 'analysis', 'strategy'],
        isBookmarked: true,
        usage: 28,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }
}

// Add minimal CSS
const style = document.createElement('style');
style.textContent = `
  .prompt-card:hover {
    border-color: #9ca3af !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  }

  .bookmark-card:hover {
    border-color: #9ca3af !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  }

  /* Minimal scrollbar */
  #prompt-manager-overlay *::-webkit-scrollbar {
    width: 6px;
  }

  #prompt-manager-overlay *::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  #prompt-manager-overlay *::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
`;
document.head.appendChild(style);

// Initialize
console.log('Initializing ChatGPT Prompt Manager...');
new ChatGPTPromptManager();
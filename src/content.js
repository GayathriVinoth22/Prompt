// Content script for ChatGPT integration - Overlay Style
class ChatGPTPromptManager {
  constructor() {
    this.isInjected = false;
    this.overlayContainer = null;
    this.currentView = 'library';
    this.prompts = [];
    this.retryCount = 0;
    this.maxRetries = 20;
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
    if (document.querySelector('#prompt-manager-icons')) {
      console.log('Icons already injected');
      this.isInjected = true;
      return;
    }

    try {
      // Load prompts from storage
      await this.loadPrompts();
      
      // Inject input icons
      this.injectInputIcons(inputContainer, inputElement);
      
      // Create overlay container
      this.createOverlayContainer();
      
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

  async loadPrompts() {
    try {
      const result = await chrome.storage.local.get(['prompts']);
      this.prompts = result.prompts || this.getDefaultPrompts();
      console.log(`Loaded ${this.prompts.length} prompts`);
    } catch (error) {
      console.error('Error loading prompts:', error);
      this.prompts = this.getDefaultPrompts();
    }
  }

  injectInputIcons(inputContainer, inputElement) {
    console.log('Injecting input icons...');
    
    // Create icons container
    const iconsContainer = document.createElement('div');
    iconsContainer.id = 'prompt-manager-icons';
    iconsContainer.style.cssText = `
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

    // Library icon
    const libraryIcon = this.createIcon('library', `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    `, 'Prompt Library', '#3B82F6');

    // Craft icon
    const craftIcon = this.createIcon('craft', `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `, 'Prompt Craft', '#F59E0B');

    // Bookmark icon
    const bookmarkIcon = this.createIcon('bookmarks', `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
      </svg>
    `, 'Bookmarks', '#EF4444');

    iconsContainer.appendChild(libraryIcon);
    iconsContainer.appendChild(craftIcon);
    iconsContainer.appendChild(bookmarkIcon);

    // Make sure the container is positioned relatively
    if (getComputedStyle(inputContainer).position === 'static') {
      inputContainer.style.position = 'relative';
    }

    // Insert icons into the input container
    inputContainer.appendChild(iconsContainer);
    
    console.log('Icons injected successfully');
  }

  createIcon(type, svgContent, tooltip, color) {
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
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      min-width: 36px;
      min-height: 36px;
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
      console.log(`${type} icon clicked`);
      this.showOverlay(type);
    });

    return icon;
  }

  createOverlayContainer() {
    // Create overlay backdrop
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.id = 'prompt-manager-overlay';
    this.overlayContainer.style.cssText = `
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

    // Create main panel
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: white;
      border-radius: 20px;
      width: 100%;
      max-width: 1200px;
      height: 90vh;
      max-height: 800px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
      position: relative;
      animation: slideUp 0.3s ease-out;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      padding: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 20px 20px 0 0;
    `;

    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 40px; height: 40px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
          ✨
        </div>
        <div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">ChatGPT Prompt Manager</h1>
          <p style="margin: 4px 0 0 0; font-size: 16px; opacity: 0.9;">Enhance your ChatGPT experience with powerful prompts</p>
        </div>
      </div>
      <button id="close-overlay" style="background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 40px; height: 40px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: background 0.2s ease;">×</button>
    `;

    // Create navigation tabs
    const nav = document.createElement('div');
    nav.style.cssText = `
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
      padding: 0 24px;
      display: flex;
      gap: 0;
    `;

    const tabs = [
      { id: 'library', label: 'Prompt Library', icon: '📚' },
      { id: 'bookmarks', label: 'Bookmarks', icon: '🔖' },
      { id: 'craft', label: 'Prompt Craft', icon: '✨' }
    ];

    tabs.forEach(tab => {
      const tabButton = document.createElement('button');
      tabButton.innerHTML = `
        <span style="margin-right: 10px; font-size: 16px;">${tab.icon}</span>
        <span style="font-weight: 600;">${tab.label}</span>
      `;
      tabButton.style.cssText = `
        background: none;
        border: none;
        padding: 20px 24px;
        cursor: pointer;
        font-size: 15px;
        color: #6b7280;
        border-bottom: 3px solid transparent;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
      `;

      tabButton.addEventListener('click', () => {
        this.switchTab(tab.id);
        this.updateTabStyles(nav, tab.id);
      });

      tabButton.addEventListener('mouseenter', () => {
        if (!tabButton.classList.contains('active')) {
          tabButton.style.color = '#374151';
          tabButton.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
        }
      });

      tabButton.addEventListener('mouseleave', () => {
        if (!tabButton.classList.contains('active')) {
          tabButton.style.color = '#6b7280';
          tabButton.style.backgroundColor = 'transparent';
        }
      });

      nav.appendChild(tabButton);
    });

    // Create content area
    const content = document.createElement('div');
    content.id = 'overlay-content';
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 32px;
      background: #fafafa;
    `;

    // Assemble panel
    panel.appendChild(header);
    panel.appendChild(nav);
    panel.appendChild(content);
    this.overlayContainer.appendChild(panel);

    // Add to document
    document.body.appendChild(this.overlayContainer);

    // Add event listeners
    const closeBtn = header.querySelector('#close-overlay');
    closeBtn.addEventListener('click', () => this.hideOverlay());
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    this.overlayContainer.addEventListener('click', (e) => {
      if (e.target === this.overlayContainer) {
        this.hideOverlay();
      }
    });

    // Initialize with library view
    this.updateTabStyles(nav, 'library');
    
    console.log('Overlay container created');
  }

  showOverlay(view = 'library') {
    console.log(`Showing overlay with view: ${view}`);
    this.currentView = view;
    this.overlayContainer.style.display = 'flex';
    
    // Update tab styles
    const nav = this.overlayContainer.querySelector('div[style*="background: #f8fafc"]');
    this.updateTabStyles(nav, view);
    
    // Render content
    this.renderContent();
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  hideOverlay() {
    console.log('Hiding overlay');
    this.overlayContainer.style.display = 'none';
    document.body.style.overflow = '';
  }

  switchTab(tabId) {
    console.log(`Switching to tab: ${tabId}`);
    this.currentView = tabId;
    this.renderContent();
  }

  updateTabStyles(nav, activeTab) {
    const buttons = nav.querySelectorAll('button');
    const tabs = ['library', 'bookmarks', 'craft'];
    
    buttons.forEach((button, index) => {
      const isActive = tabs[index] === activeTab;
      button.classList.toggle('active', isActive);
      button.style.color = isActive ? '#10B981' : '#6b7280';
      button.style.borderBottomColor = isActive ? '#10B981' : 'transparent';
      button.style.backgroundColor = isActive ? 'white' : 'transparent';
    });
  }

  renderContent() {
    const content = document.getElementById('overlay-content');
    if (!content) return;
    
    switch (this.currentView) {
      case 'library':
        this.renderLibrary(content);
        break;
      case 'bookmarks':
        this.renderBookmarks(content);
        break;
      case 'craft':
        this.renderCraft(content);
        break;
    }
    
    // Add event listeners after rendering
    setTimeout(() => this.addPromptCardListeners(), 100);
  }

  renderLibrary(container) {
    container.innerHTML = `
      <div style="margin-bottom: 32px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <div>
            <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #1f2937;">Prompt Library</h2>
            <p style="margin: 0; color: #6b7280; font-size: 16px;">Discover and use powerful prompts to enhance your conversations</p>
          </div>
        </div>
        
        <div style="position: relative; margin-bottom: 24px;">
          <input 
            type="text" 
            id="prompt-search" 
            placeholder="Search prompts by title, content, or tags..." 
            style="width: 100%; padding: 16px 20px 16px 52px; border: 2px solid #e5e7eb; border-radius: 16px; font-size: 16px; outline: none; transition: all 0.2s ease; background: white;"
          />
          <svg style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: #9ca3af;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px;" id="prompts-grid">
        ${this.prompts.map(prompt => this.renderPromptCard(prompt)).join('')}
      </div>
    `;

    // Add search functionality
    const searchInput = container.querySelector('#prompt-search');
    searchInput.addEventListener('input', (e) => {
      this.filterPrompts(e.target.value);
    });

    // Add focus styles
    searchInput.addEventListener('focus', () => {
      searchInput.style.borderColor = '#10B981';
      searchInput.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
    });

    searchInput.addEventListener('blur', () => {
      searchInput.style.borderColor = '#e5e7eb';
      searchInput.style.boxShadow = 'none';
    });
  }

  renderBookmarks(container) {
    const bookmarkedPrompts = this.prompts.filter(p => p.isBookmarked);

    container.innerHTML = `
      <div style="margin-bottom: 32px;">
        <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #1f2937;">Bookmarked Prompts</h2>
        <p style="margin: 0; color: #6b7280; font-size: 16px;">Your saved prompts for quick access</p>
      </div>
      
      ${bookmarkedPrompts.length === 0 ? `
        <div style="text-align: center; padding: 80px 20px; color: #6b7280;">
          <div style="font-size: 64px; margin-bottom: 24px;">🔖</div>
          <h3 style="margin: 0 0 12px 0; font-size: 24px; color: #374151;">No bookmarks yet</h3>
          <p style="margin: 0; font-size: 16px;">Bookmark prompts from the library to access them quickly</p>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px;">
          ${bookmarkedPrompts.map(prompt => this.renderPromptCard(prompt)).join('')}
        </div>
      `}
    `;
  }

  renderCraft(container) {
    container.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto;">
        <div style="margin-bottom: 40px; text-align: center;">
          <h2 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 700; color: #1f2937;">Prompt Craft</h2>
          <p style="margin: 0; color: #6b7280; font-size: 18px;">Transform your prompts into powerful, precise instructions</p>
        </div>

        <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 20px; padding: 32px; margin-bottom: 32px; border: 1px solid #bae6fd;">
          <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 12px;">
            🎯 Enhancement Techniques
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            <label style="display: flex; align-items: start; gap: 16px; cursor: pointer; padding: 16px; background: white; border-radius: 16px; border: 2px solid #e2e8f0; transition: all 0.2s ease;">
              <input type="checkbox" style="margin-top: 4px; transform: scale(1.2);" />
              <div>
                <div style="font-weight: 600; color: #1e293b; margin-bottom: 6px; font-size: 15px;">Clarity Enhancement</div>
                <div style="font-size: 14px; color: #64748b; line-height: 1.4;">Make the prompt more specific and clear</div>
              </div>
            </label>
            <label style="display: flex; align-items: start; gap: 16px; cursor: pointer; padding: 16px; background: white; border-radius: 16px; border: 2px solid #e2e8f0; transition: all 0.2s ease;">
              <input type="checkbox" style="margin-top: 4px; transform: scale(1.2);" />
              <div>
                <div style="font-weight: 600; color: #1e293b; margin-bottom: 6px; font-size: 15px;">Context Addition</div>
                <div style="font-size: 14px; color: #64748b; line-height: 1.4;">Add relevant background information</div>
              </div>
            </label>
            <label style="display: flex; align-items: start; gap: 16px; cursor: pointer; padding: 16px; background: white; border-radius: 16px; border: 2px solid #e2e8f0; transition: all 0.2s ease;">
              <input type="checkbox" style="margin-top: 4px; transform: scale(1.2);" />
              <div>
                <div style="font-weight: 600; color: #1e293b; margin-bottom: 6px; font-size: 15px;">Example Integration</div>
                <div style="font-size: 14px; color: #64748b; line-height: 1.4;">Include helpful examples</div>
              </div>
            </label>
          </div>
        </div>

        <div style="margin-bottom: 32px;">
          <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 12px; font-size: 16px;">Original Prompt</label>
          <textarea 
            id="original-prompt" 
            placeholder="Enter your original prompt here..."
            style="width: 100%; height: 140px; padding: 20px; border: 2px solid #d1d5db; border-radius: 16px; font-size: 16px; resize: vertical; outline: none; transition: all 0.2s ease; font-family: inherit; line-height: 1.5;"
          ></textarea>
        </div>

        <div style="text-align: center; margin-bottom: 32px;">
          <button id="improve-prompt" style="background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; padding: 18px 40px; border-radius: 16px; font-size: 18px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 12px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
            <span style="font-size: 20px;">✨</span>
            Improve Prompt
          </button>
        </div>

        <div id="improved-prompt-container" style="display: none;">
          <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 12px; font-size: 16px;">Improved Prompt</label>
          <div style="position: relative;">
            <textarea 
              id="improved-prompt" 
              readonly
              style="width: 100%; height: 240px; padding: 20px; border: 2px solid #d1d5db; border-radius: 16px; font-size: 16px; background: #f9fafb; resize: vertical; font-family: inherit; line-height: 1.5;"
            ></textarea>
            <div style="position: absolute; top: 16px; right: 16px; display: flex; gap: 8px;">
              <button id="copy-improved" style="background: white; border: 2px solid #d1d5db; padding: 10px 16px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; transition: all 0.2s ease;">
                📋 Copy
              </button>
              <button id="use-improved" style="background: #10B981; color: white; border: none; padding: 10px 16px; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s ease;">
                Use Prompt
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add event listeners for craft functionality
    const improveBtn = container.querySelector('#improve-prompt');
    const originalTextarea = container.querySelector('#original-prompt');
    const improvedContainer = container.querySelector('#improved-prompt-container');
    const improvedTextarea = container.querySelector('#improved-prompt');
    const copyBtn = container.querySelector('#copy-improved');
    const useBtn = container.querySelector('#use-improved');

    // Focus styles for textarea
    originalTextarea.addEventListener('focus', () => {
      originalTextarea.style.borderColor = '#10B981';
      originalTextarea.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
    });

    originalTextarea.addEventListener('blur', () => {
      originalTextarea.style.borderColor = '#d1d5db';
      originalTextarea.style.boxShadow = 'none';
    });

    // Improve button hover
    improveBtn.addEventListener('mouseenter', () => {
      improveBtn.style.transform = 'translateY(-2px)';
      improveBtn.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
    });

    improveBtn.addEventListener('mouseleave', () => {
      improveBtn.style.transform = 'translateY(0)';
      improveBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
    });

    improveBtn.addEventListener('click', () => {
      const originalText = originalTextarea.value.trim();
      if (!originalText) return;

      improveBtn.innerHTML = '<span style="font-size: 20px;">⏳</span> Improving...';
      improveBtn.disabled = true;

      setTimeout(() => {
        const improved = `ENHANCED PROMPT:

${originalText}

IMPROVEMENTS APPLIED:
• Enhanced clarity and specificity
• Added structured format requirements
• Included context and constraints
• Defined expected output format

OPTIMIZED VERSION:
As an expert assistant, please provide a comprehensive response to the following request. Structure your response with clear headings and ensure it addresses all aspects thoroughly.

Request: ${originalText}

Please ensure your response:
- Is well-structured and easy to follow
- Includes specific examples where relevant
- Addresses potential follow-up questions
- Maintains a professional yet accessible tone
- Provides actionable insights or recommendations`;

        improvedTextarea.value = improved;
        improvedContainer.style.display = 'block';
        improveBtn.innerHTML = '<span style="font-size: 20px;">✨</span> Improve Prompt';
        improveBtn.disabled = false;
      }, 2000);
    });

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(improvedTextarea.value);
      copyBtn.innerHTML = '✅ Copied';
      setTimeout(() => {
        copyBtn.innerHTML = '📋 Copy';
      }, 2000);
    });

    useBtn.addEventListener('click', () => {
      this.insertPrompt(improvedTextarea.value);
      this.hideOverlay();
    });

    // Add hover effects to enhancement technique labels
    const labels = container.querySelectorAll('label');
    labels.forEach(label => {
      label.addEventListener('mouseenter', () => {
        label.style.borderColor = '#10B981';
        label.style.backgroundColor = '#f0fdf4';
      });
      label.addEventListener('mouseleave', () => {
        label.style.borderColor = '#e2e8f0';
        label.style.backgroundColor = 'white';
      });
    });
  }

  renderPromptCard(prompt) {
    return `
      <div class="prompt-card" style="
        background: white;
        border: 2px solid #f1f5f9;
        border-radius: 20px;
        padding: 24px;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      " data-prompt='${JSON.stringify(prompt).replace(/'/g, "&#39;")}'>
        <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937; line-height: 1.4; flex: 1; padding-right: 12px;">${prompt.title}</h3>
          <button class="bookmark-btn" style="
            background: none;
            border: none;
            color: ${prompt.isBookmarked ? '#f59e0b' : '#d1d5db'};
            cursor: pointer;
            padding: 6px;
            border-radius: 8px;
            transition: all 0.2s ease;
            flex-shrink: 0;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${prompt.isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
          </button>
        </div>
        
        <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 15px; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          ${prompt.content}
        </p>
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <span style="
            background: ${this.getCategoryColor(prompt.category)};
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
          ">${prompt.category}</span>
          <span style="font-size: 13px; color: #9ca3af; font-weight: 500;">${prompt.usage} uses</span>
        </div>
        
        <div style="display: flex; flex-wrap: gap: 8px; margin-bottom: 20px;">
          ${prompt.tags.slice(0, 3).map(tag => `
            <span style="background: #f3f4f6; color: #6b7280; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">${tag}</span>
          `).join('')}
          ${prompt.tags.length > 3 ? `<span style="color: #9ca3af; font-size: 12px; font-weight: 500;">+${prompt.tags.length - 3}</span>` : ''}
        </div>
        
        <button class="use-prompt-btn" style="
          width: 100%;
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border: none;
          padding: 14px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
        ">
          Use Prompt
        </button>
      </div>
    `;
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

  addPromptCardListeners() {
    // Add event listeners to prompt cards
    document.querySelectorAll('.prompt-card').forEach(card => {
      // Hover effects
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = '#10B981';
        card.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.15)';
        card.style.transform = 'translateY(-4px)';
      });

      card.addEventListener('mouseleave', () => {
        card.style.borderColor = '#f1f5f9';
        card.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
        card.style.transform = 'translateY(0)';
      });

      // Use prompt button
      const useBtn = card.querySelector('.use-prompt-btn');
      useBtn.addEventListener('mouseenter', () => {
        useBtn.style.background = 'linear-gradient(135deg, #059669, #047857)';
        useBtn.style.transform = 'translateY(-1px)';
      });

      useBtn.addEventListener('mouseleave', () => {
        useBtn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
        useBtn.style.transform = 'translateY(0)';
      });

      useBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptData = JSON.parse(card.getAttribute('data-prompt'));
        this.insertPrompt(promptData.content);
        this.hideOverlay();
      });

      // Bookmark button
      const bookmarkBtn = card.querySelector('.bookmark-btn');
      bookmarkBtn.addEventListener('mouseenter', () => {
        bookmarkBtn.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
      });

      bookmarkBtn.addEventListener('mouseleave', () => {
        bookmarkBtn.style.backgroundColor = 'transparent';
      });

      bookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptData = JSON.parse(card.getAttribute('data-prompt'));
        this.toggleBookmark(promptData.id);
      });
    });
  }

  toggleBookmark(promptId) {
    this.prompts = this.prompts.map(p => 
      p.id === promptId ? { ...p, isBookmarked: !p.isBookmarked } : p
    );
    
    // Save to storage
    chrome.storage.local.set({ prompts: this.prompts });
    
    // Re-render current view
    this.renderContent();
  }

  getCategoryColor(category) {
    const colors = {
      'Writing': '#10B981',
      'Code Review': '#3B82F6',
      'Business': '#8B5CF6',
      'Education': '#F59E0B',
      'Marketing': '#EF4444',
      'Research': '#06B6D4'
    };
    return colors[category] || '#6B7280';
  }

  insertPrompt(promptContent) {
    console.log('Inserting prompt:', promptContent.substring(0, 50) + '...');
    
    // Find ChatGPT's textarea with multiple selectors
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
      // Handle both textarea and contenteditable elements
      if (textarea.tagName === 'TEXTAREA') {
        textarea.value = promptContent;
        textarea.focus();
        textarea.setSelectionRange(promptContent.length, promptContent.length);
      } else if (textarea.contentEditable === 'true') {
        textarea.textContent = promptContent;
        textarea.focus();
        
        // Set cursor to end for contenteditable
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(textarea);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Trigger events to notify ChatGPT
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

  getDefaultPrompts() {
    return [
      {
        id: '1',
        title: 'Blog Post Outline Creator',
        content: 'Create a comprehensive blog post outline for the topic: [TOPIC]. Include main headings, subheadings, key points to cover, and suggested word count for each section.',
        category: 'Writing',
        tags: ['blog', 'content', 'outline'],
        isBookmarked: true,
        usage: 45
      },
      {
        id: '2',
        title: 'Code Security Audit',
        content: 'Review the following code for security vulnerabilities, performance issues, and best practices. Provide specific recommendations for improvement:\n\n[CODE]',
        category: 'Code Review',
        tags: ['security', 'audit', 'best-practices'],
        isBookmarked: false,
        usage: 32
      },
      {
        id: '3',
        title: 'SWOT Analysis Generator',
        content: 'Create a detailed SWOT analysis for [COMPANY/PRODUCT]. Analyze Strengths, Weaknesses, Opportunities, and Threats with specific examples and actionable insights.',
        category: 'Business',
        tags: ['swot', 'analysis', 'strategy'],
        isBookmarked: true,
        usage: 28
      },
      {
        id: '4',
        title: 'Learning Path Creator',
        content: 'Design a comprehensive learning path for [SKILL/SUBJECT]. Include beginner to advanced resources, estimated timeframes, practical projects, and assessment methods.',
        category: 'Education',
        tags: ['learning', 'curriculum', 'skills'],
        isBookmarked: false,
        usage: 19
      },
      {
        id: '5',
        title: 'Social Media Campaign Strategy',
        content: 'Develop a complete social media campaign strategy for [PRODUCT/SERVICE]. Include platform selection, content types, posting schedule, hashtag strategy, and KPIs.',
        category: 'Marketing',
        tags: ['social-media', 'campaign', 'strategy'],
        isBookmarked: true,
        usage: 37
      }
    ];
  }
}

// Add CSS animations and styles
const style = document.createElement('style');
style.textContent = `
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

  #prompt-manager-overlay * {
    box-sizing: border-box;
  }

  #prompt-manager-overlay .prompt-card:hover .use-prompt-btn {
    background: linear-gradient(135deg, #059669, #047857) !important;
    transform: translateY(-1px);
  }

  #prompt-manager-overlay .bookmark-btn:hover {
    color: #f59e0b !important;
  }

  /* Scrollbar styling */
  #prompt-manager-overlay ::-webkit-scrollbar {
    width: 8px;
  }

  #prompt-manager-overlay ::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }

  #prompt-manager-overlay ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }

  #prompt-manager-overlay ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;
document.head.appendChild(style);

// Initialize the prompt manager
console.log('Initializing ChatGPT Prompt Manager...');
new ChatGPTPromptManager();
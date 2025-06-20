// Enhanced Content script for ChatGPT integration - Overlay Style
class ChatGPTPromptManager {
  constructor() {
    this.isInjected = false;
    this.overlayContainer = null;
    this.currentView = 'library';
    this.prompts = [];
    this.retryCount = 0;
    this.maxRetries = 20;
    this.currentTextarea = null;
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
      gap: 8px;
      z-index: 1000;
      align-items: center;
      pointer-events: auto;
    `;

    // Library icon
    const libraryIcon = this.createIcon('library', `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    `, 'Prompt Library', '#3B82F6');

    // Craft icon
    const craftIcon = this.createIcon('craft', `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `, 'Prompt Craft', '#F59E0B');

    // Bookmark icon
    const bookmarkIcon = this.createIcon('bookmarks', `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
      border: 2px solid #e5e7eb;
      color: #6b7280;
      cursor: pointer;
      padding: 10px;
      border-radius: 12px;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      min-width: 44px;
      min-height: 44px;
      backdrop-filter: blur(10px);
    `;

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
      icon.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
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
      background: rgba(0, 0, 0, 0.7);
      z-index: 999999;
      display: none;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(12px);
      padding: 20px;
      box-sizing: border-box;
      animation: fadeIn 0.3s ease-out;
    `;

    // Create main panel
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: white;
      border-radius: 24px;
      width: 100%;
      max-width: 1400px;
      height: 90vh;
      max-height: 900px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
      position: relative;
      animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 28px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 24px 24px 0 0;
      position: relative;
      overflow: hidden;
    `;

    // Add animated background pattern
    const pattern = document.createElement('div');
    pattern.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      opacity: 0.3;
    `;
    header.appendChild(pattern);

    header.innerHTML += `
      <div style="display: flex; align-items: center; gap: 20px; position: relative; z-index: 1;">
        <div style="width: 48px; height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 24px; backdrop-filter: blur(10px);">
          ✨
        </div>
        <div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">ChatGPT Prompt Manager</h1>
          <p style="margin: 6px 0 0 0; font-size: 16px; opacity: 0.9; font-weight: 400;">Supercharge your conversations with intelligent prompts</p>
        </div>
      </div>
      <button id="close-overlay" style="background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 48px; height: 48px; border-radius: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 24px; transition: all 0.3s ease; position: relative; z-index: 1; backdrop-filter: blur(10px);">×</button>
    `;

    // Create navigation tabs
    const nav = document.createElement('div');
    nav.style.cssText = `
      background: linear-gradient(to right, #f8fafc, #f1f5f9);
      border-bottom: 1px solid #e2e8f0;
      padding: 0 32px;
      display: flex;
      gap: 0;
      position: relative;
    `;

    const tabs = [
      { id: 'library', label: 'Prompt Library', icon: '📚', color: '#3B82F6' },
      { id: 'bookmarks', label: 'Bookmarks', icon: '🔖', color: '#EF4444' },
      { id: 'craft', label: 'Prompt Craft', icon: '✨', color: '#F59E0B' }
    ];

    tabs.forEach((tab, index) => {
      const tabButton = document.createElement('button');
      tabButton.innerHTML = `
        <span style="margin-right: 12px; font-size: 18px;">${tab.icon}</span>
        <span style="font-weight: 700; font-size: 15px;">${tab.label}</span>
      `;
      tabButton.style.cssText = `
        background: none;
        border: none;
        padding: 24px 28px;
        cursor: pointer;
        color: #64748b;
        border-bottom: 4px solid transparent;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        position: relative;
        font-family: inherit;
      `;

      tabButton.addEventListener('click', () => {
        this.switchTab(tab.id);
        this.updateTabStyles(nav, tab.id);
      });

      tabButton.addEventListener('mouseenter', () => {
        if (!tabButton.classList.contains('active')) {
          tabButton.style.color = '#374151';
          tabButton.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
          tabButton.style.transform = 'translateY(-2px)';
        }
      });

      tabButton.addEventListener('mouseleave', () => {
        if (!tabButton.classList.contains('active')) {
          tabButton.style.color = '#64748b';
          tabButton.style.backgroundColor = 'transparent';
          tabButton.style.transform = 'translateY(0)';
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
      padding: 40px;
      background: linear-gradient(135deg, #fafbfc 0%, #f4f6f8 100%);
      position: relative;
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
      closeBtn.style.transform = 'scale(1.1)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      closeBtn.style.transform = 'scale(1)';
    });

    this.overlayContainer.addEventListener('click', (e) => {
      if (e.target === this.overlayContainer) {
        this.hideOverlay();
      }
    });

    // Add keyboard shortcut to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlayContainer.style.display === 'flex') {
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
    const nav = this.overlayContainer.querySelector('div[style*="background: linear-gradient(to right, #f8fafc, #f1f5f9)"]');
    this.updateTabStyles(nav, view);
    
    // Render content
    this.renderContent();
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Focus management
    setTimeout(() => {
      const firstFocusable = this.overlayContainer.querySelector('input, button, textarea');
      if (firstFocusable) firstFocusable.focus();
    }, 100);
  }

  hideOverlay() {
    console.log('Hiding overlay');
    this.overlayContainer.style.display = 'none';
    document.body.style.overflow = '';
    
    // Return focus to textarea
    if (this.currentTextarea) {
      this.currentTextarea.focus();
    }
  }

  switchTab(tabId) {
    console.log(`Switching to tab: ${tabId}`);
    this.currentView = tabId;
    this.renderContent();
  }

  updateTabStyles(nav, activeTab) {
    const buttons = nav.querySelectorAll('button');
    const tabs = ['library', 'bookmarks', 'craft'];
    const colors = ['#3B82F6', '#EF4444', '#F59E0B'];
    
    buttons.forEach((button, index) => {
      const isActive = tabs[index] === activeTab;
      button.classList.toggle('active', isActive);
      
      if (isActive) {
        button.style.color = colors[index];
        button.style.borderBottomColor = colors[index];
        button.style.backgroundColor = 'white';
        button.style.boxShadow = `0 4px 12px ${colors[index]}20`;
        button.style.transform = 'translateY(-2px)';
      } else {
        button.style.color = '#64748b';
        button.style.borderBottomColor = 'transparent';
        button.style.backgroundColor = 'transparent';
        button.style.boxShadow = 'none';
        button.style.transform = 'translateY(0)';
      }
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
      <div style="margin-bottom: 40px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px;">
          <div>
            <h2 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 800; color: #1f2937; letter-spacing: -0.5px;">Prompt Library</h2>
            <p style="margin: 0; color: #6b7280; font-size: 18px; font-weight: 400;">Discover and use powerful prompts to enhance your conversations</p>
          </div>
        </div>
        
        <div style="position: relative; margin-bottom: 32px;">
          <input 
            type="text" 
            id="prompt-search" 
            placeholder="Search prompts by title, content, or tags..." 
            style="width: 100%; padding: 20px 24px 20px 60px; border: 2px solid #e5e7eb; border-radius: 20px; font-size: 16px; outline: none; transition: all 0.3s ease; background: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);"
          />
          <svg style="position: absolute; left: 24px; top: 50%; transform: translateY(-50%); color: #9ca3af;" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 28px;" id="prompts-grid">
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
      searchInput.style.borderColor = '#3B82F6';
      searchInput.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05)';
    });

    searchInput.addEventListener('blur', () => {
      searchInput.style.borderColor = '#e5e7eb';
      searchInput.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
    });
  }

  renderBookmarks(container) {
    const bookmarkedPrompts = this.prompts.filter(p => p.isBookmarked);

    container.innerHTML = `
      <div style="margin-bottom: 40px;">
        <h2 style="margin: 0 0 12px 0; font-size: 32px; font-weight: 800; color: #1f2937; letter-spacing: -0.5px;">Bookmarked Prompts</h2>
        <p style="margin: 0; color: #6b7280; font-size: 18px; font-weight: 400;">Your saved prompts for quick access</p>
      </div>
      
      ${bookmarkedPrompts.length === 0 ? `
        <div style="text-align: center; padding: 100px 20px; color: #6b7280;">
          <div style="font-size: 80px; margin-bottom: 32px; opacity: 0.5;">🔖</div>
          <h3 style="margin: 0 0 16px 0; font-size: 28px; color: #374151; font-weight: 700;">No bookmarks yet</h3>
          <p style="margin: 0; font-size: 18px; max-width: 400px; margin: 0 auto; line-height: 1.6;">Bookmark prompts from the library to access them quickly here</p>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 28px;">
          ${bookmarkedPrompts.map(prompt => this.renderPromptCard(prompt)).join('')}
        </div>
      `}
    `;
  }

  renderCraft(container) {
    container.innerHTML = `
      <div style="max-width: 1000px; margin: 0 auto;">
        <div style="margin-bottom: 48px; text-align: center;">
          <h2 style="margin: 0 0 16px 0; font-size: 36px; font-weight: 800; color: #1f2937; letter-spacing: -0.5px;">Prompt Craft</h2>
          <p style="margin: 0; color: #6b7280; font-size: 20px; font-weight: 400; max-width: 600px; margin: 0 auto; line-height: 1.6;">Transform your prompts into powerful, precise instructions that get better results</p>
        </div>

        <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 24px; padding: 40px; margin-bottom: 40px; border: 2px solid #bae6fd; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; right: 0; width: 100px; height: 100px; background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);"></div>
          <h3 style="margin: 0 0 28px 0; font-size: 24px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 16px;">
            🎯 Enhancement Techniques
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
            ${this.getEnhancementTechniques().map(technique => `
              <label style="display: flex; align-items: start; gap: 20px; cursor: pointer; padding: 24px; background: white; border-radius: 20px; border: 2px solid #e2e8f0; transition: all 0.3s ease; position: relative; overflow: hidden;">
                <input type="checkbox" data-technique="${technique.id}" style="margin-top: 6px; transform: scale(1.3); accent-color: #3B82F6;" />
                <div>
                  <div style="font-weight: 700; color: #1e293b; margin-bottom: 8px; font-size: 16px;">${technique.name}</div>
                  <div style="font-size: 14px; color: #64748b; line-height: 1.5;">${technique.description}</div>
                </div>
              </label>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom: 40px;">
          <label style="display: block; font-weight: 700; color: #374151; margin-bottom: 16px; font-size: 18px;">Original Prompt</label>
          <textarea 
            id="original-prompt" 
            placeholder="Enter your original prompt here..."
            style="width: 100%; height: 160px; padding: 24px; border: 2px solid #d1d5db; border-radius: 20px; font-size: 16px; resize: vertical; outline: none; transition: all 0.3s ease; font-family: inherit; line-height: 1.6; background: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);"
          ></textarea>
        </div>

        <div style="text-align: center; margin-bottom: 40px;">
          <button id="improve-prompt" style="background: linear-gradient(135deg, #F59E0B, #D97706); color: white; border: none; padding: 20px 48px; border-radius: 20px; font-size: 18px; font-weight: 700; cursor: pointer; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 16px; box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4); position: relative; overflow: hidden;">
            <span style="font-size: 24px;">✨</span>
            <span>Improve Prompt</span>
          </button>
        </div>

        <div id="improved-prompt-container" style="display: none;">
          <label style="display: block; font-weight: 700; color: #374151; margin-bottom: 16px; font-size: 18px;">Improved Prompt</label>
          <div style="position: relative;">
            <textarea 
              id="improved-prompt" 
              readonly
              style="width: 100%; height: 280px; padding: 24px; border: 2px solid #d1d5db; border-radius: 20px; font-size: 16px; background: #f9fafb; resize: vertical; font-family: inherit; line-height: 1.6; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);"
            ></textarea>
            <div style="position: absolute; top: 20px; right: 20px; display: flex; gap: 12px;">
              <button id="copy-improved" style="background: white; border: 2px solid #d1d5db; padding: 12px 20px; border-radius: 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                📋 Copy
              </button>
              <button id="use-improved" style="background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; padding: 12px 20px; border-radius: 16px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                Use Prompt
              </button>
            </div>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 24px; padding: 40px; margin-top: 40px; border: 2px solid #fbbf24;">
          <h3 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: #92400e; display: flex; align-items: center; gap: 16px;">
            💡 Pro Tips for Better Prompts
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            ${this.getProTips().map(tip => `
              <div style="display: flex; align-items: start; gap: 16px; padding: 20px; background: rgba(255, 255, 255, 0.8); border-radius: 16px;">
                <span style="font-size: 24px; flex-shrink: 0;">${tip.icon}</span>
                <div>
                  <div style="font-weight: 600; color: #92400e; margin-bottom: 6px; font-size: 15px;">${tip.title}</div>
                  <div style="color: #a16207; font-size: 14px; line-height: 1.5;">${tip.description}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Add event listeners for craft functionality
    this.addCraftEventListeners(container);
  }

  addCraftEventListeners(container) {
    const improveBtn = container.querySelector('#improve-prompt');
    const originalTextarea = container.querySelector('#original-prompt');
    const improvedContainer = container.querySelector('#improved-prompt-container');
    const improvedTextarea = container.querySelector('#improved-prompt');
    const copyBtn = container.querySelector('#copy-improved');
    const useBtn = container.querySelector('#use-improved');
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');

    // Focus styles for textarea
    originalTextarea.addEventListener('focus', () => {
      originalTextarea.style.borderColor = '#F59E0B';
      originalTextarea.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05)';
    });

    originalTextarea.addEventListener('blur', () => {
      originalTextarea.style.borderColor = '#d1d5db';
      originalTextarea.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
    });

    // Improve button hover and click
    improveBtn.addEventListener('mouseenter', () => {
      improveBtn.style.transform = 'translateY(-3px) scale(1.02)';
      improveBtn.style.boxShadow = '0 12px 35px rgba(245, 158, 11, 0.5)';
    });

    improveBtn.addEventListener('mouseleave', () => {
      improveBtn.style.transform = 'translateY(0) scale(1)';
      improveBtn.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.4)';
    });

    improveBtn.addEventListener('click', () => {
      const originalText = originalTextarea.value.trim();
      if (!originalText) {
        originalTextarea.focus();
        originalTextarea.style.borderColor = '#EF4444';
        setTimeout(() => {
          originalTextarea.style.borderColor = '#d1d5db';
        }, 2000);
        return;
      }

      const selectedTechniques = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.dataset.technique);

      improveBtn.innerHTML = '<span style="font-size: 24px; animation: spin 1s linear infinite;">⏳</span><span>Improving...</span>';
      improveBtn.disabled = true;

      setTimeout(() => {
        const improved = this.generateImprovedPrompt(originalText, selectedTechniques);
        improvedTextarea.value = improved;
        improvedContainer.style.display = 'block';
        improvedContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        improveBtn.innerHTML = '<span style="font-size: 24px;">✨</span><span>Improve Prompt</span>';
        improveBtn.disabled = false;
      }, 2500);
    });

    // Copy and Use buttons
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(improvedTextarea.value);
      copyBtn.innerHTML = '✅ Copied';
      copyBtn.style.background = '#10B981';
      copyBtn.style.color = 'white';
      copyBtn.style.borderColor = '#10B981';
      
      setTimeout(() => {
        copyBtn.innerHTML = '📋 Copy';
        copyBtn.style.background = 'white';
        copyBtn.style.color = 'inherit';
        copyBtn.style.borderColor = '#d1d5db';
      }, 2000);
    });

    useBtn.addEventListener('click', () => {
      this.insertPrompt(improvedTextarea.value);
      this.hideOverlay();
    });

    // Enhancement technique hover effects
    const labels = container.querySelectorAll('label');
    labels.forEach(label => {
      label.addEventListener('mouseenter', () => {
        label.style.borderColor = '#3B82F6';
        label.style.backgroundColor = '#f8fafc';
        label.style.transform = 'translateY(-2px)';
        label.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.15)';
      });
      
      label.addEventListener('mouseleave', () => {
        label.style.borderColor = '#e2e8f0';
        label.style.backgroundColor = 'white';
        label.style.transform = 'translateY(0)';
        label.style.boxShadow = 'none';
      });
    });
  }

  generateImprovedPrompt(originalText, techniques) {
    const improvements = [];
    
    if (techniques.includes('clarity')) {
      improvements.push('Enhanced clarity and specificity');
    }
    if (techniques.includes('context')) {
      improvements.push('Added relevant background context');
    }
    if (techniques.includes('structure')) {
      improvements.push('Improved structure and organization');
    }
    if (techniques.includes('examples')) {
      improvements.push('Included helpful examples');
    }
    if (techniques.includes('constraints')) {
      improvements.push('Defined clear parameters and constraints');
    }
    if (techniques.includes('persona')) {
      improvements.push('Assigned specific expertise role');
    }

    return `ENHANCED PROMPT:

${originalText}

IMPROVEMENTS APPLIED:
${improvements.map(imp => `• ${imp}`).join('\n')}

OPTIMIZED VERSION:
As an expert assistant with specialized knowledge, please provide a comprehensive and well-structured response to the following request. Ensure your response is clear, actionable, and tailored to the specific context.

Request: ${originalText}

Please structure your response to include:
- Clear, organized sections with appropriate headings
- Specific examples and practical applications where relevant
- Step-by-step guidance when applicable
- Potential considerations or limitations
- Actionable next steps or recommendations

Maintain a professional yet accessible tone throughout your response, and ensure all information provided is accurate and up-to-date.`;
  }

  getEnhancementTechniques() {
    return [
      { id: 'clarity', name: 'Clarity Enhancement', description: 'Make the prompt more specific, clear, and unambiguous' },
      { id: 'context', name: 'Context Addition', description: 'Add relevant background information and situational context' },
      { id: 'structure', name: 'Structure Improvement', description: 'Organize the request with better flow and logical sequence' },
      { id: 'examples', name: 'Example Integration', description: 'Include helpful examples to guide the expected response' },
      { id: 'constraints', name: 'Constraint Definition', description: 'Set clear boundaries, limitations, and parameters' },
      { id: 'persona', name: 'Persona Assignment', description: 'Define the AI\'s role, expertise, and perspective' }
    ];
  }

  getProTips() {
    return [
      { icon: '🎯', title: 'Be Specific', description: 'Use precise language and avoid vague terms' },
      { icon: '📋', title: 'Define Format', description: 'Specify the desired output structure and format' },
      { icon: '🔍', title: 'Add Context', description: 'Provide relevant background information' },
      { icon: '👥', title: 'Know Your Audience', description: 'Tailor the response to your target audience' },
      { icon: '📏', title: 'Set Constraints', description: 'Define length, scope, and other limitations' },
      { icon: '🎭', title: 'Assign Roles', description: 'Give the AI a specific expertise or perspective' }
    ];
  }

  renderPromptCard(prompt) {
    return `
      <div class="prompt-card" style="
        background: white;
        border: 2px solid #f1f5f9;
        border-radius: 24px;
        padding: 28px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        position: relative;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        overflow: hidden;
      " data-prompt='${JSON.stringify(prompt).replace(/'/g, "&#39;")}'>
        <div style="position: absolute; top: 0; right: 0; width: 80px; height: 80px; background: linear-gradient(135deg, ${this.getCategoryColor(prompt.category)}20, transparent); border-radius: 0 24px 0 80px;"></div>
        
        <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 20px; position: relative; z-index: 1;">
          <h3 style="margin: 0; font-size: 20px; font-weight: 800; color: #1f2937; line-height: 1.3; flex: 1; padding-right: 16px;">${prompt.title}</h3>
          <button class="bookmark-btn" style="
            background: none;
            border: none;
            color: ${prompt.isBookmarked ? '#f59e0b' : '#d1d5db'};
            cursor: pointer;
            padding: 8px;
            border-radius: 12px;
            transition: all 0.3s ease;
            flex-shrink: 0;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="${prompt.isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
          </button>
        </div>
        
        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 15px; line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          ${prompt.content}
        </p>
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <span style="
            background: ${this.getCategoryColor(prompt.category)};
            color: white;
            padding: 8px 20px;
            border-radius: 24px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.5px;
          ">${prompt.category}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span style="font-size: 14px; color: #9ca3af; font-weight: 600;">${prompt.usage} uses</span>
          </div>
        </div>
        
        <div style="display: flex; flex-wrap: gap: 10px; margin-bottom: 24px;">
          ${prompt.tags.slice(0, 3).map(tag => `
            <span style="background: #f3f4f6; color: #6b7280; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">#${tag}</span>
          `).join('')}
          ${prompt.tags.length > 3 ? `<span style="color: #9ca3af; font-size: 12px; font-weight: 600;">+${prompt.tags.length - 3} more</span>` : ''}
        </div>
        
        <button class="use-prompt-btn" style="
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
          position: relative;
          overflow: hidden;
        ">
          <span style="position: relative; z-index: 1;">Use Prompt</span>
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
        card.style.borderColor = '#667eea';
        card.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.2)';
        card.style.transform = 'translateY(-8px) scale(1.02)';
      });

      card.addEventListener('mouseleave', () => {
        card.style.borderColor = '#f1f5f9';
        card.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.06)';
        card.style.transform = 'translateY(0) scale(1)';
      });

      // Use prompt button
      const useBtn = card.querySelector('.use-prompt-btn');
      useBtn.addEventListener('mouseenter', () => {
        useBtn.style.background = 'linear-gradient(135deg, #5a67d8 0%, #667eea 100%)';
        useBtn.style.transform = 'translateY(-2px)';
        useBtn.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
      });

      useBtn.addEventListener('mouseleave', () => {
        useBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        useBtn.style.transform = 'translateY(0)';
        useBtn.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
      });

      useBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptData = JSON.parse(card.getAttribute('data-prompt'));
        
        // Add click animation
        useBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
          useBtn.style.transform = 'scale(1)';
        }, 150);
        
        this.insertPrompt(promptData.content);
        this.hideOverlay();
      });

      // Bookmark button
      const bookmarkBtn = card.querySelector('.bookmark-btn');
      bookmarkBtn.addEventListener('mouseenter', () => {
        bookmarkBtn.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
        bookmarkBtn.style.transform = 'scale(1.1)';
      });

      bookmarkBtn.addEventListener('mouseleave', () => {
        bookmarkBtn.style.backgroundColor = 'transparent';
        bookmarkBtn.style.transform = 'scale(1)';
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
      
      // Update current textarea reference
      this.currentTextarea = textarea;
      
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
      },
      {
        id: '6',
        title: 'Market Research Framework',
        content: 'Create a comprehensive market research framework for [INDUSTRY/PRODUCT]. Include primary and secondary research methods, data collection strategies, and analysis techniques.',
        category: 'Research',
        tags: ['market-research', 'analysis', 'framework'],
        isBookmarked: false,
        usage: 24
      }
    ];
  }
}

// Add enhanced CSS animations and styles
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(40px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  #prompt-manager-overlay * {
    box-sizing: border-box;
  }

  #prompt-manager-overlay .prompt-card:hover .use-prompt-btn {
    background: linear-gradient(135deg, #5a67d8 0%, #667eea 100%) !important;
    transform: translateY(-2px);
  }

  #prompt-manager-overlay .bookmark-btn:hover {
    color: #f59e0b !important;
  }

  /* Enhanced scrollbar styling */
  #prompt-manager-overlay ::-webkit-scrollbar {
    width: 12px;
  }

  #prompt-manager-overlay ::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 6px;
  }

  #prompt-manager-overlay ::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #cbd5e1, #94a3b8);
    border-radius: 6px;
    border: 2px solid #f1f5f9;
  }

  #prompt-manager-overlay ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #94a3b8, #64748b);
  }

  /* Button hover effects */
  #prompt-manager-overlay button {
    position: relative;
    overflow: hidden;
  }

  #prompt-manager-overlay button:before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  #prompt-manager-overlay button:active:before {
    width: 300px;
    height: 300px;
  }
`;
document.head.appendChild(style);

// Initialize the prompt manager
console.log('Initializing Enhanced ChatGPT Prompt Manager...');
new ChatGPTPromptManager();
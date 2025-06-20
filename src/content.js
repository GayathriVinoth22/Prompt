// Content script for ChatGPT integration - Overlay Style
class ChatGPTPromptManager {
  constructor() {
    this.isInjected = false;
    this.overlayContainer = null;
    this.currentView = 'library';
    this.prompts = [];
    this.init();
  }

  init() {
    console.log("✅ ChatGPT Prompt Manager loaded!");
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.injectPromptManager());
    } else {
      this.injectPromptManager();
    }
  }

  async injectPromptManager() {
    if (this.isInjected) return;

    // Wait for ChatGPT interface to load
    await this.waitForChatGPTInterface();
    
    // Load prompts from storage
    await this.loadPrompts();
    
    // Inject input icons
    this.injectInputIcons();
    
    // Create overlay container
    this.createOverlayContainer();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'insertPrompt') {
        this.insertPrompt(request.prompt);
      }
    });

    this.isInjected = true;
  }

  waitForChatGPTInterface() {
    return new Promise((resolve) => {
      const checkForInterface = () => {
        const textarea = document.querySelector('[data-testid="composer-text-input"]') ||
                        document.querySelector('textarea[placeholder*="Message"]');
        if (textarea) {
          resolve();
        } else {
          setTimeout(checkForInterface, 500);
        }
      };
      checkForInterface();
    });
  }

  async loadPrompts() {
    try {
      const result = await chrome.storage.local.get(['prompts']);
      this.prompts = result.prompts || this.getDefaultPrompts();
    } catch (error) {
      console.error('Error loading prompts:', error);
      this.prompts = this.getDefaultPrompts();
    }
  }

  injectInputIcons() {
    const findAndInjectIcons = () => {
      // Look for the ChatGPT input container
      const inputContainer = document.querySelector('[data-testid="composer-text-input"]')?.closest('div[class*="relative"]') ||
                           document.querySelector('form')?.querySelector('div[class*="relative"]');
      
      if (!inputContainer || document.querySelector('#prompt-manager-icons')) {
        setTimeout(findAndInjectIcons, 1000);
        return;
      }

      // Create icons container
      const iconsContainer = document.createElement('div');
      iconsContainer.id = 'prompt-manager-icons';
      iconsContainer.style.cssText = `
        position: absolute;
        right: 50px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        gap: 8px;
        z-index: 1000;
        align-items: center;
      `;

      // Craft icon
      const craftIcon = this.createIcon('craft', `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      `, 'Prompt Craft');

      // Library icon
      const libraryIcon = this.createIcon('library', `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      `, 'Prompt Library');

      // Bookmark icon
      const bookmarkIcon = this.createIcon('bookmarks', `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
        </svg>
      `, 'Bookmarks');

      iconsContainer.appendChild(libraryIcon);
      iconsContainer.appendChild(craftIcon);
      iconsContainer.appendChild(bookmarkIcon);

      // Insert icons into the input container
      inputContainer.style.position = 'relative';
      inputContainer.appendChild(iconsContainer);
    };

    findAndInjectIcons();
  }

  createIcon(type, svgContent, tooltip) {
    const icon = document.createElement('button');
    icon.innerHTML = svgContent;
    icon.title = tooltip;
    icon.style.cssText = `
      background: transparent;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    icon.addEventListener('mouseenter', () => {
      icon.style.color = '#10B981';
      icon.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
    });

    icon.addEventListener('mouseleave', () => {
      icon.style.color = '#6b7280';
      icon.style.backgroundColor = 'transparent';
    });

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
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
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    `;

    // Create main panel
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: white;
      border-radius: 16px;
      width: 90vw;
      max-width: 1200px;
      height: 80vh;
      max-height: 800px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      position: relative;
    `;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: between;
    `;

    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 32px; height: 32px; background: rgba(255, 255, 255, 0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          📝
        </div>
        <div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 600;">ChatGPT Prompt Manager</h1>
          <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Enhance your ChatGPT experience</p>
        </div>
      </div>
      <button id="close-overlay" style="background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; margin-left: auto;">×</button>
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
        <span style="margin-right: 8px;">${tab.icon}</span>
        ${tab.label}
      `;
      tabButton.style.cssText = `
        background: none;
        border: none;
        padding: 16px 20px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: #6b7280;
        border-bottom: 2px solid transparent;
        transition: all 0.2s ease;
      `;

      tabButton.addEventListener('click', () => {
        this.switchTab(tab.id);
        this.updateTabStyles(nav, tab.id);
      });

      nav.appendChild(tabButton);
    });

    // Create content area
    const content = document.createElement('div');
    content.id = 'overlay-content';
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    `;

    // Assemble panel
    panel.appendChild(header);
    panel.appendChild(nav);
    panel.appendChild(content);
    this.overlayContainer.appendChild(panel);

    // Add to document
    document.body.appendChild(this.overlayContainer);

    // Add event listeners
    header.querySelector('#close-overlay').addEventListener('click', () => this.hideOverlay());
    this.overlayContainer.addEventListener('click', (e) => {
      if (e.target === this.overlayContainer) {
        this.hideOverlay();
      }
    });

    // Initialize with library view
    this.updateTabStyles(nav, 'library');
  }

  showOverlay(view = 'library') {
    this.currentView = view;
    this.overlayContainer.style.display = 'flex';
    this.overlayContainer.style.animation = 'fadeIn 0.3s ease-out';
    
    // Update tab styles
    const nav = this.overlayContainer.querySelector('div[style*="background: #f8fafc"]');
    this.updateTabStyles(nav, view);
    
    // Render content
    this.renderContent();
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  hideOverlay() {
    this.overlayContainer.style.animation = 'fadeOut 0.3s ease-in';
    setTimeout(() => {
      this.overlayContainer.style.display = 'none';
      document.body.style.overflow = '';
    }, 300);
  }

  switchTab(tabId) {
    this.currentView = tabId;
    this.renderContent();
  }

  updateTabStyles(nav, activeTab) {
    const buttons = nav.querySelectorAll('button');
    const tabs = ['library', 'bookmarks', 'craft'];
    
    buttons.forEach((button, index) => {
      const isActive = tabs[index] === activeTab;
      button.style.color = isActive ? '#10B981' : '#6b7280';
      button.style.borderBottomColor = isActive ? '#10B981' : 'transparent';
      button.style.backgroundColor = isActive ? 'white' : 'transparent';
    });
  }

  renderContent() {
    const content = document.getElementById('overlay-content');
    
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
  }

  renderLibrary(container) {
    const bookmarkedPrompts = this.prompts.filter(p => p.isBookmarked);
    const allPrompts = this.prompts;

    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <div style="position: relative; margin-bottom: 20px;">
          <input 
            type="text" 
            id="prompt-search" 
            placeholder="Search prompts..." 
            style="width: 100%; padding: 12px 16px 12px 44px; border: 1px solid #d1d5db; border-radius: 12px; font-size: 14px; outline: none; transition: border-color 0.2s ease;"
          />
          <svg style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #9ca3af;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;" id="prompts-grid">
        ${allPrompts.map(prompt => this.renderPromptCard(prompt)).join('')}
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
      searchInput.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
    });

    searchInput.addEventListener('blur', () => {
      searchInput.style.borderColor = '#d1d5db';
      searchInput.style.boxShadow = 'none';
    });
  }

  renderBookmarks(container) {
    const bookmarkedPrompts = this.prompts.filter(p => p.isBookmarked);

    container.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #1f2937;">Bookmarked Prompts</h2>
        <p style="margin: 0; color: #6b7280;">Your saved prompts for quick access</p>
      </div>
      
      ${bookmarkedPrompts.length === 0 ? `
        <div style="text-align: center; padding: 60px 20px; color: #6b7280;">
          <div style="font-size: 48px; margin-bottom: 16px;">🔖</div>
          <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #374151;">No bookmarks yet</h3>
          <p style="margin: 0;">Bookmark prompts from the library to access them quickly</p>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
          ${bookmarkedPrompts.map(prompt => this.renderPromptCard(prompt)).join('')}
        </div>
      `}
    `;
  }

  renderCraft(container) {
    container.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto;">
        <div style="margin-bottom: 32px; text-align: center;">
          <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 600; color: #1f2937;">Prompt Craft</h2>
          <p style="margin: 0; color: #6b7280; font-size: 16px;">Transform your prompts into powerful, precise instructions</p>
        </div>

        <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 8px;">
            🎯 Enhancement Techniques
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            <label style="display: flex; align-items: start; gap: 12px; cursor: pointer; padding: 12px; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
              <input type="checkbox" style="margin-top: 2px;" />
              <div>
                <div style="font-weight: 500; color: #1e293b; margin-bottom: 4px;">Clarity Enhancement</div>
                <div style="font-size: 13px; color: #64748b;">Make the prompt more specific and clear</div>
              </div>
            </label>
            <label style="display: flex; align-items: start; gap: 12px; cursor: pointer; padding: 12px; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
              <input type="checkbox" style="margin-top: 2px;" />
              <div>
                <div style="font-weight: 500; color: #1e293b; margin-bottom: 4px;">Context Addition</div>
                <div style="font-size: 13px; color: #64748b;">Add relevant background information</div>
              </div>
            </label>
            <label style="display: flex; align-items: start; gap: 12px; cursor: pointer; padding: 12px; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
              <input type="checkbox" style="margin-top: 2px;" />
              <div>
                <div style="font-weight: 500; color: #1e293b; margin-bottom: 4px;">Example Integration</div>
                <div style="font-size: 13px; color: #64748b;">Include helpful examples</div>
              </div>
            </label>
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 8px;">Original Prompt</label>
          <textarea 
            id="original-prompt" 
            placeholder="Enter your original prompt here..."
            style="width: 100%; height: 120px; padding: 16px; border: 1px solid #d1d5db; border-radius: 12px; font-size: 14px; resize: vertical; outline: none; transition: border-color 0.2s ease;"
          ></textarea>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <button id="improve-prompt" style="background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s ease; display: inline-flex; align-items: center; gap: 8px;">
            <span>✨</span>
            Improve Prompt
          </button>
        </div>

        <div id="improved-prompt-container" style="display: none;">
          <label style="display: block; font-weight: 500; color: #374151; margin-bottom: 8px;">Improved Prompt</label>
          <div style="position: relative;">
            <textarea 
              id="improved-prompt" 
              readonly
              style="width: 100%; height: 200px; padding: 16px; border: 1px solid #d1d5db; border-radius: 12px; font-size: 14px; background: #f9fafb; resize: vertical;"
            ></textarea>
            <button id="copy-improved" style="position: absolute; top: 12px; right: 12px; background: white; border: 1px solid #d1d5db; padding: 8px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 12px;">
              📋 Copy
            </button>
            <button id="use-improved" style="position: absolute; top: 12px; right: 80px; background: #10B981; color: white; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;">
              Use Prompt
            </button>
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
      originalTextarea.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
    });

    originalTextarea.addEventListener('blur', () => {
      originalTextarea.style.borderColor = '#d1d5db';
      originalTextarea.style.boxShadow = 'none';
    });

    // Improve button hover
    improveBtn.addEventListener('mouseenter', () => {
      improveBtn.style.transform = 'translateY(-2px)';
    });

    improveBtn.addEventListener('mouseleave', () => {
      improveBtn.style.transform = 'translateY(0)';
    });

    improveBtn.addEventListener('click', () => {
      const originalText = originalTextarea.value.trim();
      if (!originalText) return;

      improveBtn.innerHTML = '<span>⏳</span> Improving...';
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
        improveBtn.innerHTML = '<span>✨</span> Improve Prompt';
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
  }

  renderPromptCard(prompt) {
    return `
      <div class="prompt-card" style="
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 20px;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
      " data-prompt='${JSON.stringify(prompt).replace(/'/g, "&#39;")}'>
        <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937; line-height: 1.4; flex: 1;">${prompt.title}</h3>
          <button class="bookmark-btn" style="
            background: none;
            border: none;
            color: ${prompt.isBookmarked ? '#f59e0b' : '#d1d5db'};
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            margin-left: 8px;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${prompt.isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
            </svg>
          </button>
        </div>
        
        <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          ${prompt.content}
        </p>
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <span style="
            background: ${this.getCategoryColor(prompt.category)};
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
          ">${prompt.category}</span>
          <span style="font-size: 12px; color: #9ca3af;">${prompt.usage} uses</span>
        </div>
        
        <div style="display: flex; flex-wrap: gap: 6px; margin-bottom: 16px;">
          ${prompt.tags.slice(0, 3).map(tag => `
            <span style="background: #f3f4f6; color: #6b7280; padding: 2px 8px; border-radius: 12px; font-size: 11px;">${tag}</span>
          `).join('')}
          ${prompt.tags.length > 3 ? `<span style="color: #9ca3af; font-size: 11px;">+${prompt.tags.length - 3}</span>` : ''}
        </div>
        
        <button class="use-prompt-btn" style="
          width: 100%;
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
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
        card.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.15)';
        card.style.transform = 'translateY(-2px)';
      });

      card.addEventListener('mouseleave', () => {
        card.style.borderColor = '#e5e7eb';
        card.style.boxShadow = 'none';
        card.style.transform = 'translateY(0)';
      });

      // Use prompt button
      const useBtn = card.querySelector('.use-prompt-btn');
      useBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const promptData = JSON.parse(card.getAttribute('data-prompt'));
        this.insertPrompt(promptData.content);
        this.hideOverlay();
      });

      // Bookmark button
      const bookmarkBtn = card.querySelector('.bookmark-btn');
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
    this.addPromptCardListeners();
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
    // Find ChatGPT's textarea
    const textarea = document.querySelector('[data-testid="composer-text-input"]') || 
                    document.querySelector('textarea[placeholder*="Message"]');
    
    if (textarea) {
      // Set the value
      textarea.value = promptContent;
      textarea.textContent = promptContent;
      
      // Trigger input events
      const inputEvent = new Event('input', { bubbles: true });
      const changeEvent = new Event('change', { bubbles: true });
      
      textarea.dispatchEvent(inputEvent);
      textarea.dispatchEvent(changeEvent);
      
      // Focus and set cursor
      textarea.focus();
      textarea.setSelectionRange(promptContent.length, promptContent.length);
      
      // Trigger any additional events that ChatGPT might need
      textarea.dispatchEvent(new Event('keyup', { bubbles: true }));
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
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.95);
    }
  }

  #prompt-manager-overlay .prompt-card:hover .use-prompt-btn {
    background: linear-gradient(135deg, #059669, #047857) !important;
    transform: translateY(-1px);
  }

  #prompt-manager-overlay .bookmark-btn:hover {
    color: #f59e0b !important;
  }
`;
document.head.appendChild(style);

// Initialize the prompt manager
new ChatGPTPromptManager();
// Enhanced Content script for ChatGPT integration - Focused Overlays
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
      this.showFocusedOverlay(type);
    });

    return icon;
  }

  showFocusedOverlay(type) {
    console.log(`Showing focused overlay for: ${type}`);
    
    // Remove any existing overlay
    this.hideOverlay();
    
    // Create focused overlay based on type
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
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  createLibraryOverlay() {
    this.overlayContainer = this.createBaseOverlay('📚', 'Prompt Library', '#3B82F6');
    
    const content = this.overlayContainer?.querySelector('#overlay-content');
    if (!content) return;
    
    content.innerHTML = `
      <div style="margin-bottom: 32px;">
        <div style="position: relative; margin-bottom: 24px;">
          <input 
            type="text" 
            id="prompt-search" 
            placeholder="Search prompts by title, content, or tags..." 
            style="width: 100%; padding: 16px 20px 16px 52px; border: 2px solid #e5e7eb; border-radius: 16px; font-size: 16px; outline: none; transition: all 0.2s ease; background: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);"
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

    this.addSearchFunctionality();
    this.addPromptCardListeners();
    this.showOverlay();
  }

  createBookmarksOverlay() {
    const bookmarkedPrompts = this.prompts.filter(p => p.isBookmarked);
    this.overlayContainer = this.createBaseOverlay('🔖', 'Bookmarked Prompts', '#EF4444');
    
    const content = this.overlayContainer?.querySelector('#overlay-content');
    if (!content) return;
    
    content.innerHTML = `
      ${bookmarkedPrompts.length === 0 ? `
        <div style="text-align: center; padding: 80px 20px; color: #6b7280;">
          <div style="font-size: 64px; margin-bottom: 24px;">🔖</div>
          <h3 style="margin: 0 0 12px 0; font-size: 24px; color: #374151; font-weight: 700;">No bookmarks yet</h3>
          <p style="margin: 0; font-size: 16px; max-width: 400px; margin: 0 auto; line-height: 1.6;">Bookmark prompts from the library to access them quickly here</p>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px;">
          ${bookmarkedPrompts.map(prompt => this.renderPromptCard(prompt)).join('')}
        </div>
      `}
    `;

    this.addPromptCardListeners();
    this.showOverlay();
  }

  createCraftOverlay() {
    this.overlayContainer = this.createBaseOverlay('✨', 'Prompt Craft', '#F59E0B');
    
    const content = this.overlayContainer?.querySelector('#overlay-content');
    if (!content) return;
    
    content.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 20px; padding: 32px; margin-bottom: 32px; border: 1px solid #bae6fd;">
          <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 12px;">
            🎯 Enhancement Techniques
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            ${this.getEnhancementTechniques().map(technique => `
              <label style="display: flex; align-items: start; gap: 16px; cursor: pointer; padding: 16px; background: white; border-radius: 16px; border: 2px solid #e2e8f0; transition: all 0.2s ease;">
                <input type="checkbox" data-technique="${technique.id}" style="margin-top: 4px; transform: scale(1.2); accent-color: #F59E0B;" />
                <div>
                  <div style="font-weight: 600; color: #1e293b; margin-bottom: 6px; font-size: 15px;">${technique.name}</div>
                  <div style="font-size: 14px; color: #64748b; line-height: 1.4;">${technique.description}</div>
                </div>
              </label>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom: 32px;">
          <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 12px; font-size: 16px;">Original Prompt</label>
          <textarea 
            id="original-prompt" 
            placeholder="Enter your original prompt here..."
            style="width: 100%; height: 140px; padding: 20px; border: 2px solid #d1d5db; border-radius: 16px; font-size: 16px; resize: vertical; outline: none; transition: all 0.2s ease; font-family: inherit; line-height: 1.5; background: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);"
          ></textarea>
        </div>

        <div style="text-align: center; margin-bottom: 32px;">
          <button id="improve-prompt" style="background: linear-gradient(135deg, #F59E0B, #D97706); color: white; border: none; padding: 18px 40px; border-radius: 16px; font-size: 18px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 12px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
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
              style="width: 100%; height: 240px; padding: 20px; border: 2px solid #d1d5db; border-radius: 16px; font-size: 16px; background: #f9fafb; resize: vertical; font-family: inherit; line-height: 1.5; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);"
            ></textarea>
            <div style="position: absolute; top: 16px; right: 16px; display: flex; gap: 8px;">
              <button id="copy-improved" style="background: white; border: 2px solid #d1d5db; padding: 10px 16px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; transition: all 0.2s ease;">
                📋 Copy
              </button>
              <button id="use-improved" style="background: #F59E0B; color: white; border: none; padding: 10px 16px; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s ease;">
                Use Prompt
              </button>
            </div>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 20px; padding: 32px; margin-top: 32px; border: 1px solid #fbbf24;">
          <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #92400e; display: flex; align-items: center; gap: 12px;">
            💡 Pro Tips for Better Prompts
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            ${this.getProTips().map(tip => `
              <div style="display: flex; align-items: start; gap: 12px; padding: 16px; background: rgba(255, 255, 255, 0.8); border-radius: 12px;">
                <span style="font-size: 20px; flex-shrink: 0;">${tip.icon}</span>
                <div>
                  <div style="font-weight: 600; color: #92400e; margin-bottom: 4px; font-size: 14px;">${tip.title}</div>
                  <div style="color: #a16207; font-size: 13px; line-height: 1.4;">${tip.description}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    this.addCraftEventListeners();
    this.showOverlay();
  }

  createBaseOverlay(icon, title, color) {
    try {
      // Create overlay backdrop
      const overlay = document.createElement('div');
      overlay.id = 'prompt-manager-overlay';
      overlay.style.cssText = `
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
        max-width: 1200px;
        height: 90vh;
        max-height: 800px;
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
        background: linear-gradient(135deg, ${color}, ${color}dd);
        color: white;
        padding: 24px 32px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 24px 24px 0 0;
        position: relative;
        overflow: hidden;
      `;

      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 16px; position: relative; z-index: 1;">
          <div style="width: 40px; height: 40px; background: rgba(255, 255, 255, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; backdrop-filter: blur(10px);">
            ${icon}
          </div>
          <div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${title}</h1>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 400;">Enhance your ChatGPT experience</p>
          </div>
        </div>
        <button id="close-overlay" style="background: rgba(255, 255, 255, 0.2); border: none; color: white; width: 40px; height: 40px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: all 0.3s ease; position: relative; z-index: 1; backdrop-filter: blur(10px);">×</button>
      `;

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
      panel.appendChild(content);
      overlay.appendChild(panel);

      // Add to document
      document.body.appendChild(overlay);

      // Add event listeners
      const closeBtn = header.querySelector('#close-overlay');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.hideOverlay());
        closeBtn.addEventListener('mouseenter', () => {
          closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
          closeBtn.style.transform = 'scale(1.1)';
        });
        closeBtn.addEventListener('mouseleave', () => {
          closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
          closeBtn.style.transform = 'scale(1)';
        });
      }

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.hideOverlay();
        }
      });

      // Add keyboard shortcut to close
      const handleKeydown = (e) => {
        if (e.key === 'Escape' && overlay.style.display === 'flex') {
          this.hideOverlay();
          document.removeEventListener('keydown', handleKeydown);
        }
      };
      document.addEventListener('keydown', handleKeydown);

      return overlay;
    } catch (error) {
      console.error('Error creating base overlay:', error);
      return null;
    }
  }

  showOverlay() {
    if (this.overlayContainer) {
      this.overlayContainer.style.display = 'flex';
      
      // Focus management
      setTimeout(() => {
        const firstFocusable = this.overlayContainer.querySelector('input, button, textarea');
        if (firstFocusable) firstFocusable.focus();
      }, 100);
    }
  }

  hideOverlay() {
    console.log('Hiding overlay');
    if (this.overlayContainer) {
      this.overlayContainer.remove();
      this.overlayContainer = null;
    }
    document.body.style.overflow = '';
    
    // Return focus to textarea
    if (this.currentTextarea) {
      this.currentTextarea.focus();
    }
  }

  addSearchFunctionality() {
    const searchInput = document.querySelector('#prompt-search');
    if (!searchInput) return;

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

  addCraftEventListeners() {
    const improveBtn = document.querySelector('#improve-prompt');
    const originalTextarea = document.querySelector('#original-prompt');
    const improvedContainer = document.querySelector('#improved-prompt-container');
    const improvedTextarea = document.querySelector('#improved-prompt');
    const copyBtn = document.querySelector('#copy-improved');
    const useBtn = document.querySelector('#use-improved');
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');

    if (!improveBtn || !originalTextarea) return;

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
      improveBtn.style.transform = 'translateY(-2px)';
      improveBtn.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
    });

    improveBtn.addEventListener('mouseleave', () => {
      improveBtn.style.transform = 'translateY(0)';
      improveBtn.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
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

      improveBtn.innerHTML = '<span style="font-size: 20px; animation: spin 1s linear infinite;">⏳</span> Improving...';
      improveBtn.disabled = true;

      setTimeout(() => {
        const improved = this.generateImprovedPrompt(originalText, selectedTechniques);
        if (improvedTextarea) {
          improvedTextarea.value = improved;
        }
        if (improvedContainer) {
          improvedContainer.style.display = 'block';
          improvedContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        improveBtn.innerHTML = '<span style="font-size: 20px;">✨</span> Improve Prompt';
        improveBtn.disabled = false;
      }, 2000);
    });

    // Copy and Use buttons
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (improvedTextarea) {
          navigator.clipboard.writeText(improvedTextarea.value);
          copyBtn.innerHTML = '✅ Copied';
          setTimeout(() => {
            copyBtn.innerHTML = '📋 Copy';
          }, 2000);
        }
      });
    }

    if (useBtn) {
      useBtn.addEventListener('click', () => {
        if (improvedTextarea) {
          this.insertPrompt(improvedTextarea.value);
          this.hideOverlay();
        }
      });
    }

    // Enhancement technique hover effects
    const labels = document.querySelectorAll('label');
    labels.forEach(label => {
      label.addEventListener('mouseenter', () => {
        label.style.borderColor = '#F59E0B';
        label.style.backgroundColor = '#fef3c7';
      });
      label.addEventListener('mouseleave', () => {
        label.style.borderColor = '#e2e8f0';
        label.style.backgroundColor = 'white';
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
      { id: 'clarity', name: 'Clarity Enhancement', description: 'Make the prompt more specific and clear' },
      { id: 'context', name: 'Context Addition', description: 'Add relevant background information' },
      { id: 'structure', name: 'Structure Improvement', description: 'Organize the request better' },
      { id: 'examples', name: 'Example Integration', description: 'Include helpful examples' },
      { id: 'constraints', name: 'Constraint Definition', description: 'Set clear boundaries and limitations' },
      { id: 'persona', name: 'Persona Assignment', description: 'Define the AI\'s role or expertise' }
    ];
  }

  getProTips() {
    return [
      { icon: '🎯', title: 'Be Specific', description: 'Use precise language and avoid vague terms' },
      { icon: '📋', title: 'Define Format', description: 'Specify the desired output structure' },
      { icon: '🔍', title: 'Add Context', description: 'Provide relevant background information' },
      { icon: '👥', title: 'Know Your Audience', description: 'Tailor the response to your target audience' },
      { icon: '📏', title: 'Set Constraints', description: 'Define length, scope, and limitations' },
      { icon: '🎭', title: 'Assign Roles', description: 'Give the AI a specific expertise' }
    ];
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
    // Add null check for document and querySelectorAll
    if (!document) return;
    
    const promptCards = document.querySelectorAll('.prompt-card');
    if (!promptCards || promptCards.length === 0) return;

    // Add event listeners to prompt cards
    promptCards.forEach(card => {
      if (!card) return;

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
      if (useBtn) {
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
          try {
            const promptData = JSON.parse(card.getAttribute('data-prompt'));
            this.insertPrompt(promptData.content);
            this.hideOverlay();
          } catch (error) {
            console.error('Error parsing prompt data:', error);
          }
        });
      }

      // Bookmark button
      const bookmarkBtn = card.querySelector('.bookmark-btn');
      if (bookmarkBtn) {
        bookmarkBtn.addEventListener('mouseenter', () => {
          bookmarkBtn.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
        });

        bookmarkBtn.addEventListener('mouseleave', () => {
          bookmarkBtn.style.backgroundColor = 'transparent';
        });

        bookmarkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          try {
            const promptData = JSON.parse(card.getAttribute('data-prompt'));
            this.toggleBookmark(promptData.id);
          } catch (error) {
            console.error('Error parsing prompt data:', error);
          }
        });
      }
    });
  }

  toggleBookmark(promptId) {
    this.prompts = this.prompts.map(p => 
      p.id === promptId ? { ...p, isBookmarked: !p.isBookmarked } : p
    );
    
    // Save to storage
    try {
      chrome.storage.local.set({ prompts: this.prompts });
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
    
    // Re-render current view if it's bookmarks
    if (this.overlayContainer) {
      const titleElement = this.overlayContainer.querySelector('h1');
      if (titleElement && titleElement.textContent === 'Bookmarked Prompts') {
        this.hideOverlay();
        this.createBookmarksOverlay();
      }
    }
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
      try {
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
      } catch (error) {
        console.error('Error inserting prompt:', error);
      }
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
      transform: translateY(30px) scale(0.95);
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

// Initialize the prompt manager with error handling
try {
  console.log('Initializing Focused ChatGPT Prompt Manager...');
  new ChatGPTPromptManager();
} catch (error) {
  console.error('Error initializing ChatGPT Prompt Manager:', error);
}
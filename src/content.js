// Content script for ChatGPT integration
class ChatGPTPromptManager {
  constructor() {
    this.isInjected = false;
    this.promptPanel = null;
    this.init();
  }

  init() {
    // Wait for ChatGPT to load
    console.log("✅ content.js has been loaded!");
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.injectPromptManager());
    } else {
      this.injectPromptManager();
    }
  }

  injectPromptManager() {
    if (this.isInjected) return;

    // Create the prompt manager button
    this.createPromptButton();
    
    // Create the prompt panel
    this.createPromptPanel();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'togglePanel') {
        this.togglePanel();
      } else if (request.action === 'insertPrompt') {
        this.insertPrompt(request.prompt);
      }
    });

    this.isInjected = true;
  }

  createPromptButton() {
    // Find ChatGPT's input area
    console.log("gfdsjdfj");
    const tryInject = () => {
      const input = document.querySelector('[data-testid="composer-text-input"]');
      if (!input) {
        setTimeout(tryInject, 1000);
        return;
      }
    
      if (document.querySelector('#prompt-manager-btn')) return; // avoid duplicates
    
      // inject button
      this.injectFloatingButton(input);
    };
    tryInject();

    // Create floating prompt manager button
    const promptButton = document.createElement('button');
    promptButton.id = 'prompt-manager-btn';
    promptButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 12l2 2 4-4"/>
        <path d="M21 12c.552 0 1-.448 1-1V5c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v6c0 .552.448 1 1 1h18z"/>
        <path d="M21 19c.552 0 1-.448 1-1v-2c0-.552-.448-1-1-1H3c-.552 0-1 .448-1 1v2c0 .552.448 1 1 1h18z"/>
      </svg>
    `;
    promptButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      border: none;
      border-radius: 12px;
      width: 48px;
      height: 48px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    promptButton.addEventListener('mouseenter', () => {
      promptButton.style.transform = 'scale(1.1)';
      promptButton.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
    });

    promptButton.addEventListener('mouseleave', () => {
      promptButton.style.transform = 'scale(1)';
      promptButton.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
    });

    promptButton.addEventListener('click', () => this.togglePanel());

    document.body.appendChild(promptButton);
  }

  createPromptPanel() {
    // Create the main panel container
    this.promptPanel = document.createElement('div');
    this.promptPanel.id = 'prompt-manager-panel';
    this.promptPanel.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      width: 400px;
      height: 600px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    `;

    // Create panel content
    this.promptPanel.innerHTML = `
      <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; background: linear-gradient(135deg, #f8fafc, #f1f5f9);">
        <div style="display: flex; align-items: center; justify-content: between; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">Prompt Manager</h3>
          <button id="close-panel" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280; margin-left: auto;">×</button>
        </div>
        <div style="position: relative;">
          <input 
            type="text" 
            id="prompt-search" 
            placeholder="Search prompts..." 
            style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none;"
          />
        </div>
      </div>
      
      <div style="flex: 1; overflow-y: auto; padding: 16px;" id="prompts-container">
        <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
          <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
          <p>Loading prompts...</p>
        </div>
      </div>
      
      <div style="padding: 16px; border-top: 1px solid #e5e7eb; background: #f9fafb;">
        <button id="open-full-manager" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer;">
          Open Full Manager
        </button>
      </div>
    `;

    // Add event listeners
    this.promptPanel.querySelector('#close-panel').addEventListener('click', () => this.hidePanel());
    this.promptPanel.querySelector('#open-full-manager').addEventListener('click', () => this.openFullManager());
    this.promptPanel.querySelector('#prompt-search').addEventListener('input', (e) => this.searchPrompts(e.target.value));

    document.body.appendChild(this.promptPanel);
    
    // Load prompts
    this.loadPrompts();
  }

  togglePanel() {
    if (this.promptPanel.style.display === 'none') {
      this.showPanel();
    } else {
      this.hidePanel();
    }
  }

  showPanel() {
    this.promptPanel.style.display = 'flex';
    this.promptPanel.style.animation = 'slideInRight 0.3s ease-out';
  }

  hidePanel() {
    this.promptPanel.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      this.promptPanel.style.display = 'none';
    }, 300);
  }

  async loadPrompts() {
    try {
      const result = await chrome.storage.local.get(['prompts']);
      const prompts = result.prompts || this.getDefaultPrompts();
      this.renderPrompts(prompts);
    } catch (error) {
      console.error('Error loading prompts:', error);
      this.renderPrompts(this.getDefaultPrompts());
    }
  }

  renderPrompts(prompts) {
    const container = this.promptPanel.querySelector('#prompts-container');
    
    if (prompts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
          <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
          <p>No prompts found</p>
        </div>
      `;
      return;
    }

    container.innerHTML = prompts.map(prompt => `
      <div class="prompt-item" style="
        margin-bottom: 12px; 
        padding: 16px; 
        border: 1px solid #e5e7eb; 
        border-radius: 12px; 
        cursor: pointer; 
        transition: all 0.2s ease;
        background: white;
      " data-prompt='${JSON.stringify(prompt).replace(/'/g, "&#39;")}'>
        <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 8px;">
          <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: #1f2937; line-height: 1.4;">${prompt.title}</h4>
          <span style="
            background: ${this.getCategoryColor(prompt.category)}; 
            color: white; 
            padding: 2px 8px; 
            border-radius: 12px; 
            font-size: 11px; 
            font-weight: 500;
            white-space: nowrap;
            margin-left: 8px;
          ">${prompt.category}</span>
        </div>
        <p style="margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${prompt.content}
        </p>
        <div style="margin-top: 8px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; gap: 4px;">
            ${prompt.tags.slice(0, 2).map(tag => `
              <span style="background: #f3f4f6; color: #6b7280; padding: 2px 6px; border-radius: 6px; font-size: 10px;">${tag}</span>
            `).join('')}
          </div>
          <span style="font-size: 11px; color: #9ca3af;">${prompt.usage} uses</span>
        </div>
      </div>
    `).join('');

    // Add click listeners to prompt items
    container.querySelectorAll('.prompt-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.borderColor = '#10B981';
        item.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.borderColor = '#e5e7eb';
        item.style.boxShadow = 'none';
      });
      
      item.addEventListener('click', () => {
        const promptData = JSON.parse(item.getAttribute('data-prompt'));
        this.insertPrompt(promptData.content);
        this.hidePanel();
      });
    });
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
                    document.querySelector('textarea[placeholder*="Message"]') ||
                    document.querySelector('#prompt-textarea');
    
    if (textarea) {
      // Set the value
      textarea.value = promptContent;
      textarea.textContent = promptContent;
      
      // Trigger input events to make ChatGPT recognize the change
      const inputEvent = new Event('input', { bubbles: true });
      const changeEvent = new Event('change', { bubbles: true });
      
      textarea.dispatchEvent(inputEvent);
      textarea.dispatchEvent(changeEvent);
      
      // Focus the textarea
      textarea.focus();
      
      // Set cursor to end
      textarea.setSelectionRange(promptContent.length, promptContent.length);
    }
  }

  searchPrompts(query) {
    // This would filter prompts based on the search query
    // For now, we'll reload all prompts
    this.loadPrompts();
  }

  openFullManager() {
    chrome.runtime.sendMessage({ action: 'openFullManager' });
  }

  getDefaultPrompts() {
    return [
      {
        id: '1',
        title: 'Blog Post Outline Creator',
        content: 'Create a comprehensive blog post outline for the topic: [TOPIC]. Include main headings, subheadings, key points to cover, and suggested word count for each section.',
        category: 'Writing',
        tags: ['blog', 'content', 'outline'],
        usage: 45
      },
      {
        id: '2',
        title: 'Code Security Audit',
        content: 'Review the following code for security vulnerabilities, performance issues, and best practices. Provide specific recommendations for improvement:\n\n[CODE]',
        category: 'Code Review',
        tags: ['security', 'audit', 'best-practices'],
        usage: 32
      },
      {
        id: '3',
        title: 'SWOT Analysis Generator',
        content: 'Create a detailed SWOT analysis for [COMPANY/PRODUCT]. Analyze Strengths, Weaknesses, Opportunities, and Threats with specific examples and actionable insights.',
        category: 'Business',
        tags: ['swot', 'analysis', 'strategy'],
        usage: 28
      }
    ];
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

window.ChatGPTPromptManager = ChatGPTPromptManager;


// Initialize the prompt manager
new ChatGPTPromptManager();


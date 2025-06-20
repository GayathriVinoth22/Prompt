// Popup script
document.addEventListener('DOMContentLoaded', async () => {
  // Load stats
  await loadStats();
  
  // Check if we're on ChatGPT
  checkChatGPTStatus();
});

async function loadStats() {
  try {
    const result = await chrome.storage.local.get(['prompts']);
    const prompts = result.prompts || [];
    
    document.getElementById('total-prompts').textContent = prompts.length;
    document.getElementById('bookmarked-prompts').textContent = 
      prompts.filter(p => p.isBookmarked).length;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function checkChatGPTStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isChatGPT = tab.url.includes('chat.openai.com') || tab.url.includes('chatgpt.com');
    
    const statusCard = document.querySelector('.status-card');
    const statusIcon = statusCard.querySelector('.status-icon');
    const statusText = statusCard.querySelector('.status-text');
    const statusSubtext = statusCard.querySelector('.status-subtext');
    
    if (isChatGPT) {
      statusIcon.textContent = '✅';
      statusText.textContent = 'Extension Active';
      statusSubtext.textContent = 'Icons added to ChatGPT input';
      statusCard.style.borderColor = '#10B981';
      statusCard.style.backgroundColor = '#f0fdf4';
    } else {
      statusIcon.textContent = '⚠️';
      statusText.textContent = 'Not on ChatGPT';
      statusSubtext.textContent = 'Visit chat.openai.com to use';
      statusCard.style.borderColor = '#f59e0b';
      statusCard.style.backgroundColor = '#fffbeb';
    }
  } catch (error) {
    console.error('Error checking ChatGPT status:', error);
  }
}
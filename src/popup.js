// Popup script
document.addEventListener('DOMContentLoaded', async () => {
  // Load stats
  await loadStats();
  
  // Add event listeners
  document.getElementById('toggle-panel').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'togglePanel' });
      window.close();
    });
  });
  
  document.getElementById('open-manager').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openFullManager' });
    window.close();
  });
  
  document.getElementById('open-full-manager').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'openFullManager' });
    window.close();
  });
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
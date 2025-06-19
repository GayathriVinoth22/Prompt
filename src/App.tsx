import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import PromptLibrary from './components/PromptLibrary';
import ImageGallery from './components/ImageGallery';
import PromptCraft from './components/PromptCraft';
import { ChatMessage, Prompt, ChatSession, ChatFolder } from './types';
import { mockCategories, mockPrompts, mockImages } from './data/mockData';

function App() {
  const [activeTab, setActiveTab] = useState('library'); // Changed default to library
  const [prompts, setPrompts] = useState(mockPrompts);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatFolders, setChatFolders] = useState<ChatFolder[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isExtension, setIsExtension] = useState(false);

  // Check if running as Chrome extension
  useEffect(() => {
    const checkExtension = () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        setIsExtension(true);
        // Sync prompts with Chrome storage
        syncWithChromeStorage();
      }
    };
    checkExtension();
  }, []);

  const syncWithChromeStorage = async () => {
    if (!isExtension) return;
    
    try {
      // Load prompts from Chrome storage
      const result = await chrome.storage.local.get(['prompts', 'chatSessions', 'chatFolders']);
      
      if (result.prompts) {
        setPrompts(result.prompts);
      } else {
        // Save default prompts to Chrome storage
        await chrome.storage.local.set({ prompts: mockPrompts });
      }
      
      if (result.chatSessions) {
        const sessions = result.chatSessions.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })),
          folderIds: session.folderIds || []
        }));
        setChatSessions(sessions);
      }
      
      if (result.chatFolders) {
        const folders = result.chatFolders.map((folder: any) => ({
          ...folder,
          createdAt: new Date(folder.createdAt)
        }));
        setChatFolders(folders);
      }
    } catch (error) {
      console.error('Error syncing with Chrome storage:', error);
    }
  };

  // Load chat data from localStorage on mount (fallback for non-extension use)
  useEffect(() => {
    if (isExtension) return; // Skip localStorage if running as extension
    
    const savedSessions = localStorage.getItem('chatSessions');
    const savedFolders = localStorage.getItem('chatFolders');
    
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions).map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })),
        folderIds: session.folderIds || []
      }));
      setChatSessions(sessions);
    }
    
    if (savedFolders) {
      const folders = JSON.parse(savedFolders).map((folder: any) => ({
        ...folder,
        createdAt: new Date(folder.createdAt)
      }));
      setChatFolders(folders);
    }
  }, [isExtension]);

  // Save to appropriate storage
  const saveToStorage = async (key: string, data: any) => {
    if (isExtension) {
      try {
        await chrome.storage.local.set({ [key]: data });
      } catch (error) {
        console.error('Error saving to Chrome storage:', error);
      }
    } else {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  // Save chat data whenever it changes
  useEffect(() => {
    saveToStorage('chatSessions', chatSessions);
  }, [chatSessions, isExtension]);

  useEffect(() => {
    saveToStorage('chatFolders', chatFolders);
  }, [chatFolders, isExtension]);

  useEffect(() => {
    saveToStorage('prompts', prompts);
  }, [prompts, isExtension]);

  useEffect(() => {
    const handleAddMessage = (event: CustomEvent) => {
      if (currentChatId) {
        setChatSessions(prev => prev.map(session => 
          session.id === currentChatId 
            ? { ...session, messages: [...session.messages, event.detail], updatedAt: new Date() }
            : session
        ));
      }
    };

    window.addEventListener('addMessage', handleAddMessage as EventListener);
    return () => window.removeEventListener('addMessage', handleAddMessage as EventListener);
  }, [currentChatId]);

  const getCurrentMessages = (): ChatMessage[] => {
    if (!currentChatId) return [];
    const currentSession = chatSessions.find(session => session.id === currentChatId);
    return currentSession?.messages || [];
  };

  const getCurrentChat = (): ChatSession | null => {
    if (!currentChatId) return null;
    return chatSessions.find(session => session.id === currentChatId) || null;
  };

  const generateChatTitle = (firstMessage: string): string => {
    const words = firstMessage.split(' ').slice(0, 6);
    return words.join(' ') + (firstMessage.split(' ').length > 6 ? '...' : '');
  };

  const handleSendMessage = (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      content: `I understand you're asking about: "${content}". This is a simulated response. In a real implementation, this would connect to ChatGPT's API to provide actual AI responses.`,
      role: 'assistant',
      timestamp: new Date(),
    };

    if (currentChatId) {
      // Update existing chat
      setChatSessions(prev => prev.map(session => 
        session.id === currentChatId 
          ? { 
              ...session, 
              messages: [...session.messages, userMessage, assistantMessage],
              updatedAt: new Date()
            }
          : session
      ));
    } else {
      // Create new chat
      const newChatId = Date.now().toString();
      const newSession: ChatSession = {
        id: newChatId,
        title: generateChatTitle(content),
        messages: [userMessage, assistantMessage],
        createdAt: new Date(),
        updatedAt: new Date(),
        folderIds: []
      };
      
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentChatId(newChatId);
    }
  };

  const handleImprovePrompt = async (prompt: string) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const improvedPrompt = `Enhanced version: ${prompt}\n\nI've improved your prompt by making it more specific and actionable. Here are the key enhancements:\n- Added clear context\n- Defined expected output format\n- Included relevant constraints`;
        
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          content: improvedPrompt,
          role: 'assistant',
          timestamp: new Date(),
        };
        
        if (currentChatId) {
          setChatSessions(prev => prev.map(session => 
            session.id === currentChatId 
              ? { ...session, messages: [...session.messages, assistantMessage], updatedAt: new Date() }
              : session
          ));
        }
        
        resolve(improvedPrompt);
      }, 1500);
    });
  };

  const handleUsePrompt = (prompt: Prompt) => {
    setPrompts(prev => prev.map(p => 
      p.id === prompt.id ? { ...p, usage: p.usage + 1 } : p
    ));
    
    if (isExtension) {
      // If running as extension, send prompt to ChatGPT
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'insertPrompt', 
          prompt: prompt.content 
        });
      });
    } else {
      // If running standalone, switch to chat
      setActiveTab('chat');
      handleSendMessage(prompt.content);
    }
  };

  const handleBookmarkPrompt = (promptId: string) => {
    setPrompts(prev => prev.map(p => 
      p.id === promptId ? { ...p, isBookmarked: !p.isBookmarked } : p
    ));
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setActiveTab('chat');
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setActiveTab('chat');
  };

  const handleDeleteChat = (chatId: string) => {
    setChatSessions(prev => prev.filter(session => session.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
    
    // Update folder chat counts
    updateFolderCounts();
  };

  const handleCreateFolder = (name: string, color?: string) => {
    const newFolder: ChatFolder = {
      id: Date.now().toString(),
      name,
      createdAt: new Date(),
      chatCount: 0,
      color: color || '#6B7280'
    };
    setChatFolders(prev => [newFolder, ...prev]);
    return newFolder.id;
  };

  const handleAddToFolder = (chatId: string, folderId: string) => {
    setChatSessions(prev => prev.map(session => 
      session.id === chatId 
        ? { 
            ...session, 
            folderIds: session.folderIds?.includes(folderId) 
              ? session.folderIds 
              : [...(session.folderIds || []), folderId]
          }
        : session
    ));
    updateFolderCounts();
  };

  const handleRemoveFromFolder = (chatId: string, folderId: string) => {
    setChatSessions(prev => prev.map(session => 
      session.id === chatId 
        ? { 
            ...session, 
            folderIds: session.folderIds?.filter(id => id !== folderId) || []
          }
        : session
    ));
    updateFolderCounts();
  };

  const handleRenameChat = (chatId: string, newTitle: string) => {
    setChatSessions(prev => prev.map(session => 
      session.id === chatId ? { ...session, title: newTitle } : session
    ));
  };

  const updateFolderCounts = () => {
    setChatFolders(prev => prev.map(folder => ({
      ...folder,
      chatCount: chatSessions.filter(session => 
        session.folderIds?.includes(folder.id)
      ).length
    })));
  };

  const handleNavigateToTab = (tab: string) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <ChatInterface
            messages={getCurrentMessages()}
            currentChat={getCurrentChat()}
            chatFolders={chatFolders}
            onSendMessage={handleSendMessage}
            onImprovePrompt={handleImprovePrompt}
            onCreateFolder={handleCreateFolder}
            onAddToFolder={handleAddToFolder}
            onRemoveFromFolder={handleRemoveFromFolder}
            onNavigateToTab={handleNavigateToTab}
          />
        );
      case 'library':
        return (
          <PromptLibrary
            prompts={prompts}
            categories={mockCategories}
            onUsePrompt={handleUsePrompt}
            onBookmarkPrompt={handleBookmarkPrompt}
          />
        );
      case 'bookmarks':
        return (
          <PromptLibrary
            prompts={prompts.filter(p => p.isBookmarked)}
            categories={mockCategories}
            onUsePrompt={handleUsePrompt}
            onBookmarkPrompt={handleBookmarkPrompt}
          />
        );
      case 'gallery':
        return <ImageGallery images={mockImages} categories={mockCategories} />;
      case 'craft':
        return <PromptCraft />;
      default:
        return (
          <PromptLibrary
            prompts={prompts}
            categories={mockCategories}
            onUsePrompt={handleUsePrompt}
            onBookmarkPrompt={handleBookmarkPrompt}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Extension Header */}
      {isExtension && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-[#10B981] to-[#059669] text-white px-6 py-3 z-50 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-lg">📝</span>
              </div>
              <div>
                <h1 className="font-semibold text-lg">ChatGPT Prompt Manager</h1>
                <p className="text-sm opacity-90">Manage and enhance your prompts</p>
              </div>
            </div>
            <div className="text-sm opacity-90">
              Chrome Extension Mode
            </div>
          </div>
        </div>
      )}
      
      <Sidebar
        categories={mockCategories}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewChat={handleNewChat}
        chatSessions={chatSessions}
        chatFolders={chatFolders}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onCreateFolder={handleCreateFolder}
        onAddToFolder={handleAddToFolder}
        onRemoveFromFolder={handleRemoveFromFolder}
        onRenameChat={handleRenameChat}
      />
      <main className={`flex-1 flex flex-col overflow-hidden ${isExtension ? 'mt-16' : ''}`}>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
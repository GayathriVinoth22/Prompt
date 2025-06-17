import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import PromptLibrary from './components/PromptLibrary';
import ImageGallery from './components/ImageGallery';
import PromptCraft from './components/PromptCraft';
import { ChatMessage, Prompt, ChatSession, ChatFolder } from './types';
import { mockCategories, mockPrompts, mockImages } from './data/mockData';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [prompts, setPrompts] = useState(mockPrompts);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatFolders, setChatFolders] = useState<ChatFolder[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  // Load chat data from localStorage on mount
  useEffect(() => {
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
        folderIds: session.folderIds || [] // Ensure folderIds exists
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
  }, []);

  // Save chat data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
  }, [chatSessions]);

  useEffect(() => {
    localStorage.setItem('chatFolders', JSON.stringify(chatFolders));
  }, [chatFolders]);

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
    
    setActiveTab('chat');
    handleSendMessage(prompt.content);
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
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
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
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
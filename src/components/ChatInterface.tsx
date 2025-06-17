import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, ThumbsUp, ThumbsDown, RotateCcw, Wand2, Sparkles, X, Bookmark, Save, Plus, Folder, FolderPlus, FolderMinus, Search, ChevronUp, ChevronDown, Settings, Image, Library, User, FolderOpen, Download, Edit2, Trash2, Power, ChevronRight, MessageSquare } from 'lucide-react';
import { ChatMessage, ChatSession, ChatFolder } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  currentChat: ChatSession | null;
  chatFolders: ChatFolder[];
  onSendMessage: (message: string) => void;
  onImprovePrompt: (prompt: string) => void;
  onCreateFolder: (name: string, color?: string) => string;
  onAddToFolder: (chatId: string, folderId: string) => void;
  onRemoveFromFolder: (chatId: string, folderId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

interface CraftOptions {
  length: string;
  platform: string;
  tone: string;
}

interface SavePromptData {
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export default function ChatInterface({ 
  messages, 
  currentChat,
  chatFolders,
  onSendMessage, 
  onImprovePrompt,
  onCreateFolder,
  onAddToFolder,
  onRemoveFromFolder,
  onNavigateToTab
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [showCraftPopup, setShowCraftPopup] = useState(false);
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [showFolderPopup, setShowFolderPopup] = useState(false);
  const [showFolderManagement, setShowFolderManagement] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isCrafting, setIsCrafting] = useState(false);
  const [promptToSave, setPromptToSave] = useState('');
  const [bookmarkedPrompts, setBookmarkedPrompts] = useState<string[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [disabledFolders, setDisabledFolders] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  const [craftOptions, setCraftOptions] = useState<CraftOptions>({
    length: 'medium',
    platform: 'general',
    tone: 'professional'
  });

  const [saveData, setSaveData] = useState<SavePromptData>({
    title: '',
    content: '',
    category: 'Writing',
    tags: []
  });

  const defaultCategories = ['Writing', 'Code Review', 'Business', 'Education', 'Marketing', 'Research'];
  const allCategories = [...defaultCategories, ...customCategories];

  const folderColors = [
    '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4',
    '#84CC16', '#F97316', '#EC4899', '#6366F1', '#14B8A6', '#F43F5E'
  ];

  // Filter folders based on search query
  const filteredFolders = chatFolders.filter(folder =>
    folder.name.toLowerCase().includes(folderSearchQuery.toLowerCase())
  );

  // Settings menu items - All 6 options in vertical layout
  const settingsMenuItems = [
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: Bookmark
    },
    {
      id: 'library',
      label: 'Library',
      icon: Library
    },
    {
      id: 'gallery',
      label: 'Gallery',
      icon: Image
    },
    {
      id: 'my-prompts',
      label: 'My Prompts',
      icon: User
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings
    },
    {
      id: 'folders',
      label: 'Folders',
      icon: FolderOpen
    }
  ];

  // Load custom categories from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('customCategories');
    if (saved) {
      setCustomCategories(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettingsMenu]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleImprove = async () => {
    if (inputValue.trim()) {
      setIsImproving(true);
      
      // Simulate improvement process
      setTimeout(() => {
        const improvedPrompt = `Enhanced version: ${inputValue}

I've improved your prompt by making it more specific and actionable. Here are the key enhancements:
- Added clear context and background information
- Defined expected output format and structure
- Included relevant constraints and parameters
- Specified target audience and tone
- Added examples to guide the response

Please review the enhanced prompt above and modify as needed before sending.`;

        // Set the improved prompt directly in the input field
        setInputValue(improvedPrompt);
        setIsImproving(false);
        
        // Focus the textarea and adjust height
        if (textareaRef.current) {
          textareaRef.current.focus();
          adjustTextareaHeight();
        }
      }, 1500);
    }
  };

  const handleBookmark = (content: string) => {
    setBookmarkedPrompts(prev => {
      if (prev.includes(content)) {
        return prev.filter(p => p !== content);
      } else {
        return [...prev, content];
      }
    });
  };

  const handleSavePrompt = (content: string) => {
    setPromptToSave(content);
    setSaveData(prev => ({ ...prev, content, title: content.slice(0, 50) + '...' }));
    setShowSavePopup(true);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !allCategories.includes(newCategoryName.trim())) {
      const updatedCategories = [...customCategories, newCategoryName.trim()];
      setCustomCategories(updatedCategories);
      localStorage.setItem('customCategories', JSON.stringify(updatedCategories));
      setSaveData(prev => ({ ...prev, category: newCategoryName.trim() }));
      setNewCategoryName('');
      setShowNewCategory(false);
    }
  };

  const handleSaveConfirm = () => {
    // Here you would typically save to your backend/storage
    console.log('Saving prompt:', saveData);
    
    // Simulate saving
    const savedPrompts = JSON.parse(localStorage.getItem('savedPrompts') || '[]');
    const newPrompt = {
      ...saveData,
      id: Date.now().toString(),
      createdAt: new Date(),
      usage: 0
    };
    savedPrompts.push(newPrompt);
    localStorage.setItem('savedPrompts', JSON.stringify(savedPrompts));
    
    setShowSavePopup(false);
    setSaveData({ title: '', content: '', category: 'Writing', tags: [] });
  };

  const handleCreateNewFolder = () => {
    if (newFolderName.trim()) {
      const randomColor = folderColors[Math.floor(Math.random() * folderColors.length)];
      const folderId = onCreateFolder(newFolderName.trim(), randomColor);
      if (currentChat) {
        onAddToFolder(currentChat.id, folderId);
      }
      setNewFolderName('');
      setShowCreateFolder(false);
    }
  };

  const handleAddToExistingFolder = (folderId: string) => {
    if (currentChat) {
      onAddToFolder(currentChat.id, folderId);
    }
  };

  const handleRemoveFromExistingFolder = (folderId: string) => {
    if (currentChat) {
      onRemoveFromFolder(currentChat.id, folderId);
    }
  };

  const isInFolder = (folderId: string) => {
    return currentChat?.folderIds?.includes(folderId) || false;
  };

  // Navigation functions
  const scrollToTop = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleSettingsMenuClick = (itemId: string) => {
    setShowSettingsMenu(false);
    
    // Handle different menu items
    switch (itemId) {
      case 'bookmarks':
        if (onNavigateToTab) onNavigateToTab('bookmarks');
        break;
      case 'library':
        if (onNavigateToTab) onNavigateToTab('library');
        break;
      case 'gallery':
        if (onNavigateToTab) onNavigateToTab('gallery');
        break;
      case 'my-prompts':
        // Navigate to user's saved prompts
        console.log('Navigate to My Prompts');
        break;
      case 'settings':
        // Open settings panel
        console.log('Open Settings');
        break;
      case 'folders':
        // Open folder management
        setShowFolderManagement(true);
        break;
      default:
        break;
    }
  };

  const handleCraft = async () => {
    if (inputValue.trim()) {
      setIsCrafting(true);
      setShowCraftPopup(false);
      
      // Simulate crafting with the selected options
      setTimeout(() => {
        const craftedPrompt = `CRAFTED PROMPT FOR ${craftOptions.platform.toUpperCase()}:

Original: ${inputValue}

Optimized for:
• Platform: ${craftOptions.platform}
• Length: ${craftOptions.length}
• Tone: ${craftOptions.tone}

Enhanced Version:
${getCraftedPrompt(inputValue, craftOptions)}

This prompt has been specifically tailored for ${craftOptions.platform} with a ${craftOptions.tone} tone and ${craftOptions.length} length format.`;

        // Set the crafted prompt directly in the input field
        setInputValue(craftedPrompt);
        setIsCrafting(false);
        
        // Focus the textarea and adjust height
        if (textareaRef.current) {
          textareaRef.current.focus();
          adjustTextareaHeight();
        }
      }, 2000);
    }
  };

  const getCraftedPrompt = (original: string, options: CraftOptions) => {
    const platformSpecific = {
      twitter: "Create a Twitter thread that's engaging and shareable",
      linkedin: "Write a professional LinkedIn post that drives engagement",
      instagram: "Craft an Instagram caption with relevant hashtags",
      facebook: "Create a Facebook post that encourages community interaction",
      tiktok: "Write a TikTok script that's trendy and engaging",
      youtube: "Create a YouTube video description that's SEO optimized",
      general: "Create content that works across multiple platforms"
    };

    const lengthGuide = {
      short: "Keep it concise and punchy (under 100 words)",
      medium: "Provide moderate detail (100-300 words)",
      long: "Create comprehensive content (300+ words)"
    };

    const toneGuide = {
      professional: "maintaining a professional and authoritative voice",
      casual: "using a friendly and conversational tone",
      humorous: "incorporating humor and wit appropriately",
      inspirational: "creating an uplifting and motivational message",
      educational: "focusing on teaching and informing the audience"
    };

    return `${platformSpecific[options.platform as keyof typeof platformSpecific]}. ${lengthGuide[options.length as keyof typeof lengthGuide]}, ${toneGuide[options.tone as keyof typeof toneGuide]}.

Topic: ${original}

Please structure the content with:
- Hook/attention grabber
- Main message/value proposition  
- Call to action
${options.platform === 'instagram' ? '- Relevant hashtags' : ''}
${options.platform === 'linkedin' ? '- Professional insights' : ''}
${options.platform === 'twitter' ? '- Thread structure if needed' : ''}`;
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  // Folder management functions
  const toggleFolderExpansion = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleRenameFolder = (folderId: string, currentName: string) => {
    setEditingFolder(folderId);
    setEditFolderName(currentName);
  };

  const confirmRenameFolder = () => {
    if (editingFolder && editFolderName.trim()) {
      // Here you would update the folder name in your state/backend
      console.log('Renaming folder:', editingFolder, 'to:', editFolderName);
    }
    setEditingFolder(null);
    setEditFolderName('');
  };

  const toggleFolderStatus = (folderId: string) => {
    const newDisabled = new Set(disabledFolders);
    if (newDisabled.has(folderId)) {
      newDisabled.delete(folderId);
    } else {
      newDisabled.add(folderId);
    }
    setDisabledFolders(newDisabled);
  };

  const handleExportFolder = (folderId: string) => {
    // Here you would implement folder export functionality
    console.log('Exporting folder:', folderId);
  };

  const handleDeleteFolder = (folderId: string) => {
    // Here you would implement folder deletion
    console.log('Deleting folder:', folderId);
  };

  // Get chats in a specific folder
  const getChatsInFolder = (folderId: string) => {
    // This would come from your chat sessions data
    // For now, returning mock data
    return [
      { id: '1', title: 'Sample Chat 1' },
      { id: '2', title: 'Sample Chat 2' },
    ];
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Header with Folder Management */}
      {currentChat && (
        <div className="border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{currentChat.title}</h2>
              {currentChat.folderIds && currentChat.folderIds.length > 0 && (
                <div className="flex items-center gap-1">
                  {currentChat.folderIds.map(folderId => {
                    const folder = chatFolders.find(f => f.id === folderId);
                    return folder ? (
                      <span
                        key={folderId}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: folder.color }}
                      >
                        <Folder size={10} className="mr-1" />
                        {folder.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowFolderPopup(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Manage folders"
            >
              <FolderPlus size={16} />
              Folders
            </button>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      {messages.length > 0 && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 flex flex-col gap-2">
          <button
            onClick={scrollToTop}
            className="p-2 bg-white border border-gray-300 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            title="Go to top of chat"
          >
            <ChevronUp size={16} className="text-gray-600" />
          </button>
          <button
            onClick={scrollToBottom}
            className="p-2 bg-white border border-gray-300 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
            title="Go to bottom of chat"
          >
            <ChevronDown size={16} className="text-gray-600" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-[#19C37D] rounded-full flex items-center justify-center mb-4">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">How can I help you today?</h2>
            <p className="text-gray-600 max-w-md">
              Start by typing a prompt, or use our prompt improvement tools to enhance your queries.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-[#19C37D]' : 'bg-[#AB68FF]'
              }`}>
                <span className="text-white text-sm font-medium">
                  {message.role === 'user' ? 'U' : 'AI'}
                </span>
              </div>
              <div className="flex-1 space-y-2">
                <div className="prose max-w-none">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">{message.content}</p>
                </div>
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => navigator.clipboard.writeText(message.content)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Copy"
                    >
                      <Copy size={14} className="text-gray-500" />
                    </button>
                    <button 
                      onClick={() => handleBookmark(message.content)}
                      className={`p-1 hover:bg-gray-100 rounded transition-colors ${
                        bookmarkedPrompts.includes(message.content) ? 'text-yellow-500' : 'text-gray-500'
                      }`}
                      title="Bookmark"
                    >
                      <Bookmark size={14} fill={bookmarkedPrompts.includes(message.content) ? 'currentColor' : 'none'} />
                    </button>
                    <button 
                      onClick={() => handleSavePrompt(message.content)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Save to library"
                    >
                      <Save size={14} className="text-gray-500" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <ThumbsUp size={14} className="text-gray-500" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <ThumbsDown size={14} className="text-gray-500" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <RotateCcw size={14} className="text-gray-500" />
                    </button>
                  </div>
                )}
                {message.role === 'user' && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleBookmark(message.content)}
                      className={`p-1 hover:bg-gray-100 rounded transition-colors ${
                        bookmarkedPrompts.includes(message.content) ? 'text-yellow-500' : 'text-gray-500'
                      }`}
                      title="Bookmark"
                    >
                      <Bookmark size={14} fill={bookmarkedPrompts.includes(message.content) ? 'currentColor' : 'none'} />
                    </button>
                    <button 
                      onClick={() => handleSavePrompt(message.content)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Save to library"
                    >
                      <Save size={14} className="text-gray-500" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          {/* Settings Menu - Above Input */}
          <div className="flex justify-end mb-3">
            <div className="relative" ref={settingsMenuRef}>
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                title="Quick access menu"
              >
                <Settings size={18} />
              </button>
              
              {showSettingsMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50 animate-in slide-in-from-bottom-2 duration-200 min-w-[140px]">
                  {settingsMenuItems.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => handleSettingsMenuClick(item.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        <item.icon size={16} className="text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Message ChatGPT..."
              className="w-full px-4 py-3 pr-40 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent min-h-[52px] max-h-32"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="absolute right-2 top-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleBookmark(inputValue)}
                disabled={!inputValue.trim()}
                className={`p-2 transition-colors disabled:opacity-50 ${
                  bookmarkedPrompts.includes(inputValue) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                }`}
                title="Bookmark prompt"
              >
                <Bookmark size={16} fill={bookmarkedPrompts.includes(inputValue) ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                onClick={() => handleSavePrompt(inputValue)}
                disabled={!inputValue.trim()}
                className="p-2 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                title="Save to library"
              >
                <Save size={16} />
              </button>
              <button
                type="button"
                onClick={() => setShowCraftPopup(true)}
                disabled={!inputValue.trim() || isCrafting}
                className="p-2 text-gray-400 hover:text-[#AB68FF] transition-colors disabled:opacity-50"
                title="Craft for social media"
              >
                <Sparkles size={16} className={isCrafting ? 'animate-pulse' : ''} />
              </button>
              <button
                type="button"
                onClick={handleImprove}
                disabled={!inputValue.trim() || isImproving}
                className="p-2 text-gray-400 hover:text-[#19C37D] transition-colors disabled:opacity-50"
                title="Improve prompt"
              >
                <Wand2 size={16} className={isImproving ? 'animate-spin' : ''} />
              </button>
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="p-2 bg-[#19C37D] text-white rounded-lg hover:bg-[#16A870] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex justify-center mt-2">
            <p className="text-xs text-gray-500">
              ChatGPT can make mistakes. Consider checking important information.
            </p>
          </div>
        </form>
      </div>

      {/* Folder Management Popup - BIGGER SIZE */}
      {showFolderManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                    <FolderOpen size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900">Folder Management</h3>
                    <p className="text-gray-600 text-sm">Organize and manage your chat folders</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFolderManagement(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {chatFolders.length > 0 ? (
                <div className="space-y-6">
                  {chatFolders.map(folder => {
                    const isDisabled = disabledFolders.has(folder.id);
                    const isExpanded = expandedFolders.has(folder.id);
                    const chatsInFolder = getChatsInFolder(folder.id);
                    
                    return (
                      <div
                        key={folder.id}
                        className={`border rounded-2xl p-6 transition-all ${
                          isDisabled ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-6 h-6 rounded-full flex-shrink-0"
                              style={{ backgroundColor: folder.color }}
                            />
                            {editingFolder === folder.id ? (
                              <input
                                type="text"
                                value={editFolderName}
                                onChange={(e) => setEditFolderName(e.target.value)}
                                onBlur={confirmRenameFolder}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') confirmRenameFolder();
                                  if (e.key === 'Escape') {
                                    setEditingFolder(null);
                                    setEditFolderName('');
                                  }
                                }}
                                className="text-xl font-semibold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <div>
                                <h4 className="text-xl font-semibold text-gray-900">{folder.name}</h4>
                                <p className="text-sm text-gray-500">{folder.chatCount} chats</p>
                              </div>
                            )}
                            {isDisabled && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Disabled
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleExportFolder(folder.id)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Export folder"
                            >
                              <Download size={18} />
                            </button>
                            <button
                              onClick={() => handleRenameFolder(folder.id, folder.name)}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Rename folder"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => toggleFolderStatus(folder.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                isDisabled 
                                  ? 'text-green-600 hover:bg-green-50' 
                                  : 'text-orange-600 hover:bg-orange-50'
                              }`}
                              title={isDisabled ? 'Enable folder' : 'Disable folder'}
                            >
                              <Power size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteFolder(folder.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete folder"
                            >
                              <Trash2 size={18} />
                            </button>
                            <button
                              onClick={() => toggleFolderExpansion(folder.id)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              <ChevronRight 
                                size={18} 
                                className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <h5 className="text-sm font-medium text-gray-700 mb-3">Folder Contents</h5>
                            {chatsInFolder.length > 0 ? (
                              <div className="space-y-2">
                                {chatsInFolder.map(chat => (
                                  <div
                                    key={chat.id}
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                  >
                                    <MessageSquare size={16} className="text-gray-500" />
                                    <span className="text-sm text-gray-700">{chat.title}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-gray-500">
                                <Folder size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No items in this folder</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <FolderOpen size={64} className="mx-auto mb-4 opacity-50" />
                  <h4 className="text-xl font-medium text-gray-900 mb-2">No folders created yet</h4>
                  <p className="text-gray-600">Create your first folder to organize your chats</p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-gray-100">
              <button
                onClick={() => setShowFolderManagement(false)}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Management Popup */}
      {showFolderPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Manage Folders</h3>
                <button
                  onClick={() => {
                    setShowFolderPopup(false);
                    setFolderSearchQuery('');
                    setShowCreateFolder(false);
                    setNewFolderName('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {/* Create New Folder */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Create New Folder</h4>
                  {!showCreateFolder ? (
                    <button
                      onClick={() => setShowCreateFolder(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Plus size={16} />
                      Add New Folder
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder name..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateNewFolder();
                          if (e.key === 'Escape') {
                            setShowCreateFolder(false);
                            setNewFolderName('');
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateNewFolder}
                          disabled={!newFolderName.trim()}
                          className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Create & Add
                        </button>
                        <button
                          onClick={() => {
                            setShowCreateFolder(false);
                            setNewFolderName('');
                          }}
                          className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Existing Folders */}
                {chatFolders.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Existing Folders</h4>
                      <span className="text-xs text-gray-500">
                        {filteredFolders.length} of {chatFolders.length}
                      </span>
                    </div>
                    
                    {/* Search Input */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search folders..."
                        value={folderSearchQuery}
                        onChange={(e) => setFolderSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {filteredFolders.length > 0 ? (
                        filteredFolders.map(folder => (
                          <div
                            key={folder.id}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: folder.color }}
                              />
                              <span className="text-sm font-medium text-gray-900">{folder.name}</span>
                              <span className="text-xs text-gray-500">({folder.chatCount})</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {isInFolder(folder.id) ? (
                                <button
                                  onClick={() => handleRemoveFromExistingFolder(folder.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                  title="Remove from folder"
                                >
                                  <FolderMinus size={14} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAddToExistingFolder(folder.id)}
                                  className="p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors"
                                  title="Add to folder"
                                >
                                  <FolderPlus size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Search size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No folders found matching "{folderSearchQuery}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {chatFolders.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Folder size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No folders created yet</p>
                    <p className="text-xs text-gray-400 mt-1">Create your first folder to organize chats</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowFolderPopup(false);
                  setFolderSearchQuery('');
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Prompt Popup */}
      {showSavePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Save Prompt</h3>
                <button
                  onClick={() => setShowSavePopup(false)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={saveData.title}
                  onChange={(e) => setSaveData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter prompt title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <div className="space-y-2">
                  <select
                    value={saveData.category}
                    onChange={(e) => setSaveData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {allCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  
                  {!showNewCategory ? (
                    <button
                      type="button"
                      onClick={() => setShowNewCategory(true)}
                      className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Add New Category
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Category name..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCategory();
                          }
                          if (e.key === 'Escape') {
                            setShowNewCategory(false);
                            setNewCategoryName('');
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        disabled={!newCategoryName.trim()}
                        className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategoryName('');
                        }}
                        className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={saveData.tags.join(', ')}
                  onChange={(e) => setSaveData(prev => ({ 
                    ...prev, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., creative, marketing, social"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Preview
                </label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 max-h-20 overflow-y-auto">
                  {saveData.content}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowSavePopup(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfirm}
                disabled={!saveData.title.trim()}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Craft Popup */}
      {showCraftPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl my-8">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Craft Content</h3>
                </div>
                <button
                  onClick={() => setShowCraftPopup(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Social Media Platform
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'twitter', label: 'Twitter', icon: '🐦' },
                    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
                    { value: 'instagram', label: 'Instagram', icon: '📸' },
                    { value: 'facebook', label: 'Facebook', icon: '👥' },
                    { value: 'tiktok', label: 'TikTok', icon: '🎵' },
                    { value: 'youtube', label: 'YouTube', icon: '📺' },
                  ].map((platform) => (
                    <button
                      key={platform.value}
                      type="button"
                      onClick={() => setCraftOptions(prev => ({ ...prev, platform: platform.value }))}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        craftOptions.platform === platform.value
                          ? 'border-[#AB68FF] bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{platform.icon}</span>
                        <span className="text-sm font-medium">{platform.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Length Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Content Length
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'short', label: 'Short', desc: 'Quick & punchy (under 100 words)' },
                    { value: 'medium', label: 'Medium', desc: 'Balanced detail (100-300 words)' },
                    { value: 'long', label: 'Long', desc: 'Comprehensive (300+ words)' },
                  ].map((length) => (
                    <button
                      key={length.value}
                      type="button"
                      onClick={() => setCraftOptions(prev => ({ ...prev, length: length.value }))}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        craftOptions.length === length.value
                          ? 'border-[#AB68FF] bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{length.label}</div>
                      <div className="text-sm text-gray-600">{length.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tone & Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'professional', label: 'Professional', icon: '💼' },
                    { value: 'casual', label: 'Casual', icon: '😊' },
                    { value: 'humorous', label: 'Humorous', icon: '😄' },
                    { value: 'inspirational', label: 'Inspirational', icon: '✨' },
                    { value: 'educational', label: 'Educational', icon: '📚' },
                    { value: 'urgent', label: 'Urgent', icon: '⚡' },
                  ].map((tone) => (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => setCraftOptions(prev => ({ ...prev, tone: tone.value }))}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        craftOptions.tone === tone.value
                          ? 'border-[#AB68FF] bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{tone.icon}</span>
                        <span className="text-sm font-medium">{tone.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-gray-100 p-6">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCraftPopup(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCraft}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  Craft Content
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
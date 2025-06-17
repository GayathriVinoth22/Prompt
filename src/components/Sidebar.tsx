import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Bookmark, 
  Folder, 
  Image, 
  Settings, 
  MessageSquare,
  Star,
  Archive,
  Tag,
  MoreHorizontal,
  Edit2,
  Trash2,
  FolderPlus,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Category, ChatSession, ChatFolder } from '../types';

interface SidebarProps {
  categories: Category[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewChat: () => void;
  chatSessions: ChatSession[];
  chatFolders: ChatFolder[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onCreateFolder: (name: string, color?: string) => string;
  onAddToFolder: (chatId: string, folderId: string) => void;
  onRemoveFromFolder: (chatId: string, folderId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
}

export default function Sidebar({ 
  categories, 
  activeTab, 
  onTabChange, 
  onNewChat,
  chatSessions,
  chatFolders,
  currentChatId,
  onSelectChat,
  onDeleteChat,
  onCreateFolder,
  onAddToFolder,
  onRemoveFromFolder,
  onRenameChat
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatMenu, setShowChatMenu] = useState<string | null>(null);
  const [editingChat, setEditingChat] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const menuItems = [
    { id: 'library', label: 'Prompt Library', icon: Folder },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'gallery', label: 'Image Gallery', icon: Image },
    { id: 'craft', label: 'Prompt Craft', icon: Star },
  ];

  const folderColors = [
    '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4',
    '#84CC16', '#F97316', '#EC4899', '#6366F1', '#14B8A6', '#F43F5E'
  ];

  const filteredSessions = chatSessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unorganizedChats = filteredSessions.filter(session => 
    !session.folderIds || session.folderIds.length === 0
  );

  const organizedChats = chatFolders.map(folder => ({
    folder,
    chats: filteredSessions.filter(session => 
      session.folderIds?.includes(folder.id)
    )
  }));

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const randomColor = folderColors[Math.floor(Math.random() * folderColors.length)];
      onCreateFolder(newFolderName.trim(), randomColor);
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  const handleRenameStart = (chatId: string, currentTitle: string) => {
    setEditingChat(chatId);
    setEditTitle(currentTitle);
    setShowChatMenu(null);
  };

  const handleRenameSubmit = () => {
    if (editingChat && editTitle.trim()) {
      onRenameChat(editingChat, editTitle.trim());
    }
    setEditingChat(null);
    setEditTitle('');
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const ChatItem = ({ session, inFolder = false }: { session: ChatSession; inFolder?: boolean }) => (
    <div
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        currentChatId === session.id
          ? 'bg-gray-800 text-white'
          : 'text-gray-300 hover:bg-gray-800'
      } ${inFolder ? 'ml-4' : ''}`}
    >
      {editingChat === session.id ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') {
              setEditingChat(null);
              setEditTitle('');
            }
          }}
          className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      ) : (
        <>
          <MessageSquare size={14} className="flex-shrink-0" />
          <div 
            className="flex-1 min-w-0"
            onClick={() => onSelectChat(session.id)}
          >
            <div className="text-sm font-medium truncate">{session.title}</div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>{formatDate(session.updatedAt)}</span>
              {session.folderIds && session.folderIds.length > 0 && (
                <div className="flex items-center gap-1">
                  <span>•</span>
                  {session.folderIds.slice(0, 2).map(folderId => {
                    const folder = chatFolders.find(f => f.id === folderId);
                    return folder ? (
                      <div
                        key={folderId}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: folder.color }}
                        title={folder.name}
                      />
                    ) : null;
                  })}
                  {session.folderIds.length > 2 && (
                    <span className="text-xs">+{session.folderIds.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowChatMenu(showChatMenu === session.id ? null : session.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
          >
            <MoreHorizontal size={14} />
          </button>
        </>
      )}
      
      {showChatMenu === session.id && (
        <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
          <button
            onClick={() => handleRenameStart(session.id, session.title)}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
          >
            <Edit2 size={12} />
            Rename
          </button>
          <div className="border-t border-gray-700 my-1"></div>
          <div className="px-3 py-1 text-xs text-gray-500">Add to folder:</div>
          {chatFolders.map(folder => (
            <button
              key={folder.id}
              onClick={() => {
                if (session.folderIds?.includes(folder.id)) {
                  onRemoveFromFolder(session.id, folder.id);
                } else {
                  onAddToFolder(session.id, folder.id);
                }
                setShowChatMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: folder.color }}
              />
              {folder.name}
              {session.folderIds?.includes(folder.id) && (
                <span className="ml-auto text-green-400">✓</span>
              )}
            </button>
          ))}
          <div className="border-t border-gray-700 my-1"></div>
          <button
            onClick={() => {
              onDeleteChat(session.id);
              setShowChatMenu(null);
            }}
            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-64 bg-[#171717] text-white h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-600 hover:bg-gray-800 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm font-medium">New chat</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-2">
        {/* Recent Chats Header */}
        <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <span>Recent Chats</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNewFolder(true)}
              className="p-1 hover:bg-gray-800 rounded transition-colors"
              title="Create folder"
            >
              <FolderPlus size={12} />
            </button>
          </div>
        </div>

        {/* New Folder Input */}
        {showNewFolder && (
          <div className="px-3 py-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') {
                    setShowNewFolder(false);
                    setNewFolderName('');
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Folders */}
        {organizedChats.map(({ folder, chats }) => (
          <div key={folder.id} className="mb-2">
            <button
              onClick={() => toggleFolder(folder.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              {expandedFolders.has(folder.id) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: folder.color }}
              />
              <span className="flex-1 text-left">{folder.name}</span>
              <span className="text-xs text-gray-500">{chats.length}</span>
            </button>
            {expandedFolders.has(folder.id) && (
              <div className="space-y-1">
                {chats.map(session => (
                  <ChatItem key={session.id} session={session} inFolder />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Unorganized Chats */}
        {unorganizedChats.length > 0 && (
          <div className="space-y-1">
            {unorganizedChats.map(session => (
              <ChatItem key={session.id} session={session} />
            ))}
          </div>
        )}

        {filteredSessions.length === 0 && (
          <div className="px-3 py-8 text-center text-gray-500 text-sm">
            {searchQuery ? 'No chats found' : 'No chat history yet'}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-2 py-4 border-t border-gray-700">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Categories for Library */}
        {activeTab === 'library' && (
          <div className="mt-4">
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <Tag size={12} />
              Categories
            </div>
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{category.promptCount}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-gray-700">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
          <Settings size={16} />
          Settings
        </button>
      </div>

      {/* Click outside to close menu */}
      {showChatMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowChatMenu(null)}
        />
      )}
    </div>
  );
}
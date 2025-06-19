import React, { useState } from 'react';
import { Search, Bookmark, Share, Copy, Star, Filter, Tag } from 'lucide-react';
import { Prompt, Category } from '../types';

interface PromptLibraryProps {
  prompts: Prompt[];
  categories: Category[];
  onUsePrompt: (prompt: Prompt) => void;
  onBookmarkPrompt: (promptId: string) => void;
}

export default function PromptLibrary({ prompts, categories, onUsePrompt, onBookmarkPrompt }: PromptLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('usage');

  const filteredPrompts = prompts
    .filter(prompt => {
      const matchesSearch = prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           prompt.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.usage - a.usage;
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Prompt Library</h1>
        
        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search prompts, tags, or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent"
            >
              <option value="usage">Most Used</option>
              <option value="recent">Recently Updated</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt) => (
            <div key={prompt.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-lg leading-tight">{prompt.title}</h3>
                <button
                  onClick={() => onBookmarkPrompt(prompt.id)}
                  className={`p-1 rounded transition-colors ${
                    prompt.isBookmarked 
                      ? 'text-yellow-500 hover:text-yellow-600' 
                      : 'text-gray-400 hover:text-yellow-500'
                  }`}
                >
                  <Bookmark size={18} fill={prompt.isBookmarked ? 'currentColor' : 'none'} />
                </button>
              </div>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{prompt.content}</p>
              
              <div className="flex items-center gap-2 mb-4">
                <span 
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: categories.find(c => c.name === prompt.category)?.color || '#6B7280' }}
                >
                  {prompt.category}
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Star size={12} />
                  <span>{prompt.usage} uses</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-4">
                {prompt.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                    <Tag size={10} className="mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUsePrompt(prompt)}
                  className="flex-1 bg-[#19C37D] text-white px-4 py-2 rounded-lg hover:bg-[#16A870] transition-colors text-sm font-medium"
                >
                  Use Prompt
                </button>
                <button
                  onClick={() => copyToClipboard(prompt.content)}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy size={16} />
                </button>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Share prompt"
                >
                  <Share size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredPrompts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No prompts found</h3>
            <p className="text-gray-600">Try adjusting your search terms or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
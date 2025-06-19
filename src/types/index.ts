export interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isBookmarked: boolean;
  createdAt: Date;
  updatedAt: Date;
  usage: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  promptCount: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ImageItem {
  id: string;
  url: string;
  title: string;
  tags: string[];
  category: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  folderIds?: string[]; // Changed to support multiple folders
}

export interface ChatFolder {
  id: string;
  name: string;
  createdAt: Date;
  chatCount: number;
  color?: string; // Optional color for folder
}
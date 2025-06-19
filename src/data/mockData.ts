import { Prompt, Category, ImageItem } from '../types';

export const mockCategories: Category[] = [
  { id: '1', name: 'Writing', description: 'Creative and professional writing prompts', color: '#10B981', promptCount: 156 },
  { id: '2', name: 'Code Review', description: 'Programming and code analysis prompts', color: '#3B82F6', promptCount: 89 },
  { id: '3', name: 'Business', description: 'Business strategy and analysis prompts', color: '#8B5CF6', promptCount: 124 },
  { id: '4', name: 'Education', description: 'Learning and teaching prompts', color: '#F59E0B', promptCount: 67 },
  { id: '5', name: 'Marketing', description: 'Marketing and content creation prompts', color: '#EF4444', promptCount: 98 },
  { id: '6', name: 'Research', description: 'Research and analysis prompts', color: '#06B6D4', promptCount: 78 },
];

export const mockPrompts: Prompt[] = [
  {
    id: '1',
    title: 'Blog Post Outline Creator',
    content: 'Create a comprehensive blog post outline for the topic: [TOPIC]. Include main headings, subheadings, key points to cover, and suggested word count for each section.',
    category: 'Writing',
    tags: ['blog', 'content', 'outline'],
    isBookmarked: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
    usage: 45
  },
  {
    id: '2',
    title: 'Code Security Audit',
    content: 'Review the following code for security vulnerabilities, performance issues, and best practices. Provide specific recommendations for improvement:\n\n[CODE]',
    category: 'Code Review',
    tags: ['security', 'audit', 'best-practices'],
    isBookmarked: false,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18'),
    usage: 32
  },
  {
    id: '3',
    title: 'SWOT Analysis Generator',
    content: 'Create a detailed SWOT analysis for [COMPANY/PRODUCT]. Analyze Strengths, Weaknesses, Opportunities, and Threats with specific examples and actionable insights.',
    category: 'Business',
    tags: ['swot', 'analysis', 'strategy'],
    isBookmarked: true,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-19'),
    usage: 28
  },
  {
    id: '4',
    title: 'Learning Path Creator',
    content: 'Design a comprehensive learning path for [SKILL/SUBJECT]. Include beginner to advanced resources, estimated timeframes, practical projects, and assessment methods.',
    category: 'Education',
    tags: ['learning', 'curriculum', 'skills'],
    isBookmarked: false,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-16'),
    usage: 19
  },
  {
    id: '5',
    title: 'Social Media Campaign Strategy',
    content: 'Develop a complete social media campaign strategy for [PRODUCT/SERVICE]. Include platform selection, content types, posting schedule, hashtag strategy, and KPIs.',
    category: 'Marketing',
    tags: ['social-media', 'campaign', 'strategy'],
    isBookmarked: true,
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-21'),
    usage: 37
  },
  {
    id: '6',
    title: 'Market Research Framework',
    content: 'Create a comprehensive market research framework for [INDUSTRY/PRODUCT]. Include primary and secondary research methods, data collection strategies, and analysis techniques.',
    category: 'Research',
    tags: ['market-research', 'analysis', 'framework'],
    isBookmarked: false,
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-17'),
    usage: 24
  }
];

export const mockImages: ImageItem[] = [
  {
    id: '1',
    url: 'https://images.pexels.com/photos/7988079/pexels-photo-7988079.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: 'Creative Writing Inspiration',
    tags: ['writing', 'creativity', 'inspiration'],
    category: 'Writing'
  },
  {
    id: '2',
    url: 'https://images.pexels.com/photos/4164418/pexels-photo-4164418.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: 'Code Development',
    tags: ['coding', 'development', 'programming'],
    category: 'Code Review'
  },
  {
    id: '3',
    url: 'https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: 'Business Strategy',
    tags: ['business', 'strategy', 'meeting'],
    category: 'Business'
  },
  {
    id: '4',
    url: 'https://images.pexels.com/photos/5905709/pexels-photo-5905709.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: 'Online Learning',
    tags: ['education', 'learning', 'online'],
    category: 'Education'
  },
  {
    id: '5',
    url: 'https://images.pexels.com/photos/7947664/pexels-photo-7947664.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: 'Digital Marketing',
    tags: ['marketing', 'digital', 'social'],
    category: 'Marketing'
  },
  {
    id: '6',
    url: 'https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: 'Data Research',
    tags: ['research', 'data', 'analysis'],
    category: 'Research'
  }
];
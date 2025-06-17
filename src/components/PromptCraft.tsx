import React, { useState } from 'react';
import { Wand2, Lightbulb, Target, Zap, Copy, Save } from 'lucide-react';

export default function PromptCraft() {
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [improvedPrompt, setImprovedPrompt] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);

  const techniques = [
    { id: 'clarity', name: 'Clarity Enhancement', description: 'Make the prompt more specific and clear' },
    { id: 'context', name: 'Context Addition', description: 'Add relevant background information' },
    { id: 'structure', name: 'Structure Improvement', description: 'Organize the request better' },
    { id: 'examples', name: 'Example Integration', description: 'Include helpful examples' },
    { id: 'constraints', name: 'Constraint Definition', description: 'Set clear boundaries and limitations' },
    { id: 'persona', name: 'Persona Assignment', description: 'Define the AI\'s role or expertise' },
  ];

  const improvementTips = [
    'Be specific about the desired output format',
    'Include relevant context and background',
    'Use examples to clarify expectations',
    'Define the target audience',
    'Specify the tone and style',
    'Set clear constraints and limitations',
  ];

  const handleImprove = async () => {
    if (!originalPrompt.trim()) return;
    
    setIsImproving(true);
    
    // Simulate AI improvement
    setTimeout(() => {
      const improvements = [];
      
      if (selectedTechniques.includes('clarity')) {
        improvements.push('Made the request more specific and actionable');
      }
      if (selectedTechniques.includes('context')) {
        improvements.push('Added relevant background context');
      }
      if (selectedTechniques.includes('structure')) {
        improvements.push('Restructured for better flow and clarity');
      }
      if (selectedTechniques.includes('examples')) {
        improvements.push('Included examples to guide the response');
      }
      if (selectedTechniques.includes('constraints')) {
        improvements.push('Defined clear parameters and limitations');
      }
      if (selectedTechniques.includes('persona')) {
        improvements.push('Assigned a specific expertise role');
      }

      const improved = `IMPROVED PROMPT:

${originalPrompt}

ENHANCEMENTS APPLIED:
${improvements.map(imp => `• ${imp}`).join('\n')}

OPTIMIZED VERSION:
As an expert in [relevant field], please provide a comprehensive analysis of the following topic. Structure your response with clear headings, include specific examples, and ensure the content is suitable for [target audience].

Original request: ${originalPrompt}

Please ensure your response:
- Is well-structured and easy to follow
- Includes practical examples where relevant
- Addresses potential follow-up questions
- Maintains a professional yet accessible tone`;

      setImprovedPrompt(improved);
      setIsImproving(false);
    }, 2000);
  };

  const toggleTechnique = (techniqueId: string) => {
    setSelectedTechniques(prev => 
      prev.includes(techniqueId)
        ? prev.filter(id => id !== techniqueId)
        : [...prev, techniqueId]
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-[#19C37D] rounded-lg flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Prompt Craft</h1>
        </div>
        <p className="text-gray-600">Transform your prompts into powerful, precise instructions that get better results.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Improvement Techniques */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Enhancement Techniques
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {techniques.map((technique) => (
                <label key={technique.id} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTechniques.includes(technique.id)}
                    onChange={() => toggleTechnique(technique.id)}
                    className="mt-1 rounded border-gray-300 text-[#19C37D] focus:ring-[#19C37D]"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{technique.name}</div>
                    <div className="text-sm text-gray-600">{technique.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Input Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Original Prompt
            </label>
            <textarea
              value={originalPrompt}
              onChange={(e) => setOriginalPrompt(e.target.value)}
              placeholder="Enter your original prompt here..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#19C37D] focus:border-transparent resize-none"
            />
            <button
              onClick={handleImprove}
              disabled={!originalPrompt.trim() || isImproving || selectedTechniques.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-[#19C37D] text-white rounded-xl hover:bg-[#16A870] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wand2 className={`w-4 h-4 ${isImproving ? 'animate-spin' : ''}`} />
              {isImproving ? 'Improving...' : 'Improve Prompt'}
            </button>
          </div>

          {/* Output Section */}
          {improvedPrompt && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Improved Prompt
              </label>
              <div className="relative">
                <textarea
                  value={improvedPrompt}
                  readOnly
                  className="w-full h-64 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 resize-none"
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(improvedPrompt)}
                    className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Save prompt"
                  >
                    <Save size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tips Section */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              Pro Tips for Better Prompts
            </h3>
            <ul className="space-y-2">
              {improvementTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
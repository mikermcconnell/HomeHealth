
import React, { useState } from 'react';
import { ImprovementProject } from '../types';
import { Lightbulb, Plus, DollarSign, TrendingUp, Sparkles, CheckCircle, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface HomeImprovementProps {
  projects: ImprovementProject[];
  onAddProject: (project: ImprovementProject) => void;
  onUpdateProject: (project: ImprovementProject) => void;
  onDeleteProject: (id: string) => void;
  userLocation?: string;
}

const HomeImprovement: React.FC<HomeImprovementProps> = ({ projects, onAddProject, onUpdateProject, onDeleteProject, userLocation }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isBrainstorming, setIsBrainstorming] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [category, setCategory] = useState<ImprovementProject['category']>('AESTHETIC');
  
  // AI State
  const [brainstormPrompt, setBrainstormPrompt] = useState('kitchen');
  const [aiSuggestions, setAiSuggestions] = useState<Partial<ImprovementProject>[]>([]);

  const handleBrainstorm = async () => {
    setIsBrainstorming(true);
    setAiSuggestions([]);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Suggest 3 home improvement projects for a "${brainstormPrompt}". 
        
        The user is located in "${userLocation || 'General North America'}".
        Consider the local climate and seasonality when suggesting projects, especially for exterior upgrades.
        
        For each project, provide a title, a short description, an estimated cost (number only), and a category (AESTHETIC, FUNCTIONAL, ENERGY_SAVING, or SMART_HOME).
        
        Return pure JSON array like:
        [
          { "title": "Paint Walls", "description": "Fresh coat of neutral paint", "estimatedCost": 200, "category": "AESTHETIC" }
        ]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text;
        if (text) {
            const suggestions = JSON.parse(text);
            setAiSuggestions(suggestions);
        }
    } catch (e) {
        console.error("Brainstorm error", e);
    } finally {
        setIsBrainstorming(false);
    }
  };

  const handleAddSuggestion = (suggestion: Partial<ImprovementProject>) => {
      onAddProject({
          id: Date.now().toString(),
          title: suggestion.title || 'New Project',
          description: suggestion.description || '',
          estimatedCost: suggestion.estimatedCost || 0,
          category: suggestion.category || 'FUNCTIONAL',
          priority: 'MEDIUM',
          status: 'PLANNED'
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddProject({
      id: Date.now().toString(),
      title,
      description,
      estimatedCost,
      category,
      priority: 'MEDIUM',
      status: 'PLANNED'
    });
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEstimatedCost(0);
  };

  const getCategoryColor = (cat: string) => {
      switch(cat) {
          case 'ENERGY_SAVING': return 'bg-green-100 text-green-700 border-green-200';
          case 'SMART_HOME': return 'bg-purple-100 text-purple-700 border-purple-200';
          case 'FUNCTIONAL': return 'bg-blue-100 text-blue-700 border-blue-200';
          default: return 'bg-orange-100 text-orange-700 border-orange-200';
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
      {/* Left Column: Projects List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <TrendingUp className="mr-2 text-primary" /> Projects & Upgrades
                </h2>
                <p className="text-sm text-gray-500">Track value-adding improvements</p>
             </div>
             <button 
               onClick={() => setIsAdding(!isAdding)}
               className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition flex items-center shadow-sm"
             >
               <Plus size={16} className="mr-2" /> New Project
             </button>
        </div>

        {/* Add Form */}
        {isAdding && (
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in slide-in-from-top-2">
                <h3 className="font-bold text-gray-800 mb-4">Add Manual Project</h3>
                <div className="grid grid-cols-1 gap-4">
                    <input 
                       className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" 
                       placeholder="Project Title (e.g. Install Smart Thermostat)"
                       value={title} onChange={e => setTitle(e.target.value)} required
                    />
                    <textarea 
                       className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" 
                       placeholder="Description..."
                       value={description} onChange={e => setDescription(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">Cost ($)</label>
                             <input 
                                type="number"
                                className="w-full border border-gray-300 rounded-lg p-2" 
                                value={estimatedCost} onChange={e => setEstimatedCost(Number(e.target.value))}
                             />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-500 mb-1">Category</label>
                             <select 
                                className="w-full border border-gray-300 rounded-lg p-2"
                                value={category} onChange={e => setCategory(e.target.value as any)}
                             >
                                 <option value="AESTHETIC">Aesthetic</option>
                                 <option value="FUNCTIONAL">Functional</option>
                                 <option value="ENERGY_SAVING">Energy Saving</option>
                                 <option value="SMART_HOME">Smart Home</option>
                             </select>
                        </div>
                    </div>
                    <button type="submit" className="bg-primary text-white py-2 rounded-lg font-medium hover:bg-emerald-700">Add Project</button>
                </div>
            </form>
        )}

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(project => (
                <div key={project.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm relative group hover:shadow-md transition">
                    <div className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wide ${getCategoryColor(project.category)}`}>
                        {project.category.replace('_', ' ')}
                    </div>
                    
                    <h3 className="font-bold text-lg text-gray-800 pr-20">{project.title}</h3>
                    <p className="text-sm text-gray-500 mt-1 mb-4 h-10 overflow-hidden">{project.description}</p>
                    
                    <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-50">
                        <span className="font-semibold text-gray-700 flex items-center">
                            <DollarSign size={14} className="text-gray-400" />
                            {project.estimatedCost.toLocaleString()}
                        </span>
                        
                        <div className="flex items-center space-x-2">
                             {project.status === 'PLANNED' ? (
                                 <button 
                                    onClick={() => onUpdateProject({...project, status: 'COMPLETED'})}
                                    className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-medium hover:bg-emerald-100 transition flex items-center"
                                 >
                                     <CheckCircle size={12} className="mr-1" /> Mark Done
                                 </button>
                             ) : (
                                <span className="text-gray-400 text-xs font-medium flex items-center">
                                    <CheckCircle size={12} className="mr-1" /> Completed
                                </span>
                             )}
                        </div>
                    </div>
                </div>
            ))}
            {projects.length === 0 && !isAdding && (
                <div className="col-span-full text-center py-10 bg-white rounded-xl border-dashed border-2 border-gray-200">
                    <TrendingUp className="mx-auto text-gray-300 mb-2" size={32} />
                    <p className="text-gray-500">No improvement projects yet.</p>
                </div>
            )}
        </div>
      </div>

      {/* Right Column: AI Brainstorming */}
      <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100 sticky top-24">
              <div className="flex items-center mb-4 text-indigo-900 font-bold text-lg">
                  <Lightbulb className="mr-2 text-yellow-500" />
                  AI Brainstorm
              </div>
              <p className="text-sm text-indigo-700 mb-4">
                  Need inspiration? Ask AI for high-ROI upgrades for specific rooms.
              </p>
              
              <div className="flex space-x-2 mb-4">
                  <input 
                    value={brainstormPrompt}
                    onChange={(e) => setBrainstormPrompt(e.target.value)}
                    className="flex-1 rounded-lg border-indigo-200 p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                    placeholder="e.g. Backyard, Kitchen..."
                  />
                  <button 
                    onClick={handleBrainstorm}
                    disabled={isBrainstorming}
                    className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                      {isBrainstorming ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  </button>
              </div>

              <div className="space-y-3">
                  {aiSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-indigo-100 hover:border-indigo-300 transition">
                          <div className="font-semibold text-gray-800 text-sm mb-1">{suggestion.title}</div>
                          <p className="text-xs text-gray-500 mb-2">{suggestion.description}</p>
                          <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                  Est. ${suggestion.estimatedCost}
                              </span>
                              <button 
                                onClick={() => handleAddSuggestion(suggestion)}
                                className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition"
                              >
                                  <Plus size={16} />
                              </button>
                          </div>
                      </div>
                  ))}
                  {aiSuggestions.length === 0 && !isBrainstorming && (
                      <div className="text-xs text-indigo-400 italic text-center mt-4">
                          Try searching for "Small Bathroom" or "Curb Appeal"
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default HomeImprovement;


import React, { useState } from 'react';
import { ImprovementProject } from '../types';
import { PHIL_AVATAR_URL } from '../constants';
import { Lightbulb, Plus, DollarSign, TrendingUp, Sparkles, CheckCircle, Clock, ArrowRight, Loader2, Trash2, HardHat } from 'lucide-react';
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
        const prompt = `Act as Phil, a friendly home improvement expert. Suggest 3 high-value home improvement projects for a "${brainstormPrompt}". 
        
        The user is located in "${userLocation || 'General North America'}".
        Consider the local climate and seasonality when suggesting projects.
        
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
          case 'ENERGY_SAVING': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
          case 'SMART_HOME': return 'bg-violet-100 text-violet-700 border-violet-200';
          case 'FUNCTIONAL': return 'bg-blue-100 text-blue-700 border-blue-200';
          default: return 'bg-amber-100 text-amber-700 border-amber-200';
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Projects List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Planned Projects</h3>
                    <p className="text-sm text-slate-500">Track renovation and upgrade costs</p>
                </div>
                <button 
                onClick={() => setIsAdding(!isAdding)}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition flex items-center shadow-sm"
                >
                <Plus size={16} className="mr-2" /> New Project
                </button>
            </div>

            {/* Add Form */}
            {isAdding && (
                <form onSubmit={handleSubmit} className="mb-6 bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
                    <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide">Add Manual Project</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <input 
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                        placeholder="Project Title (e.g. Install Smart Thermostat)"
                        value={title} onChange={e => setTitle(e.target.value)} required
                        />
                        <textarea 
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
                        placeholder="Description..."
                        value={description} onChange={e => setDescription(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Estimated Cost ($)</label>
                                <input 
                                    type="number"
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" 
                                    value={estimatedCost} onChange={e => setEstimatedCost(Number(e.target.value))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
                                <select 
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                    value={category} onChange={e => setCategory(e.target.value as any)}
                                >
                                    <option value="AESTHETIC">Aesthetic</option>
                                    <option value="FUNCTIONAL">Functional</option>
                                    <option value="ENERGY_SAVING">Energy Saving</option>
                                    <option value="SMART_HOME">Smart Home</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                             <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
                             <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">Add Project</button>
                        </div>
                    </div>
                </form>
            )}

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {projects.map(project => (
                    <div key={project.id} className="bg-white rounded-lg p-4 border border-slate-100 hover:border-slate-300 shadow-sm transition group">
                        <div className="flex justify-between items-start">
                             <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-1">
                                     <h3 className="font-bold text-slate-800">{project.title}</h3>
                                     <div className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${getCategoryColor(project.category)}`}>
                                         {project.category.replace('_', ' ')}
                                     </div>
                                 </div>
                                 <p className="text-sm text-slate-500 mb-3">{project.description}</p>
                                 <div className="flex items-center text-sm font-semibold text-slate-700">
                                     <DollarSign size={14} className="text-slate-400 mr-1" />
                                     {project.estimatedCost.toLocaleString()}
                                 </div>
                             </div>
                             
                             <div className="flex items-center space-x-2 pl-4">
                                 {project.status === 'PLANNED' ? (
                                     <button 
                                        onClick={() => onUpdateProject({...project, status: 'COMPLETED'})}
                                        className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-100 transition flex items-center border border-emerald-100"
                                     >
                                         <CheckCircle size={14} className="mr-1.5" /> Mark Done
                                     </button>
                                 ) : (
                                    <span className="text-slate-400 text-xs font-medium flex items-center px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                        <CheckCircle size={14} className="mr-1.5" /> Completed
                                    </span>
                                 )}
                                 <button onClick={() => onDeleteProject(project.id)} className="text-slate-300 hover:text-red-500 p-2">
                                     <Trash2 size={16} />
                                 </button>
                             </div>
                        </div>
                    </div>
                ))}
                {projects.length === 0 && !isAdding && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-lg">
                        <TrendingUp className="mx-auto text-slate-300 mb-3" size={32} />
                        <p className="text-slate-500 text-sm">No improvement projects planned.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Right Column: PHIL - Styled Warm */}
      <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 border border-orange-400 shadow-xl text-white sticky top-8">
              <div className="flex items-center mb-6 text-white font-bold text-lg border-b border-white/20 pb-4">
                  <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm overflow-hidden mr-3">
                      <img src={PHIL_AVATAR_URL} alt="Phil" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    Ask Phil
                    <div className="text-xs font-normal text-amber-100 opacity-80">Ideas & Inspiration</div>
                  </div>
              </div>
              <p className="text-sm text-white/90 mb-6 leading-relaxed">
                  "Got an empty corner or a renovation idea? Tell me what you're thinking (e.g., 'Backyard', 'Kitchen') and I'll give you some solid suggestions."
              </p>
              
              <div className="flex space-x-2 mb-6">
                  <input 
                    value={brainstormPrompt}
                    onChange={(e) => setBrainstormPrompt(e.target.value)}
                    className="flex-1 rounded-lg border-0 bg-white/20 text-white placeholder-white/60 p-2.5 text-sm focus:ring-2 focus:ring-white/50 outline-none backdrop-blur-sm"
                    placeholder="e.g. Small Bathroom..."
                  />
                  <button 
                    onClick={handleBrainstorm}
                    disabled={isBrainstorming}
                    className="bg-white text-orange-600 px-3 rounded-lg hover:bg-orange-50 transition disabled:opacity-50 font-medium"
                  >
                      {isBrainstorming ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                  </button>
              </div>

              <div className="space-y-3">
                  {aiSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20 hover:bg-white/20 transition group">
                          <div className="flex justify-between items-start mb-1">
                             <div className="font-semibold text-white text-sm">{suggestion.title}</div>
                             <span className="text-[10px] font-bold text-white bg-black/20 px-1.5 py-0.5 rounded">
                                 ${suggestion.estimatedCost}
                             </span>
                          </div>
                          <p className="text-xs text-white/80 mb-3 leading-snug">{suggestion.description}</p>
                          
                          <button 
                            onClick={() => handleAddSuggestion(suggestion)}
                            className="w-full py-1.5 rounded bg-white/20 hover:bg-white text-white hover:text-orange-600 text-xs font-bold transition flex items-center justify-center"
                          >
                              <Plus size={14} className="mr-1" /> Add to Plan
                          </button>
                      </div>
                  ))}
                  
                  {aiSuggestions.length === 0 && !isBrainstorming && (
                      <div className="text-xs text-white/50 text-center mt-4">
                          <HardHat size={24} className="mx-auto mb-2 opacity-50" />
                          Phil is ready to help.
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default HomeImprovement;
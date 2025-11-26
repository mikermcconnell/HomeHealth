
import React, { useState, useRef } from 'react';
import { Asset, AssetCategory, Task } from '../types';
import { Plus, Camera, FileText, Trash2, Loader2, Sparkles, ExternalLink, ListChecks, ScanLine, PlusCircle, PenTool, X, CheckSquare, Calendar, HelpCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface AssetManagerProps {
  assets: Asset[];
  onAddAsset: (asset: Asset) => void;
  onAddTasks: (tasks: Task[]) => void;
  onDeleteAsset: (id: string) => void;
  userLocation?: string;
}

const AssetManager: React.FC<AssetManagerProps> = ({ assets, onAddAsset, onAddTasks, onDeleteAsset, userLocation }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState<string>('');
  
  // Feature / Amenity Modal State
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [isGeneratingFeature, setIsGeneratingFeature] = useState(false);
  const [featureProposals, setFeatureProposals] = useState<Partial<Task>[]>([]);
  const [selectedProposals, setSelectedProposals] = useState<Record<number, boolean>>({});

  // Form State
  const [category, setCategory] = useState<AssetCategory>(AssetCategory.FRIDGE);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [manualName, setManualName] = useState<string | null>(null);
  const [detectedManualUrl, setDetectedManualUrl] = useState<string | null>(null);
  
  // AI Task Generation State
  const [generatedTasks, setGeneratedTasks] = useState<Partial<Task>[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Record<number, boolean>>({});
  
  // Manual Task Entry
  const [manualTaskTitle, setManualTaskTitle] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        // Automatically start scanning if it's a new upload
        if (!brand || !model) {
            processImageWithAI(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const processImageWithAI = async (base64Image: string) => {
    setIsScanning(true);
    setScanStage('Analyzing Nameplate...');
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Split base64 to get data
        const base64Data = base64Image.split(',')[1];
        const mimeType = base64Image.substring(base64Image.indexOf(':') + 1, base64Image.indexOf(';'));

        // Step 1: Vision - Identify Brand & Model
        const visionResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Data } },
                    { text: "Identify the Brand and Model Name/Number from this image. Return a JSON object with keys 'brand' and 'model' and nothing else." }
                ]
            },
            config: {
                responseMimeType: 'application/json'
            }
        });

        const text = visionResponse.text;
        if (text) {
            const data = JSON.parse(text);
            if (data.brand) setBrand(data.brand);
            if (data.model) setModel(data.model);
            
            // Immediately trigger search if we found data
            if (data.brand || data.model) {
                await searchForManualAndTasks(data.brand || brand, data.model || model);
            }
        }
    } catch (error) {
        console.error("AI Vision Error:", error);
        setScanStage('Error scanning image.');
    } finally {
        setIsScanning(false);
    }
  };

  const searchForManualAndTasks = async (searchBrand: string, searchModel: string) => {
      setScanStage('Searching for Manual & Tasks...');
      setIsScanning(true);
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `For the ${searchBrand} ${searchModel} ${category}, find the official user manual and a maintenance schedule.
          
          Context: The user is located in "${userLocation || 'General North America'}". If this is an outdoor appliance (like HVAC, BBQ), ensure tasks and frequencies respect the local climate (e.g., winterization).
          
          1. Try to find a direct URL to the PDF manual or support page.
          2. List 3-5 key maintenance tasks recommended for this specific appliance.
          
          Format the tasks strictly as a list where each line is: 
          'TASK: [Task Title] | [Brief Description] | [Frequency]'
          
          Do not include any other conversational text.`;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                  tools: [{ googleSearch: {} }]
              }
          });

          // Extract Manual URL from grounding chunks
          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
              const manualChunk = chunks.find(c => c.web?.uri && (c.web.title?.toLowerCase().includes('manual') || c.web.title?.toLowerCase().includes('support')));
              if (manualChunk?.web?.uri) {
                  setDetectedManualUrl(manualChunk.web.uri);
              } else if (chunks.length > 0 && chunks[0].web?.uri) {
                   // Fallback to first result
                   setDetectedManualUrl(chunks[0].web.uri);
              }
          }

          // Parse Tasks from text
          const lines = response.text?.split('\n') || [];
          const tasks: Partial<Task>[] = [];
          
          lines.forEach((line) => {
             if (line.includes('TASK:')) {
                 const parts = line.replace(/[-*]?\s*TASK:\s*/, '').split('|');
                 if (parts.length >= 2) {
                     tasks.push({
                         title: parts[0].trim(),
                         description: parts[1].trim(),
                         priority: 'MEDIUM',
                         dueDate: new Date(Date.now() + 86400000 * 30).toISOString() // Default 30 days
                     });
                 }
             }
          });
          
          setGeneratedTasks(prev => [...prev, ...tasks]);
          
          // Auto-select new tasks
          const nextIdxStart = generatedTasks.length;
          const newSelection = { ...selectedTasks };
          tasks.forEach((_, i) => newSelection[nextIdxStart + i] = true);
          setSelectedTasks(newSelection);

      } catch (error) {
          console.error("AI Search Error:", error);
      } finally {
          setIsScanning(false);
          setScanStage('');
      }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setManualName(file.name);
    }
  };
  
  const addManualTask = () => {
      if (!manualTaskTitle.trim()) return;
      
      const newTask: Partial<Task> = {
          title: manualTaskTitle,
          description: "Manually added maintenance task",
          priority: "MEDIUM",
          dueDate: new Date(Date.now() + 86400000 * 30).toISOString()
      };
      
      setGeneratedTasks(prev => [...prev, newTask]);
      setSelectedTasks(prev => ({...prev, [generatedTasks.length]: true}));
      setManualTaskTitle('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assetId = Date.now().toString();
    
    const newAsset: Asset = {
      id: assetId,
      name: `${brand} ${category}`,
      category,
      brand,
      model,
      image: imagePreview || undefined,
      manual: manualName || undefined,
      manualUrl: detectedManualUrl || undefined,
    };
    
    onAddAsset(newAsset);

    // Add selected AI tasks
    const tasksToAdd = generatedTasks
        .filter((_, idx) => selectedTasks[idx])
        .map((t, idx) => ({
            ...t,
            id: `${assetId}-ai-${idx}`,
            assetId: assetId,
            status: 'PENDING' as const, // Force type
            priority: t.priority || 'MEDIUM',
            dueDate: t.dueDate || new Date().toISOString()
        } as Task));
    
    if (tasksToAdd.length > 0) {
        onAddTasks(tasksToAdd);
    }

    resetForm();
  };

  const resetForm = () => {
    setCategory(AssetCategory.FRIDGE);
    setBrand('');
    setModel('');
    setImagePreview(null);
    setManualName(null);
    setDetectedManualUrl(null);
    setGeneratedTasks([]);
    setSelectedTasks({});
    setIsAdding(false);
    setManualTaskTitle('');
  };

  // --- Feature / Amenity Logic ---
  const handleGenerateFeatureTasks = async () => {
      if (!featureInput.trim()) return;
      setIsGeneratingFeature(true);
      setFeatureProposals([]);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
            The user has a home feature: "${featureInput}".
            The user is located in "${userLocation || 'General North America'}".
            Today's date is ${new Date().toDateString()}.

            Generate a list of 3-6 recommended maintenance tasks for this feature.
            
            CRITICAL SEASONAL INSTRUCTION: 
            - Analyze the user's location and current date to determine the season.
            - If it is Winter in a cold climate and the feature is outdoors (like a Pond, Pool, BBQ), DO NOT suggest summer tasks (e.g. "Monitor Algae", "Mow Lawn"). Instead, suggest winter tasks (e.g. "Ensure pump is off", "Check winter cover", "Clear snow") or preparation for Spring.
            - If it is Spring, prioritize opening and cleaning tasks.
            
            Return a JSON array of objects with these fields:
            - title: string
            - description: string (what to do)
            - importance: string (why it matters)
            - frequencyDays: number (how often in days, roughly. e.g. 7 for weekly, 30 for monthly, 365 for yearly)
            - priority: "HIGH" | "MEDIUM" | "LOW"
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: { responseMimeType: 'application/json' }
          });
          
          const data = JSON.parse(response.text || '[]');
          
          const proposals: Partial<Task>[] = data.map((item: any) => {
             // Calculate approximate first due date based on frequency
             const daysToAdd = Math.max(1, Math.round(item.frequencyDays / 2)); // Start halfway through cycle? Or just next week for recurring?
             // Let's just set it to 'soon' but staggered.
             const dueDate = new Date(Date.now() + daysToAdd * 86400000).toISOString();

             return {
                 title: item.title,
                 description: item.description,
                 importance: item.importance,
                 priority: item.priority,
                 dueDate: dueDate,
                 recurring: true // Default to recurring for features
             };
          });

          setFeatureProposals(proposals);
          // Select all by default
          const sel: Record<number, boolean> = {};
          proposals.forEach((_, i) => sel[i] = true);
          setSelectedProposals(sel);

      } catch (error) {
          console.error("Feature Gen Error", error);
      } finally {
          setIsGeneratingFeature(false);
      }
  };

  const saveFeatureAndTasks = () => {
      const assetId = `feature-${Date.now()}`;
      
      // Create a "Virtual" Asset for the feature
      const newAsset: Asset = {
          id: assetId,
          name: featureInput,
          category: AssetCategory.OTHER,
          brand: 'Custom Feature',
          model: '',
      };
      
      onAddAsset(newAsset);

      const tasksToAdd = featureProposals
        .filter((_, idx) => selectedProposals[idx])
        .map((t, idx) => ({
            ...t,
            id: `${assetId}-task-${idx}`,
            assetId: assetId,
            status: 'PENDING' as const
        } as Task));

      if (tasksToAdd.length > 0) {
          onAddTasks(tasksToAdd);
      }

      // Close and reset
      setShowFeatureModal(false);
      setFeatureInput('');
      setFeatureProposals([]);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-xl font-bold text-gray-800">My Assets</h2>
            <p className="text-xs text-gray-500">Manage appliances & home features</p>
        </div>
        <div className="flex space-x-2">
            <button 
                onClick={() => setShowFeatureModal(true)}
                className="bg-indigo-50 text-indigo-600 p-2 rounded-full hover:bg-indigo-100 transition border border-indigo-200"
                title="Add Feature (Pool, BBQ, etc)"
            >
                <PenTool size={20} />
            </button>
            <button 
                onClick={() => setIsAdding(!isAdding)}
                className="bg-gray-900 text-white p-2 rounded-full hover:bg-gray-700 transition"
                title="Add Appliance"
            >
                {isAdding ? <X size={20} /> : <Plus size={20} />}
            </button>
        </div>
      </div>

      {/* Feature / Amenity Modal */}
      {showFeatureModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                      <div className="flex justify-between items-start">
                          <div>
                              <h3 className="text-xl font-bold text-indigo-900">Add Home Feature</h3>
                              <p className="text-sm text-indigo-600">Enter a feature (e.g., Hot Tub, Koi Pond) to get a custom maintenance plan.</p>
                          </div>
                          <button onClick={() => setShowFeatureModal(false)} className="text-gray-400 hover:text-gray-600">
                              <X size={24} />
                          </button>
                      </div>
                      
                      <div className="mt-4 flex gap-2">
                          <input 
                              autoFocus
                              value={featureInput}
                              onChange={(e) => setFeatureInput(e.target.value)}
                              placeholder="e.g. Saltwater Pool, Gas BBQ, Cedar Deck..."
                              className="flex-1 border border-indigo-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                              onKeyDown={(e) => e.key === 'Enter' && handleGenerateFeatureTasks()}
                          />
                          <button 
                              onClick={handleGenerateFeatureTasks}
                              disabled={isGeneratingFeature || !featureInput.trim()}
                              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center"
                          >
                              {isGeneratingFeature ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                          </button>
                      </div>
                  </div>

                  <div className="p-6 max-h-[60vh] overflow-y-auto">
                      {isGeneratingFeature && (
                          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                              <Loader2 size={32} className="animate-spin text-indigo-500 mb-2" />
                              <p className="text-sm">Consulting AI for maintenance best practices...</p>
                          </div>
                      )}

                      {!isGeneratingFeature && featureProposals.length > 0 && (
                          <div className="space-y-4">
                              <div className="flex items-center justify-between text-sm text-gray-500 border-b pb-2">
                                  <span>Review Recommended Tasks</span>
                                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{featureProposals.length} Found</span>
                              </div>
                              {featureProposals.map((task, idx) => (
                                  <div key={idx} className={`p-3 rounded-lg border transition ${selectedProposals[idx] ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                                      <div className="flex items-start gap-3">
                                          <div className="pt-0.5">
                                              <input 
                                                  type="checkbox"
                                                  checked={!!selectedProposals[idx]}
                                                  onChange={() => setSelectedProposals(prev => ({...prev, [idx]: !prev[idx]}))}
                                                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                              />
                                          </div>
                                          <div className="flex-1">
                                              <div className="flex justify-between items-start">
                                                  <h4 className="font-bold text-gray-800 text-sm">{task.title}</h4>
                                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${task.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                      {task.priority}
                                                  </span>
                                              </div>
                                              <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                                              {task.importance && (
                                                  <div className="mt-2 text-xs text-indigo-700 bg-indigo-50/50 p-1.5 rounded flex items-start">
                                                      <HelpCircle size={12} className="mr-1 mt-0.5 flex-shrink-0 opacity-70" />
                                                      {task.importance}
                                                  </div>
                                              )}
                                              <div className="mt-2 flex items-center text-[10px] text-gray-400">
                                                  <Calendar size={12} className="mr-1" />
                                                  Est. First Due: {new Date(task.dueDate || '').toLocaleDateString()}
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                      
                      {!isGeneratingFeature && featureProposals.length === 0 && !featureInput && (
                          <div className="text-center py-8 text-gray-400">
                              <Sparkles size={48} className="mx-auto mb-2 opacity-20" />
                              <p className="text-sm">Enter a feature above to get started.</p>
                          </div>
                      )}
                  </div>

                  {featureProposals.length > 0 && (
                      <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                          <button 
                              onClick={() => setShowFeatureModal(false)}
                              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={saveFeatureAndTasks}
                              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md transition"
                          >
                              Add {Object.values(selectedProposals).filter(Boolean).length} Tasks
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Existing Add Appliance Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-8 bg-white rounded-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 gap-4">
            
            {/* AI Scanner Header */}
            <div 
                className="bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-100 rounded-xl p-5 text-center cursor-pointer relative overflow-hidden group transition-all hover:shadow-md"
                onClick={() => !isScanning && fileInputRef.current?.click()}
            >
                <div className="absolute top-0 right-0 p-2 opacity-50">
                    <Sparkles className="text-emerald-400" />
                </div>
                
                {imagePreview ? (
                    <div className="relative h-48 w-full flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden shadow-inner">
                        <img src={imagePreview} alt="Preview" className="h-full object-contain opacity-80" />
                        
                        {isScanning ? (
                            <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                <ScanLine size={48} className="animate-pulse text-emerald-400 mb-4" />
                                <div className="text-lg font-bold animate-pulse">AI is working...</div>
                                <span className="text-sm font-medium text-emerald-200 mt-1">{scanStage}</span>
                            </div>
                        ) : (
                           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black bg-opacity-30 transition">
                               <span className="text-white font-medium flex items-center"><Camera className="mr-2" /> Retake Photo</span>
                           </div>
                        )}

                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setImagePreview(null); setGeneratedTasks([]); setDetectedManualUrl(null); }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md z-10"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition">
                            <Camera size={32} className="text-emerald-600" />
                        </div>
                        <span className="text-lg font-bold text-gray-800">Scan Nameplate</span>
                        <span className="text-sm text-gray-500 mt-1 max-w-xs">
                            Take a photo of your appliance label. AI will identify it, find the manual, and build a maintenance schedule.
                        </span>
                    </div>
                )}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                    disabled={isScanning}
                />
            </div>

            {/* Manual Text Entry fallback */}
            {!isScanning && !imagePreview && brand && model && generatedTasks.length === 0 && (
                <button
                    type="button"
                    onClick={() => searchForManualAndTasks(brand, model)}
                    className="w-full bg-blue-50 text-blue-600 py-3 rounded-lg text-sm font-bold hover:bg-blue-100 transition flex items-center justify-center border border-blue-200"
                >
                    <Sparkles size={16} className="mr-2" />
                    Manually Trigger AI Search
                </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Category</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value as AssetCategory)}
                    className="w-full rounded-md border-gray-300 bg-gray-50 p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none border"
                  >
                    {Object.values(AssetCategory).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Brand</label>
                    <input 
                      type="text" 
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full rounded-md border-gray-300 bg-gray-50 p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none border"
                      placeholder="e.g. LG"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Model</label>
                    <input 
                      type="text" 
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full rounded-md border-gray-300 bg-gray-50 p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none border"
                      placeholder="e.g. FX-200"
                    />
                  </div>
                </div>
            </div>

            {/* AI Detected Results Section */}
            {(detectedManualUrl || generatedTasks.length > 0) && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 space-y-4 mt-2">
                    <div className="flex items-center text-emerald-800 font-bold text-sm border-b border-emerald-200 pb-2">
                        <Sparkles size={16} className="mr-2" />
                        AI Detected Results
                    </div>
                    
                    {detectedManualUrl && (
                        <div className="flex items-center justify-between bg-white p-3 rounded-md border border-emerald-100 shadow-sm">
                            <span className="flex items-center text-gray-700 font-medium text-sm truncate">
                                <FileText size={16} className="mr-2 text-emerald-600" />
                                Official Manual Found
                            </span>
                            <a href={detectedManualUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-800 text-sm font-semibold flex items-center">
                                View <ExternalLink size={12} className="ml-1" />
                            </a>
                        </div>
                    )}

                    <div className="bg-white p-3 rounded-md border border-emerald-100 shadow-sm">
                         <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide flex items-center justify-between">
                             <span className="flex items-center"><ListChecks size={14} className="mr-1" /> Suggested Maintenance</span>
                             <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-normal">Select to add</span>
                         </div>
                         <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar mb-3">
                             {generatedTasks.map((task, idx) => (
                                 <label key={idx} className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition border border-transparent hover:border-gray-200">
                                     <input 
                                        type="checkbox" 
                                        checked={!!selectedTasks[idx]}
                                        onChange={() => setSelectedTasks(prev => ({...prev, [idx]: !prev[idx]}))}
                                        className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                     />
                                     <div className="text-sm">
                                         <div className="font-semibold text-gray-800">{task.title}</div>
                                         <div className="text-xs text-gray-500">{task.description}</div>
                                     </div>
                                 </label>
                             ))}
                         </div>
                         
                         {/* Manual Task Entry Field */}
                         <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                            <input 
                                type="text"
                                value={manualTaskTitle}
                                onChange={(e) => setManualTaskTitle(e.target.value)}
                                placeholder="Add custom task (e.g. Clean Filter)..."
                                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-emerald-400"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addManualTask())}
                            />
                            <button 
                                type="button" 
                                onClick={addManualTask}
                                className="bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700 p-1.5 rounded transition"
                            >
                                <PlusCircle size={16} />
                            </button>
                         </div>
                    </div>
                </div>
            )}

            {/* Document Storage - Secondary */}
            <div className="flex items-center space-x-2 mt-2">
               <label className="cursor-pointer text-gray-400 hover:text-gray-600 text-xs flex items-center justify-center w-full py-2">
                  <FileText size={14} className="mr-1" />
                  {manualName ? `Attached: ${manualName}` : 'Or attach manual PDF manually'}
                  <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleManualUpload} />
               </label>
            </div>

            <button 
              type="submit" 
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition font-bold shadow-lg mt-2 flex justify-center items-center"
              disabled={isScanning}
            >
              {isScanning ? 'Processing...' : 'Save Appliance & Schedule'}
            </button>
          </div>
        </form>
      )}

      {/* Asset List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.length === 0 && !isAdding && (
          <div className="col-span-full flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
             <ScanLine size={48} className="mb-4 opacity-20" />
             <p className="text-sm">No assets added yet.</p>
             <button onClick={() => setIsAdding(true)} className="mt-2 text-emerald-600 font-medium text-sm hover:underline">
                 Scan your first appliance
             </button>
          </div>
        )}
        {assets.map(asset => (
          <div key={asset.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition relative group bg-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-gray-500 overflow-hidden border border-gray-100 ${asset.category === AssetCategory.OTHER ? 'bg-indigo-50 text-indigo-500' : 'bg-gray-100'}`}>
                   {asset.image ? (
                     <img src={asset.image} alt="asset" className="w-full h-full object-cover" />
                   ) : (
                     <span className="font-bold text-xs">{asset.brand === 'Custom Feature' ? 'F' : asset.brand.substring(0, 2).toUpperCase()}</span>
                   )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{asset.category === AssetCategory.OTHER ? asset.name : asset.category}</h3>
                  <p className="text-xs text-gray-500">{asset.brand === 'Custom Feature' ? 'Custom Feature' : `${asset.brand} ${asset.model}`}</p>
                </div>
              </div>
              <button onClick={() => onDeleteAsset(asset.id)} className="text-gray-300 hover:text-red-500 transition">
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="mt-3 flex flex-wrap gap-2">
                {asset.manual && (
                  <div className="flex items-center text-[10px] text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    <FileText size={10} className="mr-1" />
                    <span>PDF</span>
                  </div>
                )}
                {asset.manualUrl && (
                  <a href={asset.manualUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition border border-emerald-100">
                    <ExternalLink size={10} className="mr-1" />
                    <span>Official Manual</span>
                  </a>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetManager;

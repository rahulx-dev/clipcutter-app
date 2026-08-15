import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Link as LinkIcon, X, FileVideo, Zap, Globe, Sliders, 
  CheckCircle, Clock, Film, Volume2, Sparkles, ArrowRight, Type, Check 
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../App';

const CAPTION_PRESETS = [
  { id: 'hormozi', name: 'Hormozi Yellow', tag: 'VIRAL', previewColor: '#FACC15' },
  { id: 'neon_cyber', name: 'Neon Cyber', tag: 'TRENDING', previewColor: '#22D3EE' },
  { id: 'beast_red', name: 'Beast Red', tag: 'HIGH ENERGY', previewColor: '#EF4444' },
  { id: 'golden_luxury', name: 'Golden Luxury', tag: 'FINANCE', previewColor: '#F59E0B' },
  { id: 'karaoke_green', name: 'Karaoke Glow', tag: 'PODCAST', previewColor: '#84CC16' },
  { id: 'ali_abdaal', name: 'Ali Abdaal Clean', tag: 'PRODUCTIVE', previewColor: '#38BDF8' },
  { id: 'iman_gadzhi', name: 'Iman Noir', tag: 'LUXURY', previewColor: '#FDE68A' },
  { id: 'sunset_orange', name: 'Sunset Flame', tag: 'POPULAR', previewColor: '#FB923C' },
  { id: 'dynamic', name: 'Dynamic Pop', tag: 'BOUNCE', previewColor: '#b8f032' },
  { id: 'retro_arcade', name: 'Retro 8-Bit', tag: 'GAMING', previewColor: '#4ADE80' },
  { id: 'neon_violet', name: 'Neon Violet', tag: 'CYBER', previewColor: '#E879F9' },
  { id: 'electric_blue', name: 'Electric Blue', tag: 'FAST', previewColor: '#60A5FA' },
  { id: 'matrix_terminal', name: 'Matrix Code', tag: 'TECH', previewColor: '#22C55E' },
  { id: 'impact_white', name: 'Impact White', tag: 'CLEAN', previewColor: '#FFFFFF' },
  { id: 'comic_pop', name: 'Comic Pop', tag: 'MEME', previewColor: '#F87171' },
  { id: 'minimal', name: 'Clean Minimal', tag: 'SIMPLE', previewColor: '#E2E8F0' },
];

export default function VideoUploader({ isOpen, onClose, onSuccess }) {
  const [tab, setTab] = useState('upload');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // v3.0 Configurations
  const [captionStyle, setCaptionStyle] = useState('hormozi');
  const [shortsCount, setShortsCount] = useState(4);
  const [languagePref, setLanguagePref] = useState('auto');
  const [editingIntensity, setEditingIntensity] = useState('BALANCED');
  const [oneClickViral, setOneClickViral] = useState(true);

  const { token, refreshUser } = useAuth();

  if (!isOpen) return null;

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.type.includes('video') || dropped.name.endsWith('.mp4') || dropped.name.endsWith('.mov') || dropped.name.endsWith('.webm'))) {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return alert("Please provide a project title");
    
    setUploading(true);
    setProgress(0);

    try {
      let res;
      if (tab === 'upload') {
        if (!file) return alert("Please select a video file");
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        
        res = await axios.post('/api/projects/upload', formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}` 
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        });
      } else {
        if (!url) return alert("Please provide a YouTube video URL");
        res = await axios.post('/api/projects/youtube', { title, url }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setProgress(100);
      }
      
      const createdProject = res.data;

      // Refresh credits immediately so Navbar updates to 2
      if (refreshUser) refreshUser();

      // If One Click Viral Mode is enabled, automatically trigger the pipeline with chosen caption style
      if (oneClickViral && createdProject?.id) {
        try {
          await axios.post(`/api/process/${createdProject.id}`, {
            caption_style: captionStyle,
            shorts_count: shortsCount,
            language_pref: languagePref,
            editing_intensity: editingIntensity
          }, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (procErr) {
          console.error("Auto viral pipeline trigger note:", procErr);
        }
      }

      onSuccess(createdProject);
    } catch (error) {
      console.error("Video submission error:", error);
      if (error.response?.status === 401) {
        alert("Your session expired. Please log in again.");
      } else if (error.response?.status === 403) {
        alert("No credits remaining on your account. Please upgrade your plan in Pricing.");
      } else {
        alert(error.response?.data?.detail || error.response?.data?.message || error.message || "Could not process video submission. Please check your network or URL.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto glass-card-verdant rounded-3xl border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.9)] z-10 bg-[#070c14]/95 text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-[#070c14]/95 backdrop-blur-md z-10">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-[#b8f032]/20 border border-[#b8f032]/40 flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#b8f032] fill-[#b8f032]" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white tracking-tight">Create Viral Short</h2>
                <p className="text-[10px] text-gray-400">Select source, captions and AI pipeline</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Tab switchers */}
            <div className="flex space-x-2 bg-white/[0.04] p-1 rounded-full border border-white/10">
              <button 
                type="button"
                onClick={() => setTab('upload')}
                className={`flex-1 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  tab === 'upload' ? 'bg-white text-black font-extrabold shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5 inline mr-1.5" /> Video File Upload
              </button>
              <button 
                type="button"
                onClick={() => setTab('youtube')}
                className={`flex-1 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  tab === 'youtube' ? 'bg-white text-black font-extrabold shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5 inline mr-1.5" /> YouTube URL
              </button>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1.5">Project Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/60 border border-white/15 rounded-2xl focus:outline-none focus:border-[#b8f032] text-white text-sm"
                placeholder="e.g. Alex Hormozi Podcast Highlights"
                disabled={uploading}
              />
            </div>

            {/* Ingestion Source */}
            {tab === 'upload' ? (
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all ${
                  file 
                    ? 'border-[#b8f032] bg-[#b8f032]/[0.06]' 
                    : 'border-white/15 hover:border-[#b8f032]/50 hover:bg-white/[0.02]'
                }`}
              >
                <input type="file" id="file-upload" className="hidden" accept=".mp4,.mov,.webm" onChange={handleFileSelect} disabled={uploading} />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  {file ? (
                    <>
                      <FileVideo className="w-9 h-9 text-[#b8f032] mb-2" />
                      <p className="text-white font-bold text-sm truncate max-w-xs">{file.name}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1.5">
                        <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                        <span>•</span>
                        <span className="text-[#b8f032] font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Ready
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-gray-200 font-bold text-xs sm:text-sm">Drag and drop your video file here</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Supports MP4, MOV, WebM up to 2GB</p>
                      <span className="mt-3 px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold text-white transition-colors">
                        Browse Files
                      </span>
                    </>
                  )}
                </label>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1.5">YouTube Video URL</label>
                <input 
                  type="url" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/60 border border-white/15 rounded-2xl focus:outline-none focus:border-[#b8f032] text-white text-sm"
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={uploading}
                />
              </div>
            )}

            {/* ── 16 Viral Caption Presets Selection Grid ── */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#b8f032] uppercase tracking-wider">
                  <Type className="w-3.5 h-3.5" /> Choose Caption Style ({CAPTION_PRESETS.length} Presets)
                </span>
                <span className="text-[10px] text-gray-400 font-medium">Selected: <strong className="text-white capitalize">{captionStyle.replace('_', ' ')}</strong></span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {CAPTION_PRESETS.map((preset) => {
                  const isSelected = captionStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setCaptionStyle(preset.id)}
                      className={`p-2 rounded-xl text-left transition-all relative border cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#b8f032]/15 border-[#b8f032] shadow-[0_0_12px_rgba(184,240,50,0.3)]'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span 
                          className="w-2.5 h-2.5 rounded-full inline-block" 
                          style={{ backgroundColor: preset.previewColor }}
                        />
                        {isSelected && <Check className="w-3 h-3 text-[#b8f032] stroke-[3]" />}
                      </div>
                      <p className="text-[11px] font-bold text-white truncate">{preset.name}</p>
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-tight">{preset.tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Configurations (Language & Shorts count) */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-gray-300 border-b border-white/[0.08] pb-2">
                <span className="flex items-center gap-1.5 text-white">
                  <Sliders className="w-3.5 h-3.5" /> AI Pipeline Settings
                </span>
                <span className="text-[10px] text-gray-400 font-normal">v3.0 Config</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Language Mode */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Language AI
                  </label>
                  <select 
                    value={languagePref}
                    onChange={(e) => setLanguagePref(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-black/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#b8f032] cursor-pointer"
                  >
                    <option value="auto">Auto Detect</option>
                    <option value="hi">Hindi</option>
                    <option value="hinglish">Hinglish (Roman Hindi)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                {/* Shorts Count */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Target Shorts
                  </label>
                  <select 
                    value={shortsCount}
                    onChange={(e) => setShortsCount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-black/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#b8f032] cursor-pointer"
                  >
                    <option value={1}>1 Viral Short</option>
                    <option value={4}>4 Viral Shorts</option>
                    <option value={10}>10 Viral Shorts</option>
                    <option value={0}>Max Possible Shorts</option>
                  </select>
                </div>
              </div>

              {/* One Click Viral Mode Toggle */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#b8f032] fill-[#b8f032]" />
                  <div>
                    <p className="text-xs font-bold text-white flex items-center gap-1">One Click Viral Mode</p>
                    <p className="text-[10px] text-gray-400">Auto transcribe, crop 9:16, burn subtitles and rank highlights</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={oneClickViral} 
                  onChange={(e) => setOneClickViral(e.target.checked)}
                  className="w-4 h-4 accent-[#b8f032] cursor-pointer rounded" 
                />
              </div>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-400">
                  <span className="text-white font-bold">Uploading video...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-[#b8f032] h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(184,240,50,0.8)]" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={uploading || (tab === 'upload' ? !file : !url) || !title}
              className="w-full btn-ai-glow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="btn-ai-glow-inner py-3.5 text-xs font-extrabold uppercase tracking-wider w-full">
                {uploading ? (
                  <span>Ingesting Video & Applying {captionStyle.replace('_', ' ').toUpperCase()}...</span>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-white text-white" />
                    <span>Generate Shorts with {captionStyle.replace('_', ' ').toUpperCase()} Captions</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

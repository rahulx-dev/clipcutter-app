import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Play, Pause, Download, Share2, Sparkles, CheckCircle, RefreshCw, 
  ArrowLeft, FileText, Sliders, Zap, ShieldCheck, Flame, MessageSquare, 
  HelpCircle, ChevronRight, Layers, Award, Copy, Check, TrendingUp, AlertTriangle,
  XCircle, Trash2
} from 'lucide-react';
import { useAuth } from '../App';
import CaptionStylePicker from './CaptionStylePicker';
import Cosmic3DBackground from './Cosmic3DBackground';

export default function ClipEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, refreshUser, isAdmin, user } = useAuth();

  const [project, setProject] = useState(null);
  const [clips, setClips] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('hormozi');
  const [shortsCount, setShortsCount] = useState(4);
  const [languagePref, setLanguagePref] = useState('auto');
  const [editingIntensity, setEditingIntensity] = useState('BALANCED');
  const [downloading, setDownloading] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('viral_score');

  useEffect(() => {
    fetchProject();
  }, [id]);

  // Polling loop while processing or downloading
  useEffect(() => {
    let interval;
    if (processing) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`/api/process/${id}/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setProgress(res.data.progress || 0);
          setProgressMsg(res.data.progress_message || 'Processing AI pipeline...');

          if (res.data.status === 'COMPLETED' || res.data.status === 'FAILED' || res.data.status === 'CANCELLED') {
            setProcessing(false);
            fetchProject();
            if (refreshUser) refreshUser();
          }
        } catch (err) {
          console.error("Status polling error", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [processing, id, token]);

  const fetchProject = async () => {
    try {
      const res = await axios.get(`/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProject(res.data);
      setClips(res.data.clips || []);
      if (res.data.clips && res.data.clips.length > 0) {
        setSelectedClip(res.data.clips[0]);
      }
      if (['PROCESSING', 'DOWNLOADING', 'TRANSCRIBING', 'SEGMENTING', 'GENERATING_METADATA'].includes(res.data.status)) {
        setProcessing(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartProcessing = async () => {
    try {
      setProcessing(true);
      const res = await axios.post(`/api/process/${id}`, {
        caption_style: selectedStyle,
        shorts_count: shortsCount,
        language_pref: languagePref,
        editing_intensity: editingIntensity
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.status === 'QUEUED') {
        setProgressMsg(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to start AI generation pipeline");
      setProcessing(false);
    }
  };

  const handleCancelProcessing = async () => {
    if (!window.confirm("Are you sure you want to cancel this video generation?")) return;
    try {
      await axios.post(`/api/process/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProcessing(false);
      fetchProject();
    } catch (err) {
      console.error(err);
      alert("Failed to cancel generation");
    }
  };

  const handleDeleteClip = async (clipId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this short video?")) return;
    try {
      await axios.delete(`/api/clips/${clipId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updated = clips.filter(c => c.id !== clipId);
      setClips(updated);
      if (selectedClip?.id === clipId) {
        setSelectedClip(updated.length > 0 ? updated[0] : null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete clip");
    }
  };

  const handleDownload = async (clip) => {
    if (!clip || !clip.id) return;
    setDownloading(true);
    try {
      const downloadUrl = `/api/clips/${clip.id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const response = await axios.get(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'video/mp4' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const cleanTitle = (clip.title || `clip_${clip.id}`).replace(/[^a-zA-Z0-9_]/g, '_');
      link.download = `${cleanTitle}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Direct download fallback:", err);
      const fallbackUrl = `/api/clips/${clip.id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(fallbackUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleApplyHook = async (hookText) => {
    if (!selectedClip) return;
    try {
      await axios.post(`/api/process/clips/${selectedClip.id}/hook`, {
        hook_text: hookText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedClip({ ...selectedClip, selected_hook: hookText });
      alert("Hook applied! This hook will be featured on your short.");
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <span className="text-white font-semibold text-xs tracking-widest uppercase">Loading Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 relative">
      {/* 3D Cosmic Background */}
      <Cosmic3DBackground particleCount={300} opacity={0.3} speed={0.04} />

      {/* Top Header Navigation */}
      <div className="flex items-center justify-between py-4 mb-6 border-b border-white/[0.08] relative z-10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer btn-premium-shimmer px-4 py-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="flex items-center gap-2">
          {project?.status === 'COMPLETED' && (
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Ready to Export
            </span>
          )}
          {project?.status === 'FAILED' && (
            <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Generation Failed
            </span>
          )}
          {project?.status === 'CANCELLED' && (
            <span className="px-3 py-1 bg-gray-500/10 border border-gray-500/30 rounded-full text-gray-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Cancelled
            </span>
          )}
          <span className="px-3 py-1 bg-white/[0.04] border border-white/10 rounded-full text-gray-300 text-xs font-semibold">
            Project #{id}
          </span>
        </div>
      </div>

      {/* Error / Cancel Banner */}
      {(project?.status === 'FAILED' || project?.status === 'CANCELLED') && !processing && (
        <div className="mb-8 p-5 glass-authkit rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">
                {project?.status === 'CANCELLED' ? 'Generation Cancelled' : 'Generation Note'}
              </h4>
              <p className="text-xs text-gray-300">{project?.error_message || project?.progress_message || "Project is ready to be processed."}</p>
            </div>
          </div>
          <button
            onClick={handleStartProcessing}
            className="btn-pill-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap"
          >
            Start Generation
          </button>
        </div>
      )}

      {/* Main Studio Layout */}
      {processing ? (
        /* Processing Screen with Cancel Button */
        <div className="glass-authkit rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto my-12 relative">
          <div className="corner-dot corner-dot-tl"></div>
          <div className="corner-dot corner-dot-tr"></div>
          <div className="corner-dot corner-dot-bl"></div>
          <div className="corner-dot corner-dot-br"></div>

          <div className="w-16 h-16 rounded-3xl bg-white/[0.06] border border-white/15 flex items-center justify-center mx-auto mb-5 text-white">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">
            AI is Crafting Your <span className="font-serif-italic">Viral Shorts</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mb-8 leading-relaxed">
            Whisper voice transcription, facial tracking, 9:16 vertical cropping, and caption styling are running at peak speed.
          </p>

          <div className="space-y-3 mb-8">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-white">{progressMsg || "Analyzing video stream..."}</span>
              <span className="text-white">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                style={{ width: `${Math.max(5, progress)}%` }}
              ></div>
            </div>
          </div>

          {/* Cancel Generation Button */}
          <button
            onClick={handleCancelProcessing}
            className="btn-pill-glass px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300 hover:border-red-500/40 cursor-pointer flex items-center gap-2 mx-auto"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel Generation</span>
          </button>
        </div>
      ) : clips.length === 0 ? (
        /* Professional Dedicated Caption Studio & Setup Screen */
        <div className="space-y-8 max-w-5xl mx-auto py-4">
          {/* Source Video Ingested Summary Card */}
          <div className="glass-card-verdant p-5 sm:p-6 rounded-3xl border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#b8f032]/20 border border-[#b8f032]/40 flex items-center justify-center text-[#b8f032] flex-shrink-0 shadow-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#b8f032] bg-[#b8f032]/10 px-2 py-0.5 rounded-md border border-[#b8f032]/30">
                  {project?.source_type || 'SOURCE'} VIDEO READY
                </span>
                <h2 className="text-base sm:text-lg font-black text-white mt-1 line-clamp-1">{project?.title || 'Your Video Project'}</h2>
                <p className="text-xs text-gray-400">Choose your animated caption styling below to create vertical 9:16 shorts.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="text-xs font-semibold text-gray-400 bg-white/[0.04] px-3 py-1.5 rounded-full border border-white/10">
                1 Credit Required
              </span>
            </div>
          </div>

          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b8f032]/10 border border-[#b8f032]/30 text-[#b8f032] text-[11px] font-black uppercase tracking-widest mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Step 2: Choose Template
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 tracking-tight">
              Select a <span className="font-serif-italic text-[#b8f032]">Design</span>
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm max-w-xl mx-auto">
              Choose from 28 high-retention viral auto-caption designs. Click any template to preview its styling before generating.
            </p>
          </div>

          {/* 16 Interactive Caption Cards */}
          <CaptionStylePicker selected={selectedStyle} onSelect={setSelectedStyle} />

          {/* AI Pipeline Customization Settings */}
          <div className="glass-card-verdant p-5 rounded-3xl border border-white/15 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Sliders className="w-4 h-4 text-[#b8f032]" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">AI Shorts Parameters</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Language Selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Spoken Language AI
                </label>
                <select 
                  value={languagePref}
                  onChange={(e) => setLanguagePref(e.target.value)}
                  className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#b8f032] cursor-pointer"
                >
                  <option value="auto">Auto Detect Language</option>
                  <option value="hi">Hindi (हिंदी)</option>
                  <option value="hinglish">Hinglish (Roman Hindi)</option>
                  <option value="en">English (US/UK)</option>
                </select>
              </div>

              {/* Target Shorts Count */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Output Shorts Count
                </label>
                <select 
                  value={shortsCount}
                  onChange={(e) => setShortsCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#b8f032] cursor-pointer"
                >
                  <option value={1}>1 Viral Short</option>
                  <option value={4}>4 Viral Shorts (Recommended)</option>
                  <option value={10}>10 Viral Shorts</option>
                  <option value={0}>Max Possible Highlights</option>
                </select>
              </div>

              {/* Editing Intensity */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Visual Pacing
                </label>
                <select 
                  value={editingIntensity}
                  onChange={(e) => setEditingIntensity(e.target.value)}
                  className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-[#b8f032] cursor-pointer"
                >
                  <option value="BALANCED">Balanced Flow (Standard)</option>
                  <option value="AGGRESSIVE">High Energy Fast Cuts</option>
                  <option value="MINIMAL">Cinematic Minimal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action CTA Button */}
          <div className="flex justify-center pt-2 pb-8">
            <button
              onClick={handleStartProcessing}
              className="btn-ai-glow cursor-pointer shadow-2xl scale-105 hover:scale-110 transition-transform"
            >
              <div className="btn-ai-glow-inner px-12 py-4 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-3">
                <Zap className="w-5 h-5 fill-white text-white" />
                <span>Generate {shortsCount || 4} Shorts with {selectedStyle.replace('_', ' ').toUpperCase()} (1 Credit)</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* Completed Studio Workspace with 3-Column Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Clips Selector (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1 flex items-center justify-between">
              <span>Generated Shorts ({clips.length})</span>
              <span className="text-white">Top Ranked</span>
            </h3>

            <div className="space-y-2.5">
              {clips.map((clip, idx) => {
                const isSelected = selectedClip?.id === clip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={() => setSelectedClip(clip)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border relative group ${
                      isSelected 
                        ? 'bg-white/[0.08] border-white shadow-[0_0_20px_rgba(255,255,255,0.15)]' 
                        : 'glass-authkit border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-white">
                        Short #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-white" />
                          <span>{clip.viral_score || 85}/100</span>
                        </span>
                        {/* Delete Single Short Button */}
                        <button
                          onClick={(e) => handleDeleteClip(clip.id, e)}
                          className="p-1 rounded-md text-gray-400 hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="Delete Short"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-white line-clamp-2 mb-1.5">
                      {clip.title || `Viral Short #${idx + 1}`}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>{clip.duration}s</span>
                      <span className="uppercase text-gray-300 font-semibold">{clip.caption_style}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Column: 9:16 Video Player (4 cols) */}
          <div className="lg:col-span-4 flex flex-col items-center">
            <div className="w-full max-w-[320px] aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-white/15 shadow-2xl relative">
              {selectedClip ? (
                <video 
                  key={selectedClip.id}
                  src={`/api/clips/${selectedClip.id}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`}
                  controls 
                  playsInline
                  autoPlay
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                  Select a short to preview
                </div>
              )}
            </div>

            {/* Quick Actions Under Player */}
            {selectedClip && (
              <div className="w-full max-w-[320px] mt-4 flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedClip)}
                  disabled={downloading}
                  className="flex-1 btn-ai-glow cursor-pointer disabled:opacity-50"
                >
                  <div className="btn-ai-glow-inner py-3 text-xs w-full">
                    <Download className="w-4 h-4 stroke-[3]" />
                    <span>{downloading ? 'Downloading...' : 'Download MP4'}</span>
                  </div>
                </button>
                <button
                  onClick={() => handleDeleteClip(selectedClip.id)}
                  className="p-3 rounded-full btn-pill-glass text-gray-400 hover:text-red-400 cursor-pointer flex items-center justify-center transition-colors"
                  title="Delete Video"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Intelligence Suite (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Tabs */}
            <div className="flex bg-white/[0.04] p-1 rounded-full border border-white/10">
              <button
                onClick={() => setActiveTab('viral_score')}
                className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === 'viral_score' ? 'bg-white text-black font-extrabold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Viral Score
              </button>
              <button
                onClick={() => setActiveTab('hooks')}
                className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === 'hooks' ? 'bg-white text-black font-extrabold' : 'text-gray-400 hover:text-white'
                }`}
              >
                AI Hooks
              </button>
              <button
                onClick={() => setActiveTab('seo')}
                className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === 'seo' ? 'bg-white text-black font-extrabold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Titles and SEO
              </button>
            </div>

            {/* Tab 1: Viral Score Breakdown */}
            {activeTab === 'viral_score' && selectedClip && (
              <div className="glass-authkit p-5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">AI Viral Rating</span>
                    <h3 className="text-2xl font-extrabold text-white flex items-center gap-2">
                      <span>{selectedClip.viral_score || 85}</span>
                      <span className="text-xs text-gray-500 font-normal">/ 100</span>
                    </h3>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-white/[0.08] border border-white/20 text-white text-[10px] font-bold uppercase">
                    High Retention
                  </div>
                </div>

                {/* Sub-Score Gauges */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-gray-300 text-[11px]">
                    <span>Hook Strength</span>
                    <span className="font-bold text-white">18 / 20</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div className="bg-white h-1.5 rounded-full" style={{ width: '90%' }}></div>
                  </div>

                  <div className="flex justify-between items-center text-gray-300 text-[11px] pt-1">
                    <span>Retention Potential</span>
                    <span className="font-bold text-white">17 / 20</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div className="bg-white h-1.5 rounded-full" style={{ width: '85%' }}></div>
                  </div>

                  <div className="flex justify-between items-center text-gray-300 text-[11px] pt-1">
                    <span>Pacing and Energy</span>
                    <span className="font-bold text-white">14 / 15</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5">
                    <div className="bg-white h-1.5 rounded-full" style={{ width: '93%' }}></div>
                  </div>
                </div>

                {/* AI Explanation Box */}
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
                  <p className="text-[11px] font-bold text-white mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" /> AI Reason for Selection:
                  </p>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    "{selectedClip.ai_explanation || 'Selected because the speaker opens with high energy and delivers a complete takeaway message.'}"
                  </p>
                </div>

                {/* Quality Check Status */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-white/[0.06]">
                  <span className="flex items-center gap-1 text-emerald-400"><ShieldCheck className="w-3.5 h-3.5" /> Subtitles Synced</span>
                  <span className="flex items-center gap-1 text-emerald-400"><ShieldCheck className="w-3.5 h-3.5" /> Audio Normalized</span>
                  <span className="flex items-center gap-1 text-emerald-400"><ShieldCheck className="w-3.5 h-3.5" /> 9:16 Safe Margin</span>
                </div>
              </div>
            )}

            {/* Tab 2: AI Hooks Switcher */}
            {activeTab === 'hooks' && selectedClip && (
              <div className="glass-authkit p-5 rounded-3xl space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-400" /> 6 Alternative AI Hooks
                  </span>
                  <span className="text-[10px] text-gray-400">Click to apply</span>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {(selectedClip.hooks || []).map((h, i) => (
                    <div 
                      key={i}
                      onClick={() => handleApplyHook(h.text)}
                      className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/30 cursor-pointer transition-all flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase text-blue-300">
                          {h.label || h.category}
                        </span>
                        <span className="text-[10px] text-gray-400 group-hover:text-white transition-colors">Apply</span>
                      </div>
                      <p className="text-xs text-gray-200 font-medium leading-snug">"{h.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: AI Titles & SEO Suite */}
            {activeTab === 'seo' && selectedClip && (
              <div className="glass-authkit p-5 rounded-3xl space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Suggested Viral Title Options
                  </label>
                  <div className="space-y-2">
                    {(selectedClip.seo_titles || [selectedClip.title]).map((t, idx) => (
                      <div 
                        key={idx}
                        className="p-2.5 bg-white/[0.02] border border-white/10 rounded-xl flex items-center justify-between text-xs text-gray-200 hover:border-white/30 transition-all"
                      >
                        <span className="truncate max-w-[280px] font-medium">{t}</span>
                        <button 
                          onClick={() => copyToClipboard(t)}
                          className="text-gray-400 hover:text-white p-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Hashtags and Keywords
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedClip.hashtags || ["#Shorts", "#Viral", "#FYP", "#Trending"]).map((tag, i) => (
                      <span key={i} className="px-2.5 py-1 bg-white/[0.04] border border-white/10 rounded-full text-[11px] text-gray-200 font-semibold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

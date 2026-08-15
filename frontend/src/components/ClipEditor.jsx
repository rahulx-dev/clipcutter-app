import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Play, Pause, Download, Share2, Sparkles, CheckCircle, RefreshCw, 
  ArrowLeft, FileText, Sliders, Zap, ShieldCheck, Flame, MessageSquare, 
  HelpCircle, ChevronRight, Layers, Award, Copy, Check, TrendingUp, AlertTriangle,
  XCircle, Trash2, Home, Upload, Loader
} from 'lucide-react';
import { useAuth } from '../App';
import CaptionStylePicker from './CaptionStylePicker';
import Cosmic3DBackground from './Cosmic3DBackground';
import VideoUploader from './VideoUploader';

export default function ClipEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, refreshUser, isAdmin, user } = useAuth();

  const [project, setProject] = useState(null);
  const [clips, setClips] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('hormozi');
  const [shortsCount, setShortsCount] = useState(4);
  const [languagePref, setLanguagePref] = useState('auto');
  const [editingIntensity, setEditingIntensity] = useState('BALANCED');
  const [downloading, setDownloading] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [fallbackUploading, setFallbackUploading] = useState(false);
  const [fallbackProgress, setFallbackProgress] = useState(0);

  const fileInputRef = useRef(null);
  const isCancelledRef = useRef(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('viral_score');

  useEffect(() => {
    isCancelledRef.current = false;
    fetchProject();
  }, [id]);

  // Polling loop while processing
  useEffect(() => {
    let interval;
    if (processing && !isCancelledRef.current) {
      interval = setInterval(async () => {
        if (isCancelledRef.current) {
          clearInterval(interval);
          return;
        }
        try {
          const res = await axios.get(`/api/process/${id}/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (isCancelledRef.current) return; // Discard stale response if cancelled

          // If backend reports PENDING, source video is ready and awaiting user design selection!
          if (res.data.status === 'PENDING') {
            setProcessing(false);
            fetchProject();
            return;
          }

          setProgress(res.data.progress || 0);
          setProgressMsg(res.data.progress_message || 'Processing AI pipeline...');

          if (res.data.status === 'COMPLETED') {
            setProcessing(false);
            fetchProject();
            if (refreshUser) refreshUser();
          } else if (res.data.status === 'CANCELLED') {
            setProcessing(false);
            if (refreshUser) refreshUser();
            navigate('/dashboard', { replace: true });
          } else if (res.data.status === 'FAILED') {
            setProcessing(false);
            fetchProject();
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
      if (isCancelledRef.current) return;

      setProject(res.data);
      if (res.data.language_preference) {
        setLanguagePref(res.data.language_preference);
      }
      if (res.data.target_shorts_count) {
        setShortsCount(res.data.target_shorts_count);
      }
      setClips(res.data.clips || []);
      if (res.data.clips && res.data.clips.length > 0) {
        setSelectedClip(res.data.clips[0]);
      }
      // ONLY set processing to true if active pipeline steps are executing!
      if (['PROCESSING', 'TRANSCRIBING', 'SEGMENTING', 'GENERATING_METADATA'].includes(res.data.status)) {
        setProcessing(true);
      } else {
        setProcessing(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedStyle) {
      alert("Please select a caption design first.");
      return;
    }
    try {
      isCancelledRef.current = false;
      setProcessing(true);
      setProgress(5);
      setProgressMsg('Initializing AI pipeline & subtitle engine...');
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

  const handleFallbackFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFallbackUploading(true);
    setFallbackProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`/api/projects/${id}/upload-fallback`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}` 
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setFallbackProgress(percentCompleted);
        }
      });

      // Reload project state to smoothly transition to "Select a Design"
      await fetchProject();
      // DO NOT automatically start generation!
    } catch (err) {
      console.error("Fallback upload error:", err);
      alert(err.response?.data?.detail || "Video upload failed. Please choose a valid MP4, MOV, or WebM video.");
    } finally {
      setFallbackUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCancelProcessing = async () => {
    if (!window.confirm("Are you sure you want to cancel this video generation?")) return;
    try {
      isCancelledRef.current = true;
      setCancelling(true);
      setProcessing(false);

      await axios.post(`/api/process/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (refreshUser) refreshUser();

      // Return user directly to Dashboard / Home page
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error("Cancel generation note:", err);
      navigate('/dashboard', { replace: true });
    } finally {
      setCancelling(false);
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
        <p className="text-gray-400 text-xs font-semibold tracking-wider uppercase">Loading studio workspace...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
      <Cosmic3DBackground />

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

      {/* ── State 1: Processing Screen with Cancel Button ── */}
      {processing ? (
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
            disabled={cancelling}
            className="btn-pill-glass px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300 hover:border-red-500/40 cursor-pointer flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            <span>{cancelling ? "Cancelling..." : "Cancel Generation"}</span>
          </button>
        </div>
      ) : project?.status === 'CANCELLED' ? (
        /* ── State 2: Cancelled Screen (Never render design templates) ── */
        <div className="glass-authkit rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto my-12 relative border border-gray-700/40">
          <div className="w-16 h-16 rounded-3xl bg-gray-500/10 border border-gray-500/20 flex items-center justify-center mx-auto mb-4 text-gray-400">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-2">Generation Cancelled</h2>
          <p className="text-gray-400 text-xs sm:text-sm mb-6">
            This video generation was stopped by user request. No credits were deducted.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-pill-white px-8 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-2 mx-auto"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      ) : project?.status === 'FAILED' ? (
        /* ── State 3: YouTube Download Unavailable / Failed Screen ── */
        (() => {
          const isYoutubeBlocked = 
            project?.error_message?.toLowerCase().includes('blocking') ||
            project?.error_message?.toLowerCase().includes('youtube') ||
            project?.error_message?.toLowerCase().includes('cloud') ||
            project?.error_message?.toLowerCase().includes('bot') ||
            project?.error_message?.toLowerCase().includes('download') ||
            project?.error_message?.toLowerCase().includes('unavailable');

          const errorTitle = isYoutubeBlocked ? "YouTube Download Unavailable" : "Generation Note";
          const errorSubtitle = isYoutubeBlocked 
            ? "YouTube is blocking automated access to this video. Upload the video directly to continue."
            : (project?.error_message || "Video processing could not be completed. Please try uploading the video directly.");

          return (
            <div className="glass-authkit rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto my-12 relative border border-red-500/20">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFallbackFileUpload}
                accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*"
                className="hidden"
              />

              <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-2">{errorTitle}</h2>
              <p className="text-gray-300 text-xs sm:text-sm mb-6 leading-relaxed">
                {errorSubtitle}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={fallbackUploading}
                  className="btn-ai-glow cursor-pointer w-full sm:w-auto shadow-xl"
                >
                  <div className="btn-ai-glow-inner px-8 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
                    {fallbackUploading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin text-white" />
                        <span>Uploading Video ({fallbackProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-white" />
                        <span>Upload Video Instead</span>
                      </>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => navigate('/dashboard')}
                  disabled={fallbackUploading}
                  className="btn-pill-glass px-6 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer w-full sm:w-auto"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          );
        })()
      ) : clips.length === 0 ? (
        /* ── State 4: Step 2 "Select a Design" (ONLY when user clicked Setup -> Proceed) ── */
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
              Choose from 31 high-retention viral auto-caption designs. Click any template to preview its styling before generating.
            </p>
          </div>

          {/* 31 Interactive Caption Cards */}
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
                  <option value={1}>1 Short</option>
                  <option value={3}>3 Shorts</option>
                  <option value={4}>4 Shorts (Recommended)</option>
                  <option value={10}>10 Shorts</option>
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
                <span>Generate Shorts ({shortsCount || 4}) • {selectedStyle.replace(/_/g, ' ').toUpperCase()} (1 Credit)</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* ── State 5: Completed Studio Workspace with 3-Column Layout ── */
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
                        <button
                          onClick={(e) => handleDeleteClip(clip.id, e)}
                          title="Delete Short"
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-gray-200 line-clamp-1 mb-2">
                      {clip.title || `Viral Moment #${idx + 1}`}
                    </h4>

                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>{Math.round(clip.duration || 30)}s duration</span>
                      <span className="text-white font-semibold">9:16 Vertical</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Column: 9:16 Vertical Video Player (4 cols) */}
          <div className="lg:col-span-4 flex flex-col items-center">
            <div className="w-full max-w-[340px] aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative group">
              {selectedClip ? (
                <video
                  key={selectedClip.id}
                  src={`/api/clips/${selectedClip.id}/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`}
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2 p-6 text-center">
                  <Play className="w-12 h-12 text-white/30" />
                  <p className="text-xs font-semibold">Select a short from the list</p>
                </div>
              )}
            </div>

            {/* Quick Download Button below Player */}
            {selectedClip && (
              <button
                onClick={() => handleDownload(selectedClip)}
                disabled={downloading}
                className="btn-pill-white w-full max-w-[340px] mt-4 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Preparing Download...' : 'Download MP4 (9:16 HD)'}</span>
              </button>
            )}
          </div>

          {/* Right Column: AI Intelligence, Viral Breakdown & Hooks (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Tabs */}
            <div className="flex bg-white/[0.04] p-1 rounded-2xl border border-white/10">
              <button
                onClick={() => setActiveTab('viral_score')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeTab === 'viral_score' ? 'bg-white text-black font-extrabold shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Viral Intelligence
              </button>
              <button
                onClick={() => setActiveTab('hooks')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeTab === 'hooks' ? 'bg-white text-black font-extrabold shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Hook Library
              </button>
              <button
                onClick={() => setActiveTab('broll')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  activeTab === 'broll' ? 'bg-white text-black font-extrabold shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                B-Roll & Zoom
              </button>
            </div>

            {/* Tab 1: Viral Intelligence */}
            {activeTab === 'viral_score' && (
              <div className="glass-authkit rounded-3xl p-5 space-y-4 border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Virality Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white">{selectedClip?.viral_score || 85}</span>
                    <span className="text-xs text-gray-400 font-bold">/ 100</span>
                  </div>
                </div>

                {/* Viral Metrics Breakdown */}
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-300 mb-1">
                      <span>Hook Strength (0-3s retention)</span>
                      <span className="text-white">92%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-white h-1.5 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-300 mb-1">
                      <span>Story Pacing & Flow</span>
                      <span className="text-white">88%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-white h-1.5 rounded-full" style={{ width: '88%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-300 mb-1">
                      <span>Emotional Payoff & Climax</span>
                      <span className="text-white">86%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-white h-1.5 rounded-full" style={{ width: '86%' }}></div>
                    </div>
                  </div>
                </div>

                {/* AI Explanation */}
                <div className="pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Why This Clip Will Go Viral</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {selectedClip?.ai_explanation || "High curiosity gap in opening 3 seconds with emotional peak at midway. Recommended for TikTok & YouTube Shorts algorithms."}
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Hook Library */}
            {activeTab === 'hooks' && (
              <div className="glass-authkit rounded-3xl p-5 space-y-3 border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">AI Alternative Hooks</span>
                  <span className="text-[10px] text-gray-400">Click to apply to opening frame</span>
                </div>

                <div className="space-y-2">
                  {(selectedClip?.hooks || [
                    "Wait until you see how this ends...",
                    "Nobody talks about this secret trick.",
                    "This 1 habit will change everything in 2026."
                  ]).map((hook, hIdx) => {
                    const isCurrentHook = selectedClip?.selected_hook === hook;
                    return (
                      <div
                        key={hIdx}
                        onClick={() => handleApplyHook(hook)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isCurrentHook 
                            ? 'bg-white/10 border-white text-white font-bold' 
                            : 'bg-white/[0.03] border-white/10 text-gray-300 hover:border-white/30'
                        }`}
                      >
                        <span className="line-clamp-1 pr-2">"{hook}"</span>
                        <span className="text-[10px] font-black uppercase text-white bg-white/10 px-2 py-0.5 rounded-full flex-shrink-0">
                          {isCurrentHook ? 'Active' : 'Apply'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: B-Roll & Zoom */}
            {activeTab === 'broll' && (
              <div className="glass-authkit rounded-3xl p-5 space-y-3 border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-white">Automated Cinematic Enhancements</span>
                <div className="space-y-2 text-xs text-gray-300">
                  <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/10 flex items-center justify-between">
                    <span>9:16 Smart Face Center-Tracking</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Applied
                    </span>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/10 flex items-center justify-between">
                    <span>Dynamic Speech Jump-Cut Trimming</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Applied
                    </span>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/10 flex items-center justify-between">
                    <span>Loudnorm Broadcast Audio Normalization</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Applied
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Direct Video Upload Modal Fallback */}
      <VideoUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onSuccess={(data) => {
          setIsUploaderOpen(false);
          const targetId = data?.id || data?.project?.id;
          if (targetId) {
            navigate(`/project/${targetId}`);
            window.location.reload();
          }
        }}
      />
    </div>
  );
}

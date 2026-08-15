import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Video, PlayCircle, Loader, Scissors, CheckCircle, ArrowRight, 
  Activity, ShieldCheck, ChevronRight, RefreshCw, Sparkles, Zap, 
  Search, Trash2, ExternalLink, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import VideoUploader from '../components/VideoUploader';
import Hero3DCanvas from '../components/Hero3DCanvas';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'PROCESSING'
  const [currentSlide, setCurrentSlide] = useState(0);

  // Hero Animated Subtitle Words
  const [captionWordIdx, setCaptionWordIdx] = useState(0);
  const heroWords = ["THIS", "ONE", "AI", "SYSTEM", "GENERATED", "1.2M", "VIEWS", "IN", "48", "HOURS"];

  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  // Cycle simulated hero caption words
  useEffect(() => {
    const timer = setInterval(() => {
      setCaptionWordIdx((prev) => (prev + 1) % heroWords.length);
    }, 550);
    return () => clearInterval(timer);
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(res.data) ? res.data : (res.data.projects || []);
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project and all its clips?")) return;
    try {
      await axios.delete(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete project");
    }
  };

  const statusColors = {
    PENDING: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    DOWNLOADING: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    TRANSCRIBING: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    SEGMENTING: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    PROCESSING: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    GENERATING_METADATA: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
    FAILED: 'bg-red-500/10 text-red-300 border-red-500/30',
    CANCELLED: 'bg-gray-500/10 text-gray-400 border-gray-500/30'
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = (p.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'COMPLETED') return matchesSearch && p.status === 'COMPLETED';
    if (activeFilter === 'PROCESSING') return matchesSearch && ['PROCESSING', 'DOWNLOADING', 'TRANSCRIBING', 'SEGMENTING', 'GENERATING_METADATA', 'PENDING'].includes(p.status);
    return matchesSearch;
  });

  return (
    <div className="min-h-screen obsidian-mesh-bg text-white pb-24 overflow-hidden relative">
      
      {/* ── 3D HERO STAGE: Three.js Interactive Morphing Sphere & Starfield ─ */}
      <section className="relative min-h-[90vh] flex flex-col justify-between items-center text-center px-4 pt-10 pb-16 overflow-hidden">
        
        {/* Three.js 3D WebGL Canvas Layer */}
        <Hero3DCanvas />

        {/* Ambient Top Glow Cone */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-b from-[#1488b8]/20 via-[#6366f1]/10 to-transparent rounded-full blur-[120px] pointer-events-none z-0"></div>

        {/* Top Floating Badge */}
        <div className="relative z-10 pt-2">
          <motion.div 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="badge-linear-beacon inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full cursor-default"
          >
            <span className="w-2 h-2 rounded-full bg-[#b8f032] animate-pulse shadow-[0_0_12px_#b8f032]"></span>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#b8f032]">
              Version 3.0 Live
            </span>
            <span className="text-gray-400 text-xs">·</span>
            <span className="text-gray-300 text-xs font-medium">Whisper Voice AI + NVENC Engine</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          </motion.div>
        </div>

        {/* Central 3D Typography & Headline (Awwwards Style) */}
        <div className="relative z-10 max-w-4xl mx-auto my-auto space-y-6">
          
          {/* Super Wide Tracked Monospace Brand Label */}
          <motion.p 
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.45em" }}
            transition={{ duration: 0.8 }}
            className="text-[11px] sm:text-xs font-mono uppercase text-gray-400 tracking-[0.45em] select-none"
          >
            C L I P C U T T E R
          </motion.p>

          {/* Main Huge Headline */}
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-extrabold text-white tracking-tight leading-[1.02] drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          >
            Shorts that <br />
            <span className="font-serif-italic font-normal text-[#b8f032] text-6xl sm:text-8xl lg:text-9xl tracking-normal inline-block">
              grow
            </span> with you.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-300 text-xs sm:text-sm md:text-base max-w-xl mx-auto leading-relaxed font-medium"
          >
            Transform full length videos and YouTube URLs into viral 9:16 vertical shorts with face tracking, synchronized animated captions, and viral metadata.
          </motion.p>

          {/* Luxury Action Buttons (Like Reference Image "JOIN US") */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-4"
          >
            {/* Primary Glowing Button */}
            <button 
              onClick={() => setIsUploaderOpen(true)}
              className="btn-luxury-outline group"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#b8f032]" />
                <span>Create New Short</span>
              </span>
            </button>

            {/* Auto Caption Studio Button */}
            <button 
              onClick={() => navigate('/caption-editor')}
              className="btn-pill-glass px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white cursor-pointer flex items-center gap-2"
            >
              <span>Auto Caption Studio</span>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </motion.div>

        </div>

        {/* Carousel Pagination Dots (Like Reference Image) */}
        <div className="relative z-10 flex items-center justify-center gap-2 pt-4">
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                currentSlide === idx ? 'w-6 bg-white shadow-[0_0_8px_#ffffff]' : 'w-1.5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

      </section>


      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 relative z-10">
        
        {/* ── INTERACTIVE 9:16 LIVE SHOWCASE SECTION ────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center card-linear-glass rounded-3xl p-8 sm:p-12 border-white/15">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b8f032]/10 border border-[#b8f032]/30 text-[11px] font-extrabold uppercase tracking-wider text-[#b8f032]">
              <Zap className="w-3.5 h-3.5 fill-[#b8f032]" />
              <span>Real Time AI Engine</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              From Raw Video to <br />
              <span className="font-serif-italic text-[#b8f032]">Viral Perfection</span>
            </h2>

            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              Whisper voice transcription, OpenCV face tracking, 9:16 vertical smart cropping, and broadcast subtitle burning running simultaneously in a single-pass NVENC pipeline.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Retention Score</span>
                <p className="text-xl font-black text-[#b8f032] mt-0.5">96.4 / 100</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Processing Time</span>
                <p className="text-xl font-black text-white mt-0.5">38 Seconds</p>
              </div>
            </div>
          </div>

          {/* Interactive Phone Mockup */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-[290px] aspect-[9/16] rounded-3xl p-2.5 bg-black border border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.95)] relative overflow-hidden flex flex-col justify-between">
              
              {/* Top HUD */}
              <div className="flex items-center justify-between z-10 p-2">
                <span className="px-2 py-0.5 rounded-full bg-black/80 border border-[#b8f032]/40 text-[9px] font-extrabold text-[#b8f032]">
                  ⚡ 96.4 VIRAL
                </span>
                <span className="text-[9px] font-mono text-gray-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                  9:16 REC
                </span>
              </div>

              {/* Simulated Face Bounding Frame */}
              <div className="my-auto mx-auto w-32 h-40 rounded-2xl border border-dashed border-[#b8f032]/40 relative flex items-center justify-center">
                <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#b8f032]"></div>
                <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#b8f032]"></div>
                <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#b8f032]"></div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[#b8f032]"></div>
                <span className="text-[8px] font-mono text-[#b8f032] uppercase tracking-widest bg-black/70 px-1 py-0.5 rounded">
                  FACE LOCK 99%
                </span>
              </div>

              {/* Dynamic Subtitle Burning Simulation */}
              <div className="z-10 p-2 text-center space-y-1.5">
                <div className="bg-black/90 px-3 py-2 rounded-xl border border-white/20">
                  <p className="text-[11px] font-black tracking-tight leading-snug uppercase">
                    {heroWords.map((word, i) => (
                      <span 
                        key={i} 
                        className={`inline-block mx-0.5 transition-all duration-200 ${
                          i === captionWordIdx 
                            ? 'text-[#b8f032] scale-110 font-extrabold' 
                            : 'text-white/80'
                        }`}
                      >
                        {word}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ── LINEAR FEATURE BENTO GRID ─────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: 9:16 Centering */}
          <div className="card-linear-glass rounded-3xl p-6 flex flex-col justify-between">
            <div className="corner-dot corner-dot-tl"></div>
            <div className="corner-dot corner-dot-tr"></div>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-white">
                  <Scissors className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-white">Smart 9:16 Centering</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                OpenCV face tracking calculates speaker bounding coordinates, keeping your subject centered with smooth camera panning.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-gray-400">
              <span>Aspect Ratio</span>
              <span className="text-[#b8f032] font-mono font-bold">9:16 Safe Margin</span>
            </div>
          </div>

          {/* Card 2: Viral Retention Highlight */}
          <div className="card-linear-glass rounded-3xl p-6 flex flex-col justify-between">
            <div className="corner-dot corner-dot-tl"></div>
            <div className="corner-dot corner-dot-tr"></div>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-white">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-white">Viral Highlight Curve</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Calculates hook velocity, conversational intensity, and emotional peaks to automatically slice top retention shorts.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.06]">
              <div className="w-full h-8 flex items-end">
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path d="M 0,25 Q 25,28 40,12 T 75,18 T 100,2" fill="none" stroke="#b8f032" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 3: 16 Caption Presets */}
          <div className="card-linear-glass rounded-3xl p-6 flex flex-col justify-between">
            <div className="corner-dot corner-dot-tl"></div>
            <div className="corner-dot corner-dot-tr"></div>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-white">16 Caption Presets</h3>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Alex Hormozi, Neon Cyber, Beast Red, Golden Luxury and more with word by word synchronized animations.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.06] flex flex-wrap gap-1.5">
              {['Hormozi', 'Neon Cyber', 'Karaoke', 'Beast Red'].map((tag, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-semibold text-gray-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>


        {/* ── PROJECTS LIBRARY: Raycast-Style Fast Grid ─────────────────────── */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                Project Library
              </h2>
              <p className="text-gray-400 text-xs mt-0.5">Manage and export your generated short videos</p>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="pl-8 pr-3 py-1.5 bg-black/50 border border-white/10 rounded-full text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30 w-44 sm:w-56"
                />
              </div>

              <div className="flex bg-white/[0.04] p-0.5 rounded-full border border-white/5 text-[11px] font-semibold">
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    activeFilter === 'ALL' ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All ({projects.length})
                </button>
                <button
                  onClick={() => setActiveFilter('COMPLETED')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    activeFilter === 'COMPLETED' ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Ready
                </button>
              </div>

              <button
                onClick={fetchProjects}
                title="Refresh Library"
                className="p-2 btn-pill-glass text-gray-300 hover:text-white cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#b8f032]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 gap-3">
              <Loader className="w-8 h-8 text-[#b8f032] animate-spin" />
              <p className="text-xs text-gray-400">Loading your project library...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="card-linear-glass rounded-3xl p-12 sm:p-16 text-center max-w-xl mx-auto my-8">
              <div className="w-14 h-14 bg-white/[0.06] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/15 text-white">
                <Scissors className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No projects found</h3>
              <p className="text-gray-400 text-xs sm:text-sm mb-6 max-w-md mx-auto leading-relaxed">
                {searchQuery ? "No projects match your search query." : "Upload an MP4 or MOV file, or paste a YouTube URL to generate 9:16 vertical shorts automatically."}
              </p>
              <button 
                onClick={() => setIsUploaderOpen(true)}
                className="btn-luxury-outline cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#b8f032]" />
                  <span>Create Your First Short</span>
                </span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="card-linear-glass p-5 rounded-3xl cursor-pointer hover:border-white/30 transition-all duration-200 group flex flex-col justify-between relative"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[project.status] || statusColors.PENDING}`}>
                        {project.status}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        {project.source_type === 'YOUTUBE' ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                            <PlayCircle className="w-3 h-3" />
                            <span>YouTube</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                            <Video className="w-3 h-3" />
                            <span>Upload</span>
                          </div>
                        )}

                        <button
                          onClick={(e) => handleDeleteProject(project.id, e)}
                          className="p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-2 line-clamp-2 group-hover:text-white transition-colors">
                      {project.title || "Untitled Project"}
                    </h3>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-gray-400">
                    <span className="font-extrabold text-[#b8f032]">
                      {project.clips_count ? `${project.clips_count} Shorts Ready` : '0 Shorts'}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {project.created_at ? new Date(project.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* Upload Modal */}
      <VideoUploader 
        isOpen={isUploaderOpen} 
        onClose={() => setIsUploaderOpen(false)} 
        onSuccess={(data) => {
          setIsUploaderOpen(false);
          fetchProjects();
          const targetId = data?.id || data?.project?.id;
          if (targetId) {
            navigate(`/project/${targetId}`);
          }
        }} 
      />
    </div>
  );
}

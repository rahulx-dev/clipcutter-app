import React, { useState } from 'react';
import { Upload, Link as LinkIcon, Sparkles, Check, Download, FileText, Play, Scissors, Layers, Sliders, ArrowRight, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../App';
import CaptionStylePicker from '../components/CaptionStylePicker';
import Cosmic3DBackground from '../components/Cosmic3DBackground';

export default function AutoCaptionStudio() {
  const { token } = useAuth();

  // Ingestion State
  const [tab, setTab] = useState('upload'); // 'upload' | 'youtube'
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [languagePref, setLanguagePref] = useState('auto');
  const [selectedStyle, setSelectedStyle] = useState('hormozi');

  // Studio Workflow State: 'upload' | 'transcribing' | 'editor'
  const [stage, setStage] = useState('upload');
  const [loading, setLoading] = useState(false);
  const [sourceFilePath, setSourceFilePath] = useState('');
  const [segments, setSegments] = useState([]);
  const [detectedLang, setDetectedLang] = useState('');
  const [burning, setBurning] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleStartTranscription = async () => {
    setLoading(true);
    try {
      let res;
      if (tab === 'upload') {
        if (!file) return alert("Please select a video file");
        const formData = new FormData();
        formData.append('file', file);
        formData.append('language_pref', languagePref);
        res = await axios.post('/api/captions/transcribe', formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}` 
          }
        });
      } else {
        if (!url) return alert("Please provide a YouTube video URL");
        res = await axios.post('/api/captions/transcribe-url', {
          url,
          language_pref: languagePref
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      setSourceFilePath(res.data.file_path);
      setSegments(res.data.segments || []);
      setDetectedLang(res.data.language || 'auto');
      setStage('editor');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Transcription failed. Please ensure audio is clear.");
    } finally {
      setLoading(false);
    }
  };

  const handleWordChange = (segIdx, wordIdx, newText) => {
    const updated = [...segments];
    if (updated[segIdx]?.words && updated[segIdx].words[wordIdx]) {
      updated[segIdx].words[wordIdx].word = newText;
      updated[segIdx].text = updated[segIdx].words.map(w => w.word).join(' ');
      setSegments(updated);
    }
  };

  const handleBurnCaptions = async () => {
    if (!sourceFilePath || segments.length === 0) return;
    setBurning(true);
    try {
      const res = await axios.post('/api/captions/burn', {
        file_path: sourceFilePath,
        caption_style: selectedStyle,
        segments: segments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExportResult(res.data);
      alert("Captions burned successfully! Click Download to get your MP4.");
    } catch (err) {
      console.error(err);
      alert("Failed to burn captions into video");
    } finally {
      setBurning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 relative">
      {/* 3D Cosmic Background */}
      <Cosmic3DBackground particleCount={300} opacity={0.35} speed={0.04} />

      {/* Studio Banner */}
      <div className="text-center max-w-2xl mx-auto mb-10 pt-4 relative z-10">
        <span className="px-3.5 py-1 rounded-full bg-white/[0.06] border border-white/15 text-[11px] font-extrabold uppercase tracking-wider text-white mb-3 inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#b8f032]" />
          <span>Auto Caption Studio v3.0</span>
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-3">
          Voice to Animated <span className="font-serif-italic text-[#b8f032]">Captions</span>
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
          Upload any offline video or YouTube link to generate word by word synchronized subtitles in Hindi, Hinglish, or English with 16 creator styles.
        </p>
      </div>

      {stage === 'upload' ? (
        /* Ingestion Card */
        <div className="max-w-xl mx-auto glass-authkit p-6 sm:p-8 rounded-3xl space-y-5 relative">
          <div className="corner-dot corner-dot-tl"></div>
          <div className="corner-dot corner-dot-tr"></div>
          <div className="corner-dot corner-dot-bl"></div>
          <div className="corner-dot corner-dot-br"></div>

          {/* Source Tabs */}
          <div className="flex bg-white/[0.03] p-1 rounded-full border border-white/5">
            <button
              onClick={() => setTab('upload')}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                tab === 'upload' ? 'bg-white text-black font-extrabold' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5 inline mr-1" /> Offline Video
            </button>
            <button
              onClick={() => setTab('youtube')}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                tab === 'youtube' ? 'bg-white text-black font-extrabold' : 'text-gray-400 hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5 inline mr-1" /> YouTube URL
            </button>
          </div>

          {/* Ingestion Box */}
          {tab === 'upload' ? (
            <div className="border-2 border-dashed border-white/15 rounded-2xl p-8 text-center hover:border-white/30 transition-colors">
              <input type="file" id="caption-file" className="hidden" accept=".mp4,.mov,.webm" onChange={handleFileSelect} />
              <label htmlFor="caption-file" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-8 h-8 text-white mb-2" />
                <p className="text-white font-bold text-sm">{file ? file.name : "Select video to caption"}</p>
                <p className="text-[11px] text-gray-500 mt-1">MP4, MOV, WebM files</p>
              </label>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">YouTube Video URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-white/30"
              />
            </div>
          )}

          {/* Language Selection */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
              Spoken Audio Language
            </label>
            <select
              value={languagePref}
              onChange={(e) => setLanguagePref(e.target.value)}
              className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
            >
              <option value="auto">Auto Detect Language</option>
              <option value="hi">Hindi</option>
              <option value="hinglish">Hinglish (Roman Hindi)</option>
              <option value="en">English</option>
            </select>
          </div>

          <button
            onClick={handleStartTranscription}
            disabled={loading}
            className="w-full btn-ai-glow cursor-pointer disabled:opacity-50"
          >
            <div className="btn-ai-glow-inner py-3.5 text-xs font-extrabold uppercase tracking-wider w-full">
              {loading ? (
                <span>Transcribing Audio...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Generate Synchronized Captions</span>
                </>
              )}
            </div>
          </button>
        </div>
      ) : (
        /* Standalone Studio Editor Layout */
        <div className="space-y-8">
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glass-authkit rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-400">Detected Language:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/[0.08] border border-white/20 text-xs font-extrabold text-white uppercase">
                {detectedLang}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setStage('upload')}
                className="px-4 py-2 rounded-full btn-pill-glass text-xs font-semibold cursor-pointer"
              >
                Upload Different Video
              </button>
              <button
                onClick={handleBurnCaptions}
                disabled={burning}
                className="btn-ai-glow cursor-pointer disabled:opacity-50"
              >
                <div className="btn-ai-glow-inner px-6 py-2 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>{burning ? 'Rendering Video...' : 'Burn and Export MP4'}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Style Picker Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Select Caption Animation Preset (16 Styles)
            </h3>
            <CaptionStylePicker selected={selectedStyle} onSelect={setSelectedStyle} />
          </div>

          {/* Word by Word Interactive Timeline Editor */}
          <div className="glass-authkit p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-white" />
              <span>Interactive Word Timestamp Editor (Click to Edit)</span>
            </h3>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
              {segments.map((seg, sIdx) => (
                <div key={sIdx} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                    <span>{seg.start?.toFixed(2)}s to {seg.end?.toFixed(2)}s</span>
                    <span className="text-white font-sans text-[10px] font-bold">Segment #{sIdx + 1}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(seg.words || []).map((w, wIdx) => (
                      <input
                        key={wIdx}
                        type="text"
                        value={w.word}
                        onChange={(e) => handleWordChange(sIdx, wIdx, e.target.value)}
                        className="px-2 py-1 bg-black/60 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-white/30 transition-all max-w-[120px]"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

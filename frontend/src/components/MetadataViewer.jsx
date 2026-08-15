import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Copy, Check, Sparkles } from 'lucide-react';

export default function MetadataViewer({ clip }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAll = () => {
    const text = `${clip.title}\n\n${clip.description}\n\n${clip.hashtags?.join(' ')}`;
    handleCopy(text, 'all');
  };

  return (
    <div className="border-t border-white/[0.08] pt-3">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-xs font-bold text-gray-400 hover:text-emerald-300 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          AI Title, Tags & SEO
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 space-y-3"
          >
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Title</label>
                <button onClick={() => handleCopy(clip.title, 'title')} className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center cursor-pointer">
                  {copiedField === 'title' ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />} Copy
                </button>
              </div>
              <input type="text" defaultValue={clip.title} className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</label>
                <button onClick={() => handleCopy(clip.description, 'desc')} className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center cursor-pointer">
                  {copiedField === 'desc' ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />} Copy
                </button>
              </div>
              <textarea defaultValue={clip.description} rows={2} className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none" />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Hashtags</label>
              <div className="flex flex-wrap gap-1.5">
                {clip.hashtags?.map((tag, i) => (
                  <span key={i} className="text-[10px] font-bold px-2 py-0.5 bg-emerald-950/50 text-emerald-300 border border-emerald-500/20 rounded-md cursor-pointer hover:border-emerald-400 transition-colors">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <button 
              onClick={copyAll}
              className="w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl text-xs font-bold text-white uppercase tracking-wider transition-colors flex items-center justify-center border border-white/10 cursor-pointer"
            >
              {copiedField === 'all' ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              Copy All for YouTube / Insta
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

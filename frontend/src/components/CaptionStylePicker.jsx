import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';

const styles = [
  {
    id: 'hormozi',
    name: 'Hormozi Yellow',
    tag: 'MOST VIRAL',
    desc: 'Bold Impact font with high-energy yellow active word highlight',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-black text-base uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          THIS IS <span className="text-yellow-400 font-extrabold underline decoration-yellow-400/60">HOW</span> YOU WIN
        </span>
      </div>
    )
  },
  {
    id: 'neon_cyber',
    name: 'Neon Cyberpunk',
    tag: 'TRENDING',
    desc: 'Futuristic electric cyan active word with dark outline',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-black text-base uppercase text-white tracking-wide">
          BUILD THE <span className="text-[#b8f032] font-extrabold px-1.5 py-0.5 bg-[#b8f032]/10 rounded border border-[#b8f032]/40">FUTURE</span> NOW
        </span>
      </div>
    )
  },
  {
    id: 'beast_red',
    name: 'Beast Mode Red',
    tag: 'HIGH ENERGY',
    desc: 'Aggressive fire red highlight for high-retention storytelling',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-black text-base uppercase text-white">
          NEVER <span className="text-red-500 font-extrabold px-1.5 py-0.5 bg-red-950/60 rounded border border-red-500/40">GIVE UP</span> TODAY
        </span>
      </div>
    )
  },
  {
    id: 'golden_luxury',
    name: 'Golden Luxury',
    tag: 'FINANCE & WEALTH',
    desc: 'Rich amber gold highlight for business and mindset videos',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-black text-base uppercase text-white">
          MAKE <span className="text-yellow-400 font-extrabold px-1.5 py-0.5 bg-yellow-950/50 rounded border border-yellow-400/40">MILLIONS</span> ONLINE
        </span>
      </div>
    )
  },
  {
    id: 'karaoke_green',
    name: 'Karaoke Glow',
    tag: 'PODCAST & TALKS',
    desc: 'Electric lime green highlight for seamless word-by-word reading',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-bold text-xs text-white">
          Listen to the <span className="text-[#b8f032] font-extrabold px-1.5 py-0.5 bg-[#b8f032]/10 rounded border border-[#b8f032]/40">SECRET</span> podcast
        </span>
      </div>
    )
  },
  {
    id: 'ali_abdaal',
    name: 'Ali Abdaal Clean',
    tag: 'PRODUCTIVITY',
    desc: 'Modern minimalist sans-serif with calm blue active focus',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-bold text-xs text-white">
          The best <span className="text-sky-400 font-black px-1.5 py-0.5 bg-sky-950/60 rounded border border-sky-400/40">HABIT</span> to build
        </span>
      </div>
    )
  },
  {
    id: 'iman_gadzhi',
    name: 'Iman Gadzhi Noir',
    tag: 'EDITORIAL LUXURY',
    desc: 'Classic editorial typography with subtle luxury gold outline',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-serif-italic text-sm text-white">
          THE REAL <span className="text-amber-300 font-black uppercase underline decoration-amber-400/50">POWER</span> MATRIX
        </span>
      </div>
    )
  },
  {
    id: 'sunset_orange',
    name: 'Sunset Flame',
    tag: 'CREATOR FAVORITE',
    desc: 'Vibrant flame orange highlight with high contrast readability',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-bold text-xs text-white">
          Unlock your <span className="text-orange-400 font-extrabold px-1.5 py-0.5 bg-orange-950/60 rounded border border-orange-500/40">TRUE POWER</span>
        </span>
      </div>
    )
  },
  {
    id: 'dynamic',
    name: 'Dynamic Pop',
    tag: 'ENGAGING',
    desc: 'Bouncy animated captions with glowing chartreuse word highlights',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-bold text-xs text-white">
          Let's create <span className="text-[#b8f032] font-black px-1.5 py-0.5 bg-[#b8f032]/20 border border-[#b8f032]/40 rounded inline-block -rotate-2 scale-105">VIRAL</span> shorts
        </span>
      </div>
    )
  },
  {
    id: 'retro_arcade',
    name: 'Retro Arcade 8-Bit',
    tag: 'GAMING VIBE',
    desc: 'High contrast neon gaming font with green pixelated accents',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-black text-xs uppercase text-emerald-400 tracking-wider">
          LEVEL <span className="text-yellow-400 px-1 py-0.5 bg-yellow-950/80 rounded border border-yellow-400">UP</span> YOUR GAME
        </span>
      </div>
    )
  },
  {
    id: 'neon_violet',
    name: 'Neon Violet Glow',
    tag: 'CYBERPUNK',
    desc: 'Cyberpunk neon purple/magenta glowing word highlight',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-bold text-xs text-white">
          Discover the <span className="text-fuchsia-400 font-extrabold px-1.5 py-0.5 bg-fuchsia-950/60 rounded border border-fuchsia-500/40">SECRET</span> code
        </span>
      </div>
    )
  },
  {
    id: 'electric_blue',
    name: 'Electric Blue Bolt',
    tag: 'HIGH RETENTION',
    desc: 'Bright electric blue bolt highlight for fast pacing',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-black text-xs uppercase text-white">
          FAST <span className="text-blue-400 font-black px-1.5 py-0.5 bg-blue-950/60 rounded border border-blue-400/40">ACTION</span> TAKERS
        </span>
      </div>
    )
  },
  {
    id: 'matrix_terminal',
    name: 'Matrix Terminal',
    tag: 'CODE & TECH',
    desc: 'Hacker green monospace with glowing terminal border',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5 font-mono">
        <span className="text-xs text-emerald-400">
          root@system: <span className="text-white font-bold bg-emerald-950 px-1 py-0.5 rounded border border-emerald-500/40">EXECUTE</span>
        </span>
      </div>
    )
  },
  {
    id: 'impact_white',
    name: 'High-Impact White',
    tag: 'CLEAN BOLD',
    desc: 'Bold heavy white typography with maximum contrast drop shadow',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-black text-sm uppercase text-white drop-shadow-[0_4px_12px_rgba(0,0,0,1)]">
          LISTEN TO THIS <span className="underline decoration-white/60">NOW</span>
        </span>
      </div>
    )
  },
  {
    id: 'comic_pop',
    name: 'Comic Pop',
    tag: 'MEME & ENTERTAINMENT',
    desc: 'Bubbly high-contrast badge style for funny moments',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/5">
        <span className="font-black text-xs uppercase text-yellow-300">
          NO <span className="text-red-500 font-black px-1.5 py-0.5 bg-white rounded border-2 border-black inline-block rotate-2">WAY!</span> HAHA
        </span>
      </div>
    )
  },
  {
    id: 'minimal',
    name: 'Clean Minimal',
    tag: 'ELEGANT',
    desc: 'Clean sans-serif with a sleek translucent dark backdrop bar',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 relative overflow-hidden border border-white/5">
        <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg text-white font-medium text-[11px] border border-white/10 shadow-lg">
          The simple truth about viral growth.
        </div>
      </div>
    )
  }
];

export default function CaptionStylePicker({ selected, onSelect }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-[#b8f032] flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> 16 Trending Auto-Caption Templates
        </span>
        <span className="text-[11px] text-gray-400">Click to preview & select</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {styles.map((style) => {
          const isSelected = selected === style.id;
          return (
            <div
              key={style.id}
              onClick={() => onSelect(style.id)}
              className={`cursor-pointer rounded-3xl p-3.5 transition-all duration-200 relative flex flex-col justify-between ${
                isSelected 
                  ? 'bg-[#b8f032]/10 border-2 border-[#b8f032] shadow-[0_0_25px_rgba(184,240,50,0.25)]' 
                  : 'glass-card-verdant border border-white/10 hover:border-[#b8f032]/40'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-[#b8f032] rounded-full flex items-center justify-center shadow-md">
                  <Check className="w-3 h-3 text-black stroke-[3]" />
                </div>
              )}
              
              {style.preview}

              <div className="mt-3 text-left">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-white text-xs">
                    {style.name}
                  </h3>
                  <span className="text-[9px] font-black text-[#b8f032] bg-[#b8f032]/10 border border-[#b8f032]/30 px-1.5 py-0.5 rounded-full uppercase">
                    {style.tag}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 leading-snug">{style.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

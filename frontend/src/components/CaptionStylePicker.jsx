import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Flame, Zap, Award, Star } from 'lucide-react';

export const ALL_CAPTION_STYLES = [
  {
    id: 'hormozi',
    name: 'Hormozi Yellow',
    tag: 'MOST VIRAL',
    desc: 'Bold Impact font with high-energy yellow active word highlight',
    color: '#FACC15',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-sm uppercase italic text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          THIS IS <span className="text-yellow-400 font-extrabold underline decoration-yellow-400/60 scale-110 inline-block">HOW</span> YOU WIN
        </span>
      </div>
    )
  },
  {
    id: 'neon_cyber',
    name: 'Neon Cyberpunk',
    tag: 'TRENDING',
    desc: 'Futuristic electric cyan active word with dark cyber outline',
    color: '#22D3EE',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-sm uppercase text-white tracking-wide">
          BUILD THE <span className="text-[#22D3EE] font-extrabold px-1.5 py-0.5 bg-[#22D3EE]/20 rounded border border-[#22D3EE]/60 shadow-[0_0_12px_#22D3EE]">FUTURE</span> NOW
        </span>
      </div>
    )
  },
  {
    id: 'beast_red',
    name: 'MrBeast Thunder',
    tag: 'EXPLOSIVE',
    desc: 'Aggressive fire red highlight for high-retention storytelling',
    color: '#EF4444',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-sm uppercase text-white">
          NEVER <span className="text-red-500 font-extrabold px-1.5 py-0.5 bg-red-950/80 rounded border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]">GIVE UP</span> TODAY
        </span>
      </div>
    )
  },
  {
    id: 'golden_luxury',
    name: 'Golden Luxury 24K',
    tag: 'FINANCE & WEALTH',
    desc: 'Rich amber gold highlight for business and mindset videos',
    color: '#F59E0B',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-sm uppercase text-white">
          MAKE <span className="text-amber-400 font-extrabold px-1.5 py-0.5 bg-amber-950/60 rounded border border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.5)]">MILLIONS</span> ONLINE
        </span>
      </div>
    )
  },
  {
    id: 'karaoke_green',
    name: 'Karaoke Live Glow',
    tag: 'PODCAST',
    desc: 'Electric lime green highlight for seamless word-by-word reading',
    color: '#84CC16',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-bold text-xs text-white">
          Listen to the <span className="text-[#84CC16] font-black px-1.5 py-0.5 bg-[#84CC16]/20 rounded border border-[#84CC16]/50">SECRET</span> podcast
        </span>
      </div>
    )
  },
  {
    id: 'ali_abdaal',
    name: 'Ali Abdaal Clean',
    tag: 'PRODUCTIVITY',
    desc: 'Modern minimalist sans-serif with calm blue active focus',
    color: '#38BDF8',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-bold text-xs text-white">
          The best <span className="text-sky-400 font-black px-1.5 py-0.5 bg-sky-950/60 rounded border border-sky-400/50">HABIT</span> to build
        </span>
      </div>
    )
  },
  {
    id: 'iman_gadzhi',
    name: 'Iman Gadzhi Noir',
    tag: 'EDITORIAL',
    desc: 'Classic editorial serif with subtle luxury gold outline',
    color: '#FDE68A',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10 font-serif">
        <span className="italic text-sm text-white">
          THE REAL <span className="text-amber-300 font-black uppercase underline decoration-amber-400/60">POWER</span> MATRIX
        </span>
      </div>
    )
  },
  {
    id: 'sunset_orange',
    name: 'Sunset Flame',
    tag: 'CREATOR',
    desc: 'Vibrant flame orange highlight with high contrast readability',
    color: '#FB923C',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-bold text-xs text-white">
          Unlock your <span className="text-orange-400 font-extrabold px-1.5 py-0.5 bg-orange-950/60 rounded border border-orange-500/50">TRUE POWER</span>
        </span>
      </div>
    )
  },
  {
    id: 'dynamic',
    name: 'Dynamic Pop Bounce',
    tag: 'HIGH RETENTION',
    desc: 'Bouncy animated captions with glowing chartreuse word highlights',
    color: '#b8f032',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-bold text-xs text-white">
          Create <span className="text-[#b8f032] font-black px-1.5 py-0.5 bg-[#b8f032]/20 border border-[#b8f032]/50 rounded inline-block -rotate-3 scale-110 shadow-[0_0_10px_#b8f032]">VIRAL</span> shorts
        </span>
      </div>
    )
  },
  {
    id: 'retro_arcade',
    name: 'Retro 8-Bit Gaming',
    tag: 'GAMING VIBE',
    desc: 'High contrast neon gaming font with green pixelated accents',
    color: '#4ADE80',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-xs uppercase text-emerald-400 tracking-wider font-mono">
          LEVEL <span className="text-yellow-400 px-1 py-0.5 bg-yellow-950/90 rounded border border-yellow-400">UP</span> YOUR GAME
        </span>
      </div>
    )
  },
  {
    id: 'neon_violet',
    name: 'Neon Violet Glow',
    tag: 'CYBERPUNK',
    desc: 'Cyberpunk neon purple/magenta glowing word highlight',
    color: '#E879F9',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-bold text-xs text-white">
          Discover the <span className="text-fuchsia-400 font-extrabold px-1.5 py-0.5 bg-fuchsia-950/70 rounded border border-fuchsia-500/60 shadow-[0_0_12px_#e879f9]">SECRET</span> code
        </span>
      </div>
    )
  },
  {
    id: 'electric_blue',
    name: 'Electric Blue Bolt',
    tag: 'FAST PACED',
    desc: 'Bright electric blue bolt highlight for fast pacing',
    color: '#60A5FA',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-xs uppercase text-white">
          FAST <span className="text-blue-400 font-black px-1.5 py-0.5 bg-blue-950/70 rounded border border-blue-400/60 shadow-[0_0_12px_#60a5fa]">ACTION</span> TAKERS
        </span>
      </div>
    )
  },
  {
    id: 'matrix_terminal',
    name: 'Matrix Terminal',
    tag: 'CODE & TECH',
    desc: 'Hacker green monospace with glowing terminal border',
    color: '#22C55E',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10 font-mono">
        <span className="text-xs text-emerald-400">
          sys.root: <span className="text-white font-bold bg-emerald-950 px-1 py-0.5 rounded border border-emerald-500/50">EXECUTE</span>
        </span>
      </div>
    )
  },
  {
    id: 'impact_white',
    name: 'High-Impact White',
    tag: 'CLEAN BOLD',
    desc: 'Bold heavy white typography with maximum contrast drop shadow',
    color: '#FFFFFF',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-sm uppercase text-white drop-shadow-[0_4px_12px_rgba(0,0,0,1)]">
          LISTEN TO THIS <span className="underline decoration-white/80 scale-105 inline-block">NOW</span>
        </span>
      </div>
    )
  },
  {
    id: 'comic_pop',
    name: 'Comic Pop',
    tag: 'MEME & FUNNY',
    desc: 'Bubbly high-contrast badge style for funny moments',
    color: '#F87171',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-xs uppercase text-yellow-300">
          NO <span className="text-red-500 font-black px-1.5 py-0.5 bg-white rounded border-2 border-black inline-block rotate-3">WAY!</span> HAHA
        </span>
      </div>
    )
  },
  {
    id: 'minimal',
    name: 'Clean Minimalist Glass',
    tag: 'ELEGANT',
    desc: 'Clean sans-serif with a sleek translucent dark backdrop bar',
    color: '#E2E8F0',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-xl text-white font-medium text-xs border border-white/20 shadow-lg">
          The simple truth about growth.
        </div>
      </div>
    )
  },
  {
    id: 'tiktok_trending',
    name: 'TikTok Trending Bold',
    tag: 'TIKTOK VIRAL',
    desc: 'Iconic TikTok short-form white and cyan pop highlight',
    color: '#00F2FE',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-xs uppercase text-white">
          THE MOST <span className="text-[#00F2FE] font-black px-1.5 py-0.5 bg-[#00F2FE]/20 rounded border border-[#00F2FE]/60">INSANE</span> FACT
        </span>
      </div>
    )
  },
  {
    id: 'podcast_spotlight',
    name: 'Studio Podcast Spotlight',
    tag: 'PODCAST HOST',
    desc: 'Warm studio amber subtitle with crisp letter spacing',
    color: '#FBBF24',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-semibold text-xs text-gray-200">
          Let's talk about <span className="text-amber-300 font-bold px-1.5 py-0.5 bg-amber-950/60 rounded border border-amber-300/40">MONEY</span>
        </span>
      </div>
    )
  },
  {
    id: 'emerald_focus',
    name: 'Deep Focus Emerald',
    tag: 'MINDSET',
    desc: 'Rich emerald green active highlight for wisdom & education',
    color: '#10B981',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-bold text-xs text-white">
          Master your <span className="text-emerald-400 font-black px-1.5 py-0.5 bg-emerald-950/60 rounded border border-emerald-400/60">DISCIPLINE</span> daily
        </span>
      </div>
    )
  },
  {
    id: 'midnight_pink',
    name: 'Midnight Neon Pink',
    tag: 'VIBRANT',
    desc: 'Hypnotic hot pink glowing font for high-energy creators',
    color: '#EC4899',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-xs uppercase text-white">
          STOP <span className="text-pink-400 font-black px-1.5 py-0.5 bg-pink-950/80 rounded border border-pink-400/60 shadow-[0_0_12px_#ec4899]">SCROLLING</span> NOW
        </span>
      </div>
    )
  },
  {
    id: 'vlog_casual',
    name: 'Vlog Casual Yellow',
    tag: 'DAILY VLOG',
    desc: 'Relaxed casual subtitle style with warm sunny active words',
    color: '#FDE047',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-medium text-xs text-white italic">
          So we went to the <span className="text-yellow-300 font-black not-italic px-1.5 py-0.5 bg-yellow-950/60 rounded border border-yellow-300/40">AIRPORT</span>
        </span>
      </div>
    )
  },
  {
    id: 'cinematic_gold',
    name: 'Cinematic Gold Trailer',
    tag: 'CINEMATIC',
    desc: 'Epic movie trailer serif with regal gold illumination',
    color: '#D97706',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10 font-serif">
        <span className="text-xs uppercase tracking-widest text-gray-300">
          THE END OF <span className="text-amber-300 font-black underline decoration-amber-400/80">AN ERA</span>
        </span>
      </div>
    )
  },
  {
    id: 'kinetic_fast',
    name: 'Kinetic 2-Word Punch',
    tag: 'ULTRA RETENTION',
    desc: 'Fast 2-word kinetic typography with electric neon active scale',
    color: '#A3E635',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-sm uppercase text-white">
          WATCH <span className="text-[#a3e635] font-extrabold px-1.5 py-0.5 bg-[#a3e635]/20 rounded border border-[#a3e635] scale-110 inline-block">THIS!</span>
        </span>
      </div>
    )
  },
  {
    id: 'crimson_shadow',
    name: 'Crimson Shadow Mystery',
    tag: 'HORROR & TRUE CRIME',
    desc: 'Deep thriller dark red highlight with ominous shadow',
    color: '#DC2626',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-xs uppercase text-white">
          THEY NEVER <span className="text-red-600 font-extrabold px-1.5 py-0.5 bg-red-950/90 rounded border border-red-600">FOUND HIM</span>
        </span>
      </div>
    )
  },
  {
    id: 'ice_hologram',
    name: 'Futuristic Ice Hologram',
    tag: 'SCI-FI & AI',
    desc: 'Glacial ice cyan font with futuristic glowing aura',
    color: '#7DD3FC',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-bold text-xs text-sky-100">
          AI generated <span className="text-sky-300 font-black px-1.5 py-0.5 bg-sky-950/80 rounded border border-sky-300/60 shadow-[0_0_12px_#38bdf8]">REALITY</span>
        </span>
      </div>
    )
  },
  {
    id: 'tech_mono',
    name: 'Tech Monologue JetBrains',
    tag: 'DEV & CODING',
    desc: 'JetBrains hacker monospace with clean green terminal cursor',
    color: '#34D399',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10 font-mono">
        <span className="text-xs text-gray-300">
          fn deploy() <span className="text-emerald-400 font-bold bg-emerald-950 px-1 py-0.5 rounded border border-emerald-400/50">{'->'} PROD</span>
        </span>
      </div>
    )
  },
  {
    id: 'peak_motivation',
    name: 'Peak Motivation Flame',
    tag: 'GYM & MOTIVATION',
    desc: 'Hyper-intense flame gradient active word for fitness & grind',
    color: '#F97316',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <span className="font-black text-xs uppercase text-white">
          WAKE UP AND <span className="text-orange-500 font-black px-1.5 py-0.5 bg-orange-950/80 rounded border border-orange-500 shadow-[0_0_12px_#f97316]">GRIND</span>
        </span>
      </div>
    )
  },
  {
    id: 'subtle_lower_third',
    name: 'Modern Lower Third Bar',
    tag: 'PROFESSIONAL NEWS',
    desc: 'Clean broadcast television lower third subtitle banner',
    color: '#94A3B8',
    preview: (
      <div className="bg-black/90 h-20 rounded-2xl flex items-center justify-center p-3 border border-white/10">
        <div className="bg-black/80 border-l-4 border-[#b8f032] px-3 py-1 text-left">
          <p className="text-[11px] font-bold text-white leading-tight">Key Takeaway of the Day</p>
        </div>
      </div>
    )
  }
];

export default function CaptionStylePicker({ selected, onSelect }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#b8f032]" />
          <span className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
            {ALL_CAPTION_STYLES.length} Auto-Caption Templates
          </span>
        </div>
        <span className="text-xs text-gray-400 font-medium">
          Click any card to select
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {ALL_CAPTION_STYLES.map((style) => {
          const isSelected = selected === style.id;
          return (
            <div
              key={style.id}
              onClick={() => onSelect(style.id)}
              className={`cursor-pointer rounded-3xl p-3.5 transition-all duration-200 relative flex flex-col justify-between group ${
                isSelected 
                  ? 'bg-[#b8f032]/15 border-2 border-[#b8f032] shadow-[0_0_30px_rgba(184,240,50,0.3)] scale-[1.02]' 
                  : 'glass-card-verdant border border-white/10 hover:border-[#b8f032]/50 hover:bg-white/[0.04]'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 w-6 h-6 bg-[#b8f032] rounded-full flex items-center justify-center shadow-lg z-10">
                  <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                </div>
              )}
              
              {style.preview}

              <div className="mt-3 text-left">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-extrabold text-white text-xs tracking-tight group-hover:text-[#b8f032] transition-colors">
                    {style.name}
                  </h3>
                  <span 
                    className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase border tracking-tight"
                    style={{ 
                      color: style.color, 
                      borderColor: `${style.color}40`,
                      backgroundColor: `${style.color}15`
                    }}
                  >
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

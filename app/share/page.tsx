'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMatchSession } from '@/hooks/use-match-session';
import { 
  calculateRanking, 
  MatchDay, 
  formatDateSafe, 
  getTeamColorClass, 
  getTeamTextColorClass 
} from '@/lib/match-utils';
import { toPng } from 'html-to-image';
import { ChevronLeft, Download, Trophy, Camera } from 'lucide-react';
import { motion } from 'motion/react';

export default function SharePage() {
  const router = useRouter();
  const { currentMatchDay } = useMatchSession();
  const captureRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const [genRef, setGenRef] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setGenRef(new Date().getTime().toString(36).toUpperCase());
    if (!currentMatchDay?.teams) {
      router.push('/');
    }
  }, [currentMatchDay, router]);

  if (!isMounted || !currentMatchDay?.teams) return null;

  const rankings = calculateRanking(currentMatchDay as MatchDay);
  const matches = currentMatchDay.matches || [];

  const handleCapture = async () => {
    if (!captureRef.current) return;
    setIsCapturing(true);
    try {
      // Small delay to ensure styles are applied
      await new Promise(r => setTimeout(r, 500));
      const dataUrl = await toPng(captureRef.current, { 
        cacheBust: true, 
        quality: 1, 
        pixelRatio: 2,
        width: 1200,
        height: 1600,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `pitchrecord-${currentMatchDay.date}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Capture failed:', msg);
      alert('Failed to capture image: ' + msg);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-7xl flex flex-col items-center gap-8 pt-4">
        {/* Controls Container */}
        <div className="w-full flex justify-between items-center shrink-0 transition-all">
          <button
            onClick={() => router.back()}
            className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md active:scale-95"
            title="Back"
          >
            <ChevronLeft size={24} />
          </button>
          
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className="p-4 bg-white text-slate-900 rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
            title="Download Post"
          >
            {isCapturing ? (
              <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <Camera size={24} />
            )}
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="w-full flex items-start justify-center pb-20">
          <div className="origin-top scale-[0.4] sm:scale-[0.5] md:scale-[0.55] lg:scale-[0.65] transition-transform shrink-0">
            {/* The Actual Capture Target */}
            <div 
              ref={captureRef}
              className="bg-white p-16 w-[1200px] h-[1600px] flex flex-col font-sans overflow-hidden pb-52 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]"
              style={{ 
                backgroundImage: 'radial-gradient(circle at 1px 1px, #f1f5f9 2px, transparent 0)',
                backgroundSize: '40px 40px',
                backgroundColor: 'white'
              }}
            >
            <div className="flex justify-between items-center mb-10 border-b-4 border-slate-900 pb-8">
            <div>
              <h1 className="text-6xl font-light text-slate-900 tracking-tight">Match Results</h1>
              <p className="text-lg font-bold text-slate-400 uppercase tracking-[0.4em] mt-3">
                {formatDateSafe(currentMatchDay.date, 'EEEE, MMMM dd, yyyy')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-2">FOOTBALL ARCHIVE</p>
              <div className="inline-block p-3 bg-slate-900 text-white rounded-xl font-black text-base">PITCHRECORD</div>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-10">
            {/* Match Results - 3x3 Grid with team colors for winners */}
            <div className="px-24">
              <div className="grid grid-cols-3 gap-6">
                {matches.map((match, idx) => {
                  const homeTeam = currentMatchDay.teams?.[match.homeTeamIndex] || '';
                  const awayTeam = currentMatchDay.teams?.[match.awayTeamIndex] || '';
                  const homeWon = match.homeScore > match.awayScore;
                  const awayWon = match.awayScore > match.homeScore;
                  const winner = homeWon ? homeTeam : (awayWon ? awayTeam : null);
                  const isDraw = match.homeScore === match.awayScore;

                  return (
                    <div 
                      key={idx} 
                      className={`flex flex-col items-center justify-center p-6 rounded-3xl border text-center transition-all ${
                        winner 
                          ? `${getTeamColorClass(winner)} ${getTeamTextColorClass(winner)} border-white/20` 
                          : 'bg-slate-50 border-slate-100 text-slate-800'
                      }`}
                    >
                      <span className={`text-[10px] font-black mb-3 uppercase tracking-widest ${winner ? 'opacity-60' : 'text-slate-300'}`}>Match #{idx + 1}</span>
                      <div className="flex flex-col items-center gap-1 w-full">
                        <span className={`text-xs font-black uppercase w-full px-2 ${winner ? '' : 'text-slate-400'}`}>
                          {homeTeam}
                        </span>
                        <div className={`px-4 py-2 rounded-xl text-xl font-black w-full max-w-[140px] flex justify-center ${
                          winner ? 'bg-white/20 backdrop-blur-sm' : 'bg-slate-900 text-white'
                        }`}>
                          {match.homeScore} : {match.awayScore}
                        </div>
                        <span className={`text-xs font-black uppercase w-full px-2 ${winner ? '' : 'text-slate-400'}`}>
                          {awayTeam}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Final Standing - Balanced Table Spacing */}
            <div className="space-y-6">
              <h3 className="text-lg font-black uppercase tracking-[0.5em] text-slate-300">Final Standing</h3>
              <div className="bg-white rounded-[2.5rem] overflow-hidden border-4 border-slate-900">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="w-16 p-4 text-[10px] font-bold uppercase tracking-widest pl-10">Pos</th>
                      <th className="w-72 p-4 text-[10px] font-bold uppercase tracking-widest">Team</th>
                      <th className="w-16 p-4 text-[10px] font-bold uppercase tracking-widest text-center">P</th>
                      <th className="w-16 p-4 text-[10px] font-bold uppercase tracking-widest text-center">W</th>
                      <th className="w-16 p-4 text-[10px] font-bold uppercase tracking-widest text-center">L</th>
                      <th className="w-16 p-4 text-[10px] font-bold uppercase tracking-widest text-center">GD</th>
                      <th className="w-20 p-4 text-[10px] font-bold uppercase tracking-widest text-center">Pts</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest pr-10 text-right">Form History</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-slate-100">
                    {rankings.map((team, idx) => (
                      <tr key={team.name} className={idx === 0 ? 'bg-slate-50' : ''}>
                        <td className="p-4 pl-10 text-lg font-black text-slate-300">0{idx + 1}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 shrink-0 rounded-full ${getTeamColorClass(team.name)} border-2 border-white`} />
                            <span className="text-base font-black uppercase tracking-tight text-slate-900">{team.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center text-base font-medium text-slate-500">{team.played}</td>
                        <td className="p-4 text-center text-base font-medium text-slate-500">{team.won}</td>
                        <td className="p-4 text-center text-base font-medium text-slate-500">{team.lost}</td>
                        <td className="p-4 text-center text-lg font-bold text-slate-700">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                        <td className="p-4 text-center text-2xl font-black text-slate-900">{team.points}</td>
                        <td className="p-4 pr-10">
                          <div className="flex gap-1.5 justify-end">
                            {team.form.map((f, i) => (
                              <span 
                                key={i} 
                                className={`w-7 h-7 flex items-center justify-center rounded-md text-[9px] font-black ${
                                  f === 'W' ? 'bg-emerald-500 text-white' : 
                                  f === 'L' ? 'bg-red-500 text-white' : 
                                  'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* The Winner */}
            <div className={`p-10 rounded-[3rem] text-white space-y-6 flex items-center justify-between ${getTeamColorClass(rankings[0].name)} ${getTeamTextColorClass(rankings[0].name)} mt-auto border-4 border-white/20`}>
              <div className="flex items-center gap-6">
                <div className="p-5 bg-white/20 rounded-[1.5rem] backdrop-blur-sm">
                  <Trophy size={48} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-[0.4em] opacity-70">The Winner</h3>
                  <p className="text-5xl font-black uppercase tracking-tighter leading-none mt-1">{rankings[0].name}</p>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="bg-black/10 p-6 rounded-2xl min-w-[160px] border border-white/10 text-center">
                  <p className="text-xs font-black uppercase opacity-60 mb-1 tracking-widest">Total Points</p>
                  <p className="text-5xl font-black">{rankings[0].points}</p>
                </div>
                <div className="bg-black/10 p-6 rounded-2xl min-w-[160px] border border-white/10 text-center">
                  <p className="text-xs font-black uppercase opacity-60 mb-1 tracking-widest">Goal Diff</p>
                  <p className="text-5xl font-black">{rankings[0].gd > 0 ? `+${rankings[0].gd}` : rankings[0].gd}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t-2 border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-[1em]">
            <span>VERIFIED MATCHDATA SYNC</span>
            <span>GEN_REF: {genRef}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
);
}

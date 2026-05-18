'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMatchSession } from '@/hooks/use-match-session';
import { 
  calculateRanking, 
  MatchDay, 
  Match, 
  handleFirestoreError, 
  OperationType,
  formatDateSafe,
  getTeamColorClass,
  getTeamTextColorClass
} from '@/lib/match-utils';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Download, 
  Share2, 
  Save, 
  Users, 
  Trophy, 
  X
} from 'lucide-react';
import Papa from 'papaparse';

export default function ResultsPage() {
  const router = useRouter();
  const { currentMatchDay, setCurrentMatchDay } = useMatchSession();
  const shareRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [shareImage, setShareImage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentMatchDay?.teams) {
      router.push('/setup');
    }
  }, [currentMatchDay, router]);

  if (!currentMatchDay?.teams) return null;

  const matches: Match[] = currentMatchDay.matches || Array(9).fill(null).map((_, i) => {
    const pairs = [[0, 1], [1, 2], [2, 0]];
    const pair = pairs[i % 3];
    return {
      homeTeamIndex: pair[0],
      awayTeamIndex: pair[1],
      homeScore: 0,
      awayScore: 0
    };
  });

  const updateScore = (matchIdx: number, side: 'home' | 'away', val: string) => {
    const score = parseInt(val) || 0;
    const newMatches = [...matches];
    newMatches[matchIdx] = { ...newMatches[matchIdx], [side === 'home' ? 'homeScore' : 'awayScore']: score };
    setCurrentMatchDay({ ...currentMatchDay, matches: newMatches });
  };

  const updateMatchTeam = (matchIdx: number, side: 'home' | 'away', teamIdx: number) => {
    const newMatches = [...matches];
    newMatches[matchIdx] = { ...newMatches[matchIdx], [side === 'home' ? 'homeTeamIndex' : 'awayTeamIndex']: teamIdx };
    setCurrentMatchDay({ ...currentMatchDay, matches: newMatches });
  };

  const rankings = calculateRanking({
    ...currentMatchDay as MatchDay,
    matches
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = {
        date: currentMatchDay.date,
        teams: currentMatchDay.teams,
        matches: matches,
        createdAt: serverTimestamp()
      };

      if (currentMatchDay.id) {
        await setDoc(doc(db, 'matchDays', currentMatchDay.id), data);
      } else {
        await addDoc(collection(db, 'matchDays'), data);
      }
      
      alert('Match day saved successfully!');
      router.push('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'matchDays');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const csvData = matches.map(m => ({
      'Date': currentMatchDay.date,
      'Home Team': currentMatchDay.teams?.[m.homeTeamIndex],
      'Home Score': m.homeScore,
      'Away Team': currentMatchDay.teams?.[m.awayTeamIndex],
      'Away Score': m.awayScore
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pitchrecord-${currentMatchDay.date}.csv`);
    link.click();
  };

  const handleShare = () => {
    router.push('/share');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans pb-24 bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/setup')}
              className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all shadow-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-4xl font-light tracking-tight text-slate-800">
                Match Results
              </h1>
              <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest">{formatDateSafe(currentMatchDay.date, 'MMMM dd, yyyy')}</p>
            </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={handleExport}
              className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
            >
              Export CSV
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 md:flex-none px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
            >
              {isSaving ? 'Processing...' : 'Save Record'}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 md:flex-none px-6 py-3 bg-white border-2 border-slate-900 rounded-xl text-sm font-bold hover:bg-slate-900 hover:text-white transition-all"
            >
              Share Image
            </button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-7 space-y-12">
            <div className="bg-white p-10 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100" id="results-content">
              <div className="flex justify-between items-end mb-10 border-b border-slate-100 pb-6">
                <div>
                  <h2 className="text-2xl font-light text-slate-800">Football Session</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{formatDateSafe(currentMatchDay.date, 'EEEE / MMM dd')}</p>
                </div>
                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">PitchRecord System v.4</div>
              </div>

              <div className="space-y-4">
                {matches.map((match, idx) => (
                  <div key={idx} className="flex items-center gap-6 group">
                    <div className="w-8 text-[10px] font-bold text-slate-200 uppercase">{idx + 1}</div>
                    <div className="flex-1 flex items-center justify-between gap-4">
                      <div className="flex-1 flex flex-col items-end">
                        <select
                          value={match.homeTeamIndex}
                          onChange={(e) => updateMatchTeam(idx, 'home', parseInt(e.target.value))}
                          className={`w-full text-center cursor-pointer p-1 text-sm font-bold uppercase tracking-tight focus:bg-slate-100 outline-none rounded ${getTeamTextColorClass(currentMatchDay.teams?.[match.homeTeamIndex])} ${getTeamColorClass(currentMatchDay.teams?.[match.homeTeamIndex])} px-4 py-2 transition-all appearance-none`}
                        >
                          {currentMatchDay.teams?.map((team, tIdx) => (
                            <option key={tIdx} value={tIdx} className="bg-white text-slate-900">{team}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={match.homeScore}
                          onChange={(e) => updateScore(idx, 'home', e.target.value)}
                          className="w-14 h-14 bg-slate-50 border border-slate-200 text-center font-bold text-2xl rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-slate-300 font-light text-2xl">:</span>
                        <input
                          type="number"
                          value={match.awayScore}
                          onChange={(e) => updateScore(idx, 'away', e.target.value)}
                          className="w-14 h-14 bg-slate-50 border border-slate-200 text-center font-bold text-2xl rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      <div className="flex-1">
                        <select
                          value={match.awayTeamIndex}
                          onChange={(e) => updateMatchTeam(idx, 'away', parseInt(e.target.value))}
                          className={`w-full text-center cursor-pointer p-1 text-sm font-bold uppercase tracking-tight focus:bg-slate-100 outline-none rounded ${getTeamTextColorClass(currentMatchDay.teams?.[match.awayTeamIndex])} ${getTeamColorClass(currentMatchDay.teams?.[match.awayTeamIndex])} px-4 py-2 transition-all appearance-none`}
                        >
                          {currentMatchDay.teams?.map((team, tIdx) => (
                            <option key={tIdx} value={tIdx} className="bg-white text-slate-900">{team}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Area: Standing Table */}
          <div className="col-span-12 lg:col-span-5 space-y-8">
            <h2 className="text-xl font-light text-slate-800 uppercase tracking-widest pb-4 border-b border-slate-200">
                Standing Table
            </h2>
            
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="w-10 p-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 pl-4">Pos</th>
                    <th className="p-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">Team</th>
                    <th className="w-8 p-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">P</th>
                    <th className="w-8 p-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">W</th>
                    <th className="w-8 p-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">D</th>
                    <th className="w-8 p-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">L</th>
                    <th className="w-8 p-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">GF</th>
                    <th className="w-8 p-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">GA</th>
                    <th className="w-8 p-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">GD</th>
                    <th className="w-10 p-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 text-center">Pts</th>
                    <th className="w-24 p-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 pr-4">Form</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rankings.map((team, idx) => (
                    <tr key={team.name} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-3 pl-4 text-[10px] font-bold text-slate-300">0{idx + 1}</td>
                      <td className="p-3 truncate">
                        <div className="flex items-center gap-2">
                          <div className={`shrink-0 w-2 h-2 rounded-full ${getTeamColorClass(team.name)}`} />
                          <span className="text-xs font-bold uppercase tracking-tight truncate">{team.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center text-[10px] font-medium text-slate-500">{team.played}</td>
                      <td className="p-3 text-center text-[10px] font-bold text-slate-700">{team.won}</td>
                      <td className="p-3 text-center text-[10px] font-bold text-slate-700">{team.drawn}</td>
                      <td className="p-3 text-center text-[10px] font-bold text-slate-700">{team.lost}</td>
                      <td className="p-3 text-center text-[10px] font-medium text-slate-500">{team.gf}</td>
                      <td className="p-3 text-center text-[10px] font-medium text-slate-500">{team.ga}</td>
                      <td className="p-3 text-center text-[10px] font-bold text-slate-500">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                      <td className="p-3 text-center text-xs font-black text-slate-900">{team.points}</td>
                      <td className="p-3 pr-4">
                        <div className="flex gap-0.5 justify-end">
                          {team.form.map((f, i) => (
                            <span 
                              key={i} 
                              className={`w-3.5 h-3.5 flex items-center justify-center rounded-sm text-[8px] font-black ${
                                f === 'W' ? 'bg-emerald-100 text-emerald-700' : 
                                f === 'L' ? 'bg-red-100 text-red-700' : 
                                'bg-slate-100 text-slate-500'
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

            <div className={`p-8 rounded-[2rem] text-white space-y-4 shadow-2xl ${getTeamColorClass(rankings[0].name)} ${getTeamTextColorClass(rankings[0].name)}`}>
              <div className="flex items-center gap-4 border-b border-black/10 pb-4">
                <Trophy size={32} />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest opacity-60">The Winner</h3>
                  <p className="text-2xl font-black uppercase tracking-tighter leading-none mt-1">{rankings[0].name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/5 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Total Points</p>
                  <p className="text-3xl font-black">{rankings[0].points}</p>
                </div>
                <div className="bg-black/5 p-4 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Goal Diff</p>
                  <p className="text-3xl font-black">{rankings[0].gd > 0 ? `+${rankings[0].gd}` : rankings[0].gd}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Old hidden share container removed in favor of dedicated /share page */}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMatchSession } from '@/hooks/use-match-session';
import { 
  formatDateSafe, 
  getTeamColorClass, 
  getTeamTextColorClass 
} from '@/lib/match-utils';
import { motion } from 'motion/react';
import { Calendar, ArrowRight, Users, ChevronLeft } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const { currentMatchDay, setCurrentMatchDay } = useMatchSession();

  const [date, setDate] = useState(currentMatchDay?.date || new Date().toISOString().split('T')[0]);
  const [teams, setTeams] = useState<string[]>(
    currentMatchDay?.teams || ['Red', 'Blue', 'White']
  );

  const handleNext = () => {
    if (!date) return alert('Please select a date.');
    if (teams.some(t => !t.trim())) return alert('Please input all 3 team colors.');

    setCurrentMatchDay({
      ...currentMatchDay,
      date,
      teams,
    });
    router.push('/results');
  };

  const updateTeam = (index: number, name: string) => {
    const newTeams = [...teams];
    newTeams[index] = name;
    setTeams(newTeams);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all mb-12 group"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Matchdays
        </button>

        <motion.div
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl shadow-slate-200/50 border border-slate-100"
        >
          <div className="mb-16">
            <h1 className="text-5xl font-light tracking-tight text-slate-800">Initialize</h1>
            <p className="text-sm font-medium text-slate-400 mt-2 uppercase tracking-[0.2em]">Setup Session Framework</p>
          </div>

          <div className="space-y-12">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 block px-2">Session Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 p-6 rounded-2xl focus:ring-2 focus:ring-slate-900 outline-none transition-all text-2xl font-light"
              />
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-baseline px-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Team Alignment</label>
                <span className="text-[10px] font-bold text-slate-300 tracking-widest">3 TEAMS REQUIRED</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {teams.map((team, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100 group focus-within:border-slate-900 transition-all">
                    <div className={`w-14 h-14 flex items-center justify-center rounded-xl font-bold ${getTeamColorClass(team)} ${getTeamTextColorClass(team)} shadow-inner`}>
                      {idx + 1}
                    </div>
                    <input
                      type="text"
                      placeholder="Enter Color (e.g. Red)"
                      value={team}
                      onChange={(e) => updateTeam(idx, e.target.value)}
                      className="flex-1 bg-transparent p-4 outline-none font-bold text-lg placeholder:text-slate-300"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-slate-900 text-white font-bold py-8 rounded-[2rem] hover:opacity-90 transition-all flex items-center justify-center gap-4 group text-lg tracking-tight shadow-xl shadow-slate-900/20"
            >
              Start Session
              <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

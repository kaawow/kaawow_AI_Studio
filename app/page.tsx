'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MatchDay, handleFirestoreError, OperationType, formatDateSafe, getTeamColorClass } from '@/lib/match-utils';
import { useMatchSession } from '@/hooks/use-match-session';
import { motion } from 'motion/react';
import { Calendar, Plus, FileUp, Trophy, ArrowRight, X } from 'lucide-react';
import Papa from 'papaparse';

export default function MatchRecordPage() {
  const router = useRouter();
  const { setCurrentMatchDay, resetSession } = useMatchSession();
  const [matchDays, setMatchDays] = useState<MatchDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  async function fetchMatchDays() {
    setLoading(true);
    try {
      const q = query(collection(db, 'matchDays'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MatchDay[];
      setMatchDays(docs);
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error('Failed to fetch match days:', msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMatchDays();
  }, []);

  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setIsDeleting(true);
    setDeleteSuccess(false);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const docRef = doc(db, 'matchDays', id);
        batch.delete(docRef);
      });
      await batch.commit();
      
      setSelectedIds([]);
      setIsDeleteMode(false);
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
      await fetchMatchDays();
    } catch (error: any) {
      const msg = error?.message || String(error);
      console.error('Bulk delete failed:', msg);
      alert('Delete failed: ' + msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleNew = () => {
    resetSession();
    router.push('/setup');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) return;

        // Grouping matches by Date if multiple days exist is complex, 
        // but user usually imports one file for one session.
        // We assume all rows in the file belong to one session.
        
        const firstMatch = rows[0];
        const date = firstMatch['Date'] || new Date().toISOString().split('T')[0];
        
        // Extract unique teams
        const teamSet = new Set<string>();
        rows.forEach(r => {
          if (r['Home Team']) teamSet.add(r['Home Team']);
          if (r['Away Team']) teamSet.add(r['Away Team']);
        });
        const teams = Array.from(teamSet);

        const matches = rows.map(r => ({
          homeTeamIndex: teams.indexOf(r['Home Team']),
          awayTeamIndex: teams.indexOf(r['Away Team']),
          homeScore: parseInt(r['Home Score'] || '0'),
          awayScore: parseInt(r['Away Score'] || '0')
        }));

        const matchDay: Partial<MatchDay> = {
          date: date,
          teams: teams,
          matches: matches
        };

        setCurrentMatchDay(matchDay);
        router.push('/results');
      }
    });

    e.target.value = '';
  };

  const handleCardClick = (md: MatchDay) => {
    if (isDeleteMode) {
      if (md.id) toggleSelect(md.id);
      return;
    }
    setCurrentMatchDay(md);
    router.push('/setup');
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans bg-slate-50 text-slate-900">
      <header className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row justify-between items-end gap-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-6xl font-light tracking-tight text-slate-800">
              Matchdays
            </h1>
            {deleteSuccess && (
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full"
              >
                Deleted Successfully
              </motion.span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-[0.3em] inline-block py-1 px-4 bg-white rounded-full shadow-sm border border-slate-100">Session History</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          {matchDays.length > 0 && (
            <>
              {isDeleteMode ? (
                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={() => {
                      setIsDeleteMode(false);
                      setSelectedIds([]);
                    }}
                    disabled={isDeleting}
                    className="flex-1 md:flex-none px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedIds.length === 0 || isDeleting}
                    className="flex-1 md:flex-none px-8 py-4 bg-red-500 text-white rounded-2xl text-sm font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-red-500/20 disabled:opacity-30 disabled:shadow-none min-w-[200px]"
                  >
                    {isDeleting ? 'Deleting...' : `Confirm Delete (${selectedIds.length})`}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsDeleteMode(true)}
                  className="flex-1 md:flex-none px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                  Delete Mode
                </button>
              )}
            </>
          )}
          
          {!isDeleteMode && (
            <>
              <button
                onClick={handleImportClick}
                className="flex-1 md:flex-none px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm"
              >
                <FileUp size={18} />
                Import
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv"
                className="hidden"
              />
              <button
                onClick={handleNew}
                className="flex-1 md:flex-none px-8 py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold uppercase tracking-[0.2em] hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-900/30 group"
              >
                <Plus size={18} />
                New Entry
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform opacity-50" />
              </button>
            </>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-white rounded-[3rem] animate-pulse border border-slate-100 shadow-sm" />
            ))}
          </div>
        ) : matchDays.length === 0 ? (
          <div className="text-center py-40 bg-white rounded-[4rem] border-2 border-dashed border-slate-200 shadow-sm">
            <div className="p-6 bg-slate-50 rounded-full inline-block mb-6">
               <Calendar className="text-slate-300" size={48} />
            </div>
            <h2 className="text-xl font-light text-slate-400">Your archive is empty</h2>
            <button onClick={handleNew} className="mt-8 text-slate-900 font-bold uppercase tracking-widest text-sm border-b-2 border-slate-900 pb-1 hover:pb-2 transition-all">Start your first session</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {matchDays.map((md, index) => (
              <motion.div
                key={md.id || index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleCardClick(md)}
                className={`group bg-white p-8 rounded-[2rem] border transition-all cursor-pointer flex flex-col h-48 shadow-sm relative overflow-hidden ${
                  isDeleteMode && selectedIds.includes(md.id!) 
                    ? 'border-red-500 ring-2 ring-red-500/20' 
                    : 'border-slate-100 hover:border-slate-900 hover:shadow-xl hover:shadow-slate-300/50'
                }`}
              >
                {isDeleteMode && (
                  <div 
                    className="absolute top-4 right-4 z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (md.id) toggleSelect(md.id);
                    }}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedIds.includes(md.id!) 
                        ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30' 
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}>
                      {selectedIds.includes(md.id!) && <X size={14} className="rotate-45" />}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-[0.2em]">
                    <Calendar size={12} className="text-slate-200" />
                    {formatDateSafe(md.date, 'MMM dd, yyyy')}
                  </div>
                  <div className="flex gap-1.5">
                    {md.teams.map((t, idx) => (
                      <div key={idx} className={`w-2 h-2 rounded-full ${getTeamColorClass(t)} shadow-sm`} />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto mt-40 flex justify-between items-center text-[10px] border-t border-slate-200 pt-12 text-slate-300 font-bold uppercase tracking-[0.5em]">
        <span>Pitch Record</span>
        <span>Archive Control</span>
        <span>v.4.0</span>
      </footer>
    </div>
  );
}

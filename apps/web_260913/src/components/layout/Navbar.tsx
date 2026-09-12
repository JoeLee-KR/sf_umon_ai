import React from 'react';
import { Activity, Bell } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="h-14 border-b border-zinc-200 bg-white px-5 flex items-center justify-between sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-2.5 font-bold text-zinc-900 tracking-tight text-sm">
        <Activity className="h-5 w-5 text-indigo-600 shrink-0" />
        <span>SF UMON AI Core Platform</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded border border-zinc-200">
          Phase 1: Local
        </span>
        <button
          type="button"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
          aria-label="알림"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
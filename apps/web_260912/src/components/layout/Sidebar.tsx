'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Sliders, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { label: '대시보드', href: '/', icon: LayoutDashboard },
    { label: '임직원 통계/원천', href: '/employees', icon: Users },
    { label: '설정 관리', href: '/settings', icon: Sliders },
  ];

  return (
    <aside
      className={cn(
        "border-r border-zinc-200 bg-white flex flex-col justify-between transition-[width] duration-200 ease-in-out shrink-0",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition",
                isActive
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      <div className="p-3 border-t border-zinc-200 flex justify-end">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
          aria-label="사이드바 토글"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
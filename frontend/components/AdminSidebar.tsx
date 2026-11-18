'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Inbox,
  Clock,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  BarChart3,
  LogOut,
  ShieldAlert,
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  const currentStatus = searchParams.get('status');

  const navItems = [
    {
      name: 'Overview',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/admin/dashboard',
    },
    {
      name: 'All Complaints',
      href: '/admin/complaints',
      icon: Inbox,
      active: pathname === '/admin/complaints' && !currentStatus,
    },
    {
      name: 'Pending Triage',
      href: '/admin/complaints?status=SUBMITTED',
      icon: Clock,
      active: pathname === '/admin/complaints' && currentStatus === 'SUBMITTED',
      badge: 'New',
    },
    {
      name: 'In Progress',
      href: '/admin/complaints?status=IN_PROGRESS',
      icon: RefreshCw,
      active: pathname === '/admin/complaints' && currentStatus === 'IN_PROGRESS',
    },
    {
      name: 'Resolved',
      href: '/admin/complaints?status=RESOLVED',
      icon: CheckCircle2,
      active: pathname === '/admin/complaints' && currentStatus === 'RESOLVED',
    },
    {
      name: 'AI Insights',
      href: '/admin/insights',
      icon: Sparkles,
      active: pathname === '/admin/insights',
      badge: 'AI',
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      active: pathname === '/admin/analytics',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)] text-slate-300">
      <div className="p-4 space-y-6">
        {/* Officer Profile Badge */}
        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500 text-slate-950 flex items-center justify-center font-bold text-sm shadow">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-white truncate">{user?.name}</h4>
            <span className="inline-block text-[10px] font-semibold text-teal-400 uppercase tracking-wider">
              {user?.role} Officer
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="space-y-1">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  item.active
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${item.active ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${
                      item.active
                        ? 'bg-slate-950 text-teal-300'
                        : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer link / logout */}
      <div className="p-4 border-t border-slate-800/80 space-y-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ShieldAlert className="w-4 h-4 text-teal-400" />
          <span>Switch to Citizen View</span>
        </Link>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out Officer</span>
        </button>
      </div>
    </aside>
  );
}

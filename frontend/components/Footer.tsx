import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Heart, Building2, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950">
                <ShieldAlert className="w-5 h-5 font-bold" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Civic<span className="text-teal-400">AI</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              CivicAI is an AI-powered civic issue reporting and management system engineered to bridge citizens and municipal authorities for faster, transparent urban grievance resolution.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
              <Building2 className="w-4 h-4 text-teal-400" />
              <span>B.Tech CSE Semester 5 Project • Academic Prototype</span>
            </div>
          </div>

          {/* Issue Categories */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-3">
              Civic Categories
            </h4>
            <ul className="space-y-2 text-sm">
              <li><span className="hover:text-teal-400 cursor-pointer">Potholes & Roads</span></li>
              <li><span className="hover:text-teal-400 cursor-pointer">Garbage Accumulation</span></li>
              <li><span className="hover:text-teal-400 cursor-pointer">Water Leakage & Mains</span></li>
              <li><span className="hover:text-teal-400 cursor-pointer">Drainage & Culverts</span></li>
              <li><span className="hover:text-teal-400 cursor-pointer">Streetlights & Electrics</span></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-teal-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-teal-400 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-teal-400 transition-colors">
                  Citizen Dashboard
                </Link>
              </li>
              <li>
                <Link href="/complaints/new" className="hover:text-teal-400 transition-colors">
                  Report an Issue
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} CivicAI Platform. Designed for Smart Civic Infrastructure.</p>
          <p className="flex items-center gap-1">
            Built with Next.js, Express & PostgreSQL
          </p>
        </div>
      </div>
    </footer>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldAlert,
  ArrowRight,
  Camera,
  MapPin,
  Cpu,
  CheckCircle,
  AlertOctagon,
  Trash2,
  Droplets,
  Waves,
  Lightbulb,
  Car,
  Clock,
  Sparkles,
  BarChart3,
  Users,
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();

  const categories = [
    {
      icon: AlertOctagon,
      title: 'Potholes & Cracks',
      desc: 'Hazardous road depressions, asphalt fractures, and vehicular dangers.',
      color: 'bg-amber-500/10 text-amber-600 border-amber-200',
    },
    {
      icon: Trash2,
      title: 'Garbage Accumulation',
      desc: 'Overflowing dumpsters, public littering, and unsanitary bio-waste.',
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    },
    {
      icon: Droplets,
      title: 'Water Leakage',
      desc: 'Broken pipelines, potable water wastage, and flooded street junctions.',
      color: 'bg-blue-500/10 text-blue-600 border-blue-200',
    },
    {
      icon: Waves,
      title: 'Drainage Problems',
      desc: 'Clogged storm drains, overflowing sewers, and monsoon waterlogging.',
      color: 'bg-teal-500/10 text-teal-600 border-teal-200',
    },
    {
      icon: Lightbulb,
      title: 'Streetlight Failures',
      desc: 'Non-functional night lights, broken poles, and dark unlit stretches.',
      color: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    },
    {
      icon: Car,
      title: 'Road & Footpath Damage',
      desc: 'Missing manhole covers, destroyed sidewalks, and eroded shoulders.',
      color: 'bg-stone-500/10 text-stone-600 border-stone-200',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Snap & Describe',
      desc: 'Photograph the civic problem on your phone and provide a concise description.',
      icon: Camera,
    },
    {
      step: '02',
      title: 'Pin Location & Categorize',
      desc: 'Automatically capture GPS coordinates or set your street address with ease.',
      icon: MapPin,
    },
    {
      step: '03',
      title: 'AI Priority & Routing',
      desc: 'Smart categorization estimates severity and dispatches alerts directly to local ward teams.',
      icon: Cpu,
    },
    {
      step: '04',
      title: 'Track Resolution',
      desc: 'Monitor real-time progress from submission to municipal on-site completion.',
      icon: CheckCircle,
    },
  ];

  const features = [
    {
      icon: Clock,
      title: 'Real-Time Transparency',
      desc: 'Never wonder if your complaint disappeared. Track audit timestamps at every milestone.',
    },
    {
      icon: Sparkles,
      title: 'AI Intelligence Foundation',
      desc: 'Automated computer vision and severity analysis to prioritize life-threatening hazards.',
    },
    {
      icon: BarChart3,
      title: 'Municipal Accountability',
      desc: 'Data-driven visibility ensures civic authorities address recurring hotspot zones.',
    },
    {
      icon: Users,
      title: 'Citizen Empowerment',
      desc: 'Direct civic participation puts community transformation directly in your hands.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white py-20 lg:py-28 border-b border-slate-800">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-teal-500/15 blur-[120px] pointer-events-none rounded-full" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-teal-500/30 text-teal-300 text-xs font-semibold tracking-wide shadow-inner">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            CivicAI Citizen Portal — Sprint 1 Operational
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Building Better Communities,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-sky-400 to-blue-500">
              One Report at a Time.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed">
            Report civic problems, track their progress, and help create cleaner, safer, and smarter communities with CivicAI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href={user ? '/complaints/new' : '/login'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm sm:text-base shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Report an Issue
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href={user ? '/dashboard' : '/login'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-white border border-slate-700 font-semibold text-sm sm:text-base transition-all hover:border-slate-600"
            >
              View My Complaints
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-slate-800/80 text-left">
            <div>
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-xs text-slate-400">Open Source Stack</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-teal-400">&lt; 2 min</div>
              <div className="text-xs text-slate-400">Report Submission</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-sky-400">GPS</div>
              <div className="text-xs text-slate-400">Precise Geotagging</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">Live</div>
              <div className="text-xs text-slate-400">Audit Status Tracking</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-100/60 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">
              Simple 4-Step Process
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              How CivicAI Works
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Designed from the ground up for frictionless reporting so civic repairs happen without bureaucratic delays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow relative"
                >
                  <span className="text-3xl font-black text-slate-200 absolute top-4 right-4">
                    {s.step}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supported Categories Section */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">
              Comprehensive Coverage
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Supported Complaint Categories
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Whatever the civic hazard, CivicAI organizes and routes complaints to the appropriate municipal department.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border p-6 hover:border-slate-300 transition-all hover:translate-y-[-2px] bg-slate-50/50"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${cat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {cat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {cat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why CivicAI Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">
              Built For Impact
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Why CivicAI?
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Combining modern citizen engagement with intelligent automation to fix urban infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 hover:bg-slate-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* CTA Banner */}
          <div className="mt-16 bg-gradient-to-r from-teal-900/60 via-slate-800 to-sky-900/60 border border-teal-500/30 rounded-3xl p-8 sm:p-12 text-center space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-white">
              Ready to report an issue in your neighborhood?
            </h3>
            <p className="text-slate-300 text-sm max-w-xl mx-auto">
              Join fellow citizens in keeping our streets, water, and municipal services functional.
            </p>
            <div>
              <Link
                href={user ? '/complaints/new' : '/register'}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-sm shadow-md transition-all hover:scale-105"
              >
                Get Started Today
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from 'next/link';
import type { FamilyMember } from "@/lib/data";
import { Star, Flame, Crown, Zap, Edit } from "lucide-react";
import { cn } from "@/lib/utils";

interface FamilyMemberCardProps {
  member: FamilyMember;
  onEdit: () => void;
}

const moodEmojis: { [key: string]: string } = {
  happy: '😊',
  excited: '🤩',
  focused: '🤓',
  playful: '😄',
  tired: '😴',
  stressed: '😰',
  neutral: '😐',
};

// Sabit HEX renkleri yerine uygulamanın genel temasına uygun Tailwind sınıfları kullanıldı
const roleAccent: { [key: string]: { from: string; to: string; text: string; bgSoft: string; iconFill: string } } = {
  'Baba':        { from: 'from-blue-500', to: 'to-indigo-500', text: 'text-blue-600 dark:text-blue-400', bgSoft: 'bg-blue-50 dark:bg-blue-900/30', iconFill: 'fill-blue-500' },
  'Anne':        { from: 'from-pink-500', to: 'to-purple-500', text: 'text-pink-600 dark:text-pink-400', bgSoft: 'bg-pink-50 dark:bg-pink-900/30', iconFill: 'fill-pink-500' },
  'Kız Çocuk':  { from: 'from-purple-500', to: 'to-pink-500', text: 'text-purple-600 dark:text-purple-400', bgSoft: 'bg-purple-50 dark:bg-purple-900/30', iconFill: 'fill-purple-500' },
  'Erkek Çocuk':{ from: 'from-emerald-500', to: 'to-cyan-500', text: 'text-emerald-600 dark:text-emerald-400', bgSoft: 'bg-emerald-50 dark:bg-emerald-900/30', iconFill: 'fill-emerald-500' },
  'Bebek':       { from: 'from-amber-500', to: 'to-orange-500', text: 'text-amber-600 dark:text-amber-400', bgSoft: 'bg-amber-50 dark:bg-amber-900/30', iconFill: 'fill-amber-500' },
};

const defaultAccent = { from: 'from-slate-500', to: 'to-slate-600', text: 'text-slate-600 dark:text-slate-400', bgSoft: 'bg-slate-50 dark:bg-slate-800/50', iconFill: 'fill-slate-500' };

export function FamilyMemberCard({ member, onEdit }: FamilyMemberCardProps) {
  const accent = roleAccent[member.role] || defaultAccent;
  const xpPct = (member.xp % 1000) / 10;

  return (
    <Link href={`/profile/${member.id}`} className="block active:scale-[0.98] transition-transform duration-200">
      <div className="relative overflow-hidden rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm">
        
        {/* ── ÜST RENK BANDI (Gradient) ── */}
        <div className={cn("h-1.5 w-full bg-gradient-to-r", accent.from, accent.to)} />

        {/* ── ÜSTTE: Avatar + Mood + Düzenle ── */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between">
            {/* Sol: Avatar + online dot */}
            <div className="relative">
              <div className={cn("w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-2xl font-black text-white shadow-sm bg-gradient-to-br", accent.from, accent.to)}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              {/* Online nokta */}
              <div className={cn(
                  "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900",
                  member.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
                )}
              />
            </div>

            {/* Orta: İsim + Rol */}
            <div className="flex-1 mx-3 min-w-0 pt-1">
              <p className="text-base font-black leading-tight text-slate-900 dark:text-slate-100 truncate">
                {member.name}
              </p>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider">
                {member.role}
              </p>
            </div>

            {/* Sağ: Mood emoji + Düzenle */}
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
                className={cn("w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform", accent.bgSoft)}
              >
                <Edit className={cn("w-3.5 h-3.5", accent.text)} />
              </button>
              <span className="text-2xl leading-none">
                {moodEmojis[member.mood] || '😐'}
              </span>
            </div>
          </div>
        </div>

        {/* ── SEVİYE + XP BAR ── */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full", accent.bgSoft)}>
              <Crown className={cn("w-3.5 h-3.5", accent.text, accent.iconFill)} />
              <span className={cn("text-[11px] font-black", accent.text)}>
                Seviye {member.level}
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {member.xp.toLocaleString('tr-TR')} XP
            </span>
          </div>

          {/* XP Progress bar */}
          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <div
              className={cn("h-full rounded-full transition-all duration-700 bg-gradient-to-r", accent.from, accent.to)}
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1.5 text-right">
            %{Math.round(xpPct)} → Seviye {member.level + 1}
          </p>
        </div>

        {/* ── İSTATİSTİKLER: Streak & Görev ── */}
        <div className="px-4 pb-4 flex gap-2.5">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-[1rem] bg-orange-50 dark:bg-orange-950/30 border border-orange-100/50 dark:border-orange-900/50">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-500 shadow-sm">
              <Flame className="w-4 h-4 fill-white text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">
                {member.streak}
              </p>
              <p className="text-[9px] font-bold text-orange-600/70 dark:text-orange-400/70 uppercase tracking-widest mt-0.5">Gün</p>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-[1rem] bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/50">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-400 to-indigo-500 shadow-sm">
              <Zap className="w-4 h-4 fill-white text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">
                {member.completedTasks}
              </p>
              <p className="text-[9px] font-bold text-indigo-600/70 dark:text-indigo-400/70 uppercase tracking-widest mt-0.5">Görev</p>
            </div>
          </div>
        </div>

        {/* ── ROZETLER ── */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/20">
          {member.badges && member.badges.length > 0 ? (
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-1">
                Rozetler
              </p>
              {member.badges.slice(0, 5).map((badge, i) => (
                <span
                  key={i}
                  title={badge}
                  className="text-lg leading-none active:scale-110 transition-transform cursor-default"
                >
                  {badge}
                </span>
              ))}
              {member.badges.length > 5 && (
                <span
                  className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", accent.bgSoft, accent.text)}
                >
                  +{member.badges.length - 5}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 text-center py-0.5">
              Henüz rozet kazanılmadı
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
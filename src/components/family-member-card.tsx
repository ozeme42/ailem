"use client";

import * as React from "react";
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import type { FamilyMember } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { Star, Flame, Crown, Zap, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  neutral: '😐'
};

// Koyu mod gradyanlarını daha belirgin (daha karanlık/derin) yaptık
const gradientClasses: { [key: string]: string } = {
    Baba: "from-blue-500 to-indigo-600 dark:from-blue-900 dark:to-indigo-950",
    Anne: "from-pink-500 to-purple-600 dark:from-pink-900 dark:to-purple-950",
    'Kız Çocuk': "from-purple-400 to-violet-500 dark:from-purple-900 dark:to-violet-950",
    'Erkek Çocuk': "from-teal-400 to-cyan-500 dark:from-teal-900 dark:to-cyan-950",
    Bebek: "from-yellow-400 to-orange-500 dark:from-yellow-700 dark:to-orange-900",
};

export function FamilyMemberCard({ member, onEdit }: FamilyMemberCardProps) {
  // Varsayılan gri gradyan (Rol bulunamazsa)
  const gradient = gradientClasses[member.role] || 'from-slate-400 to-slate-500 dark:from-slate-800 dark:to-slate-900';
  
  return (
    <Link href={`/profile/${member.id}`} className="group block h-full">
        <Card className="overflow-hidden h-full border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-2xl dark:shadow-black/50 hover:-translate-y-1 transition-all duration-300 bg-white dark:bg-slate-950">
            
            {/* Üst Gradyan Bölümü */}
            <div className={cn("relative p-4 text-white bg-gradient-to-br transition-colors duration-500", gradient)}>
                
                {/* Düzenle Butonu */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 dark:hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit();
                    }}
                >
                    <Edit className="h-4 w-4" />
                </Button>

                {/* Avatar ve Mood */}
                <div className="flex justify-between items-start mb-2">
                    <div className="relative">
                        <div 
                            className="w-16 h-16 rounded-full border-4 border-white/30 dark:border-white/10 flex items-center justify-center bg-white/20 dark:bg-black/20 backdrop-blur-sm text-3xl font-bold shadow-inner"
                            style={{ backgroundColor: member.color ? `${member.color}80` : undefined, color: 'white' }}
                        >
                            {member.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Çevrimiçi Durum Noktası */}
                        <div className={cn(
                            "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white/50 dark:border-slate-700",
                            member.status === 'online' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : 'bg-slate-400'
                        )}/>
                    </div>
                    <div className="text-4xl drop-shadow-md transform group-hover:scale-110 transition-transform duration-300">
                        {moodEmojis[member.mood] || '😐'}
                    </div>
                </div>
                
                {/* İsim ve Rol */}
                <h3 className="text-xl font-bold tracking-tight drop-shadow-sm">{member.name}</h3>
                <p className="text-sm opacity-90 font-medium text-white/80">{member.role}</p>
                
                {/* XP ve Level Bar */}
                <div className="mt-5 space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="flex items-center gap-1.5 bg-black/20 dark:bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            <Crown className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" /> 
                            Seviye {member.level}
                        </span>
                        <span className="flex items-center gap-1 text-white/90">
                            {member.xp.toLocaleString('tr-TR')} XP 
                            <Star className="w-3 h-3 text-yellow-300"/>
                        </span>
                    </div>
                    <Progress 
                        value={(member.xp % 1000) / 10} 
                        className="h-2.5 bg-black/20 dark:bg-black/50 border border-white/10" 
                        indicatorClassName="bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                    />
                </div>

                {/* İstatistikler (Streak & Tasks) */}
                <div className="flex justify-between items-center mt-5 text-sm">
                    <div className="flex items-center gap-2 bg-white/20 dark:bg-black/20 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md hover:bg-white/30 dark:hover:bg-white/10 transition-colors">
                        <Flame className="w-4 h-4 text-orange-200 fill-orange-500 animate-pulse"/>
                        <span className="font-bold">{member.streak} Gün</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 dark:bg-black/20 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md hover:bg-white/30 dark:hover:bg-white/10 transition-colors">
                        <Zap className="w-4 h-4 text-yellow-200 fill-yellow-400"/>
                        <span className="font-bold">{member.completedTasks} Görev</span>
                    </div>
                </div>
            </div>

            {/* Alt İçerik (Rozetler) */}
            <CardContent className="p-0 bg-white dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
                <div className="flex justify-center items-center gap-2 h-12 w-full px-4 text-slate-700 dark:text-slate-300">
                    {member.badges && member.badges.length > 0 ? (
                        member.badges.slice(0, 4).map((badge, index) => (
                            <div key={index} className="text-xl hover:scale-125 transition-transform cursor-help grayscale-[0.3] hover:grayscale-0" title={badge}>
                                {badge}
                            </div>
                        ))
                    ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-600 italic">Henüz rozet yok</span>
                    )}
                </div>
            </CardContent>
        </Card>
    </Link>
  );
}
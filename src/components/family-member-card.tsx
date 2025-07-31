

import * as React from "react";
import Image from "next/image";
import Link from 'next/link';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FamilyMember } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { Star, Flame, Crown, Zap, Edit, BookOpen, BrainCircuit } from "lucide-react";
import { Button } from "./ui/button";

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
  stressed: '😰'
};

const gradientClasses: { [key: string]: string } = {
    Baba: "from-blue-500 to-indigo-600",
    Anne: "from-pink-500 to-purple-600",
    'Kız Çocuk': "from-purple-400 to-violet-500",
    'Erkek Çocuk': "from-teal-400 to-cyan-500",
    Bebek: "from-yellow-400 to-orange-500",
};


export function FamilyMemberCard({ member, onEdit }: FamilyMemberCardProps) {
  const gradient = gradientClasses[member.role] || 'from-gray-400 to-gray-500';
  
  return (
    <Link href={`/profile/${member.id}`} className="group block">
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full">
            <div className={`relative p-4 text-white bg-gradient-to-br ${gradient}`}>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onEdit();
                    }}
                >
                    <Edit className="h-4 w-4" />
                </Button>
                <div className="flex justify-between items-start mb-2">
                    <div className="relative">
                        <div 
                            className="w-16 h-16 rounded-full border-2 border-white/50 flex items-center justify-center bg-white/30 text-3xl font-bold"
                            style={{ backgroundColor: member.color, color: 'white' }}
                        >
                            {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 ${member.status === 'online' ? 'bg-green-400' : 'bg-gray-400'} border-card`}/>
                    </div>
                    <div className="text-3xl">{moodEmojis[member.mood]}</div>
                </div>
                
                <h3 className="text-xl font-bold">{member.name}</h3>
                <p className="text-sm opacity-90">{member.role}</p>
                
                <div className="mt-4">
                    <div className="flex justify-between items-center text-xs font-semibold mb-1">
                        <span className="flex items-center gap-1"><Crown className="w-4 h-4 text-yellow-300" /> Seviye {member.level}</span>
                        <span className="flex items-center gap-1">{member.xp.toLocaleString('tr-TR')} XP <Star className="w-3 h-3 text-yellow-300"/></span>
                    </div>
                    <Progress value={(member.xp % 1000) / 10} className="h-2 bg-white/30" indicatorClassName="bg-white" />
                </div>

                <div className="flex justify-between items-center mt-4 text-sm">
                    <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                        <Flame className="w-4 h-4 text-orange-300"/>
                        <span className="font-bold">{member.streak}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                        <Zap className="w-4 h-4 text-yellow-300"/>
                        <span className="font-bold">{member.completedTasks}</span>
                    </div>
                </div>
            </div>
          <CardContent className="p-3 bg-card h-14">
            <div className="flex justify-around items-center h-full text-xs text-muted-foreground">
                 <div className="flex justify-center items-center gap-2 h-full w-full">
                    {member.badges.slice(0, 3).map((badge, index) => (
                    <div key={index} className="text-2xl" title={badge}>
                        {badge}
                    </div>
                    ))}
                </div>
            </div>
          </CardContent>
        </Card>
    </Link>
  );
}

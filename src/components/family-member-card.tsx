import * as React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { FamilyMember } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { Star } from "lucide-react";

interface FamilyMemberCardProps {
  member: FamilyMember;
}

const badgeColors: { [key: string]: string } = {
  "Görev Ustası": "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  "Kitap Kurdu": "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
  "Takım Oyuncusu": "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  "Haftanın Yıldızı": "bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 border-yellow-400/30",
  "Sanatçı Ruh": "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
};

export function FamilyMemberCard({ member }: FamilyMemberCardProps) {
  const gradientClasses: { [key: string]: string } = {
    Baba: "from-blue-500 to-indigo-600",
    Anne: "from-pink-500 to-purple-600",
    Çocuk: "from-teal-400 to-cyan-500",
    Bebek: "from-yellow-400 to-orange-500",
  };

  const moodEmojis: { [key: string]: string } = {
      Mutlu: '😄',
      Normal: '🙂',
      Yorgun: '😴'
  }
  
  return (
    <Card className="overflow-hidden border-0 shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-300">
      <div className={`h-24 bg-gradient-to-br ${gradientClasses[member.role] || 'from-gray-400 to-gray-500'} relative`}>
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/20 text-white text-xs px-2 py-1 rounded-full">
            <span className={`h-2 w-2 rounded-full ${member.online ? 'bg-green-400' : 'bg-gray-400'}`}></span>
            {member.online ? 'Çevrimiçi' : 'Çevrimdışı'}
        </div>
      </div>
      <CardContent className="p-4 pt-0 text-center">
        <div className="relative -mt-12 mb-2">
          <Image
            src={member.avatar}
            alt={member.name}
            width={96}
            height={96}
            className="rounded-full mx-auto border-4 border-background shadow-md"
            data-ai-hint={`${member.role.toLowerCase()} portrait`}
          />
           <div className="absolute bottom-0 right-10 text-2xl bg-card rounded-full p-1 shadow-md">{moodEmojis[member.mood]}</div>
        </div>
        <h3 className="text-lg font-bold text-foreground">{member.name}</h3>
        <p className="text-sm text-muted-foreground">{member.role}</p>

        <div className="mt-4">
            <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                <span>Seviye {member.level}</span>
                <span className="flex items-center gap-1 font-semibold"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400"/> {member.xp} XP</span>
            </div>
            <Progress value={(member.xp % 1000) / 10} className="h-2" />
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2 h-12">
          {member.badges.map((badge, index) => (
            <Badge key={index} variant="outline" className={`text-xs ${badgeColors[badge] || ''}`}>
              {badge}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

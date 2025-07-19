import * as React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FamilyMember } from "@/lib/data";

interface FamilyMemberCardProps {
  member: FamilyMember;
}

const badgeColors: { [key: string]: string } = {
  "Görev Ustası": "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  "Kitap Kurdu": "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
  "Takım Oyuncusu": "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  "Haftanın Yıldızı": "bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 border-yellow-400/30",
};

export function FamilyMemberCard({ member }: FamilyMemberCardProps) {
  const gradientClasses: { [key: string]: string } = {
    Baba: "from-blue-500 to-indigo-600",
    Anne: "from-pink-500 to-purple-600",
    Çocuk: "from-teal-400 to-cyan-500",
    Bebek: "from-yellow-400 to-orange-500",
  };
  
  return (
    <Card className="overflow-hidden border-0 shadow-lg hover:scale-105 hover:shadow-2xl transition-all duration-300">
      <div className={`h-24 bg-gradient-to-br ${gradientClasses[member.role] || 'from-gray-400 to-gray-500'}`} />
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
        </div>
        <h3 className="text-lg font-bold text-foreground">{member.name}</h3>
        <p className="text-sm text-muted-foreground">{member.role}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
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

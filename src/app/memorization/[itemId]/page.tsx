"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    CARD_BG: "bg-white/5 backdrop-blur-md border border-white/10 shadow-lg",
    TEXT_MAIN: "text-slate-100",
    TEXT_MUTED: "text-slate-400",
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    ICON_BOX: "bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-full shadow-inner border border-white/5",
};

export default function MemorizationItemDetailPage() {
    const router = useRouter();
    
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col">
            
            {/* AMBIENT BACKGROUND */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[400px] h-[400px] bg-slate-800/20 rounded-full blur-[120px]" />
            </div>

            {/* HEADER */}
            <div className={cn("sticky top-0 z-40 w-full transition-all duration-300", glassColors.HEADER_BG)}>
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Button 
                        onClick={() => router.back()} 
                        variant="ghost" 
                        size="icon"
                        className="rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <h1 className={cn("text-lg font-bold tracking-tight", glassColors.TEXT_MAIN)}>
                        Detay Görüntüle
                    </h1>
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-grow flex items-center justify-center p-6 relative z-10">
                <div className={cn("text-center p-10 rounded-3xl max-w-md w-full flex flex-col items-center animate-in zoom-in-95 duration-500", glassColors.CARD_BG)}>
                    
                    <div className={cn("mb-6 relative", glassColors.ICON_BOX)}>
                        <FileQuestion className="h-12 w-12 text-slate-500" />
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full -z-10"></div>
                    </div>

                    <h2 className="text-2xl font-bold mb-3 text-slate-100">Öğe Bulunamadı</h2>
                    
                    <p className={cn("mb-8 font-medium leading-relaxed", glassColors.TEXT_MUTED)}>
                        Aradığınız ezber öğesi silinmiş, taşınmış veya hiç var olmamış olabilir.
                    </p>

                    <Button 
                        onClick={() => router.back()} 
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl h-12 shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02]"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                    </Button>
                </div>
            </div>
        </div>
    );
}
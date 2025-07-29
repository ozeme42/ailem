

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function MemorizationItemDetailPage() {
    const router = useRouter();
    
    return (
        <div className="h-full flex flex-col">
            <PageHeader title="Öğe Bulunamadı">
                 <Button onClick={() => router.back()} variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Button>
            </PageHeader>
            <div className="flex-grow flex items-center justify-center">
                 <div className="text-center p-8">
                    <p>Bu öğe bulunamadı veya kaldırılmış olabilir.</p>
                </div>
            </div>
        </div>
    );
}

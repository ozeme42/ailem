
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

// This is a placeholder page for notebook details.
// A more complete implementation would be built here.

export default function NotebookDetailPage() {
    const router = useRouter();

    return (
        <div className="space-y-6">
            <PageHeader title="Not Defteri">
                 <Button onClick={() => router.back()} variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                </Button>
            </PageHeader>
            <p>Not defteri detay sayfası buraya gelecek.</p>
        </div>
    )
}

import { Suspense } from 'react';
import { BudgetStatsClient } from './stats-client';

export default function BudgetStatsPage() {
  return (
    <div className="min-h-[100dvh] bg-[#F2F2F7] dark:bg-black transition-colors duration-300">
      <Suspense fallback={<StatsSkeleton />}>
        <BudgetStatsClient />
      </Suspense>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="w-full h-full pb-[calc(100px+env(safe-area-inset-bottom))]">
      {/* --- MOBİL HEADER (APP BAR) SKELETON --- */}
      <header className="sticky top-0 z-40 w-full pt-[env(safe-area-inset-top)] bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.05]">
        <div className="flex items-center justify-between px-4 h-12 md:h-14 max-w-2xl mx-auto">
          {/* Geri butonu placeholder */}
          <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
          
          {/* Başlık placeholder */}
          <div className="w-32 h-5 rounded-md bg-black/5 dark:bg-white/10 animate-pulse" />
          
          {/* Sağ aksiyon butonu placeholder */}
          <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 animate-pulse" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        
        {/* --- ANA ÖZET KARTI SKELETON --- */}
        <div className="h-[160px] rounded-[24px] bg-black/5 dark:bg-[#1C1C1E] animate-pulse p-6 flex flex-col justify-between">
            <div className="w-24 h-4 rounded bg-black/5 dark:bg-white/5 mb-2" />
            <div className="w-48 h-8 rounded-lg bg-black/5 dark:bg-white/5" />
            
            <div className="flex gap-4 mt-6">
                <div className="flex-1 h-12 rounded-xl bg-black/5 dark:bg-white/5" />
                <div className="flex-1 h-12 rounded-xl bg-black/5 dark:bg-white/5" />
            </div>
        </div>

        {/* --- IOS SEKME (SEGMENTED CONTROL) SKELETON --- */}
        <div className="h-[38px] rounded-lg bg-black/5 dark:bg-[#1C1C1E] animate-pulse" />

        {/* --- GRAFİKLER VE LİSTELER SKELETON --- */}
        <div className="space-y-4">
          <div className="h-[220px] rounded-[24px] bg-black/5 dark:bg-[#1C1C1E] animate-pulse" />
          
          <div className="flex gap-4">
            <div className="flex-1 h-[140px] rounded-[24px] bg-black/5 dark:bg-[#1C1C1E] animate-pulse" />
            <div className="flex-1 h-[140px] rounded-[24px] bg-black/5 dark:bg-[#1C1C1E] animate-pulse" />
          </div>

          <div className="h-[200px] rounded-[24px] bg-black/5 dark:bg-[#1C1C1E] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
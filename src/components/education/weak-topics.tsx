"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, TrendingUp, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface WeakTopicsProps {
  data: any[]; // processedData
}

export function WeakTopics({ data }: WeakTopicsProps) {
  const weakTopics = React.useMemo(() => {
    // 1. Verileri Ders ve Konu bazında grupla
    const grouped: Record<string, any> = {};
    
    data.forEach(item => {
      if (!item._subjectName || !item._topicName) return;
      const key = `${item._subjectName}::${item._topicName}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          subject: item._subjectName,
          topic: item._topicName,
          totalQ: 0,
          correct: 0,
          incorrect: 0,
          empty: 0
        };
      }
      
      grouped[key].totalQ += (item._totalQ || 0);
      grouped[key].correct += (item._correct || 0);
      grouped[key].incorrect += (item._incorrect || 0);
      grouped[key].empty += (item._empty || 0);
    });

    // 2. Oranları hesapla ve filtrele
    const statsArray = Object.values(grouped).map(g => {
      const accuracy = g.totalQ > 0 ? (g.correct / g.totalQ) * 100 : 0;
      const incorrectRate = g.totalQ > 0 ? (g.incorrect / g.totalQ) * 100 : 0;
      const emptyRate = g.totalQ > 0 ? (g.empty / g.totalQ) * 100 : 0;
      const lossRate = incorrectRate + emptyRate; // Kayıp = Yanlış + Boş
      
      // Fırsat Skoru: Soru hacmi * Yanlış/Boş oranı (Ne kadar çok soru ve hata varsa skor o kadar yüksek)
      const opportunityScore = g.totalQ * (lossRate / 100);
      
      let insight = "Konu tekrarı önerilir.";
      if (g.totalQ > 20 && accuracy < 40) insight = "Doğruluk oranı düşük, çalışma hacmi yüksek";
      else if (g.empty > g.incorrect) insight = "Boş bırakma oranı yüksek, konu eksiği var";
      else if (accuracy < 50) insight = "Yeterli tekrar yapılmamış";

      return {
        ...g,
        accuracy,
        incorrectRate,
        emptyRate,
        lossRate,
        opportunityScore,
        insight
      };
    });

    // En az 10 soru çözülmüş ve başarısı %60'ın altında olanları seç, fırsat skoruna göre sırala
    return statsArray
      .filter(t => t.totalQ >= 10 && t.accuracy < 60)
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 4); // En acil 4 konu
  }, [data]);

  if (weakTopics.length === 0) {
    return null; // Zayıf konu bulunamadıysa bir şey gösterme
  }

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* Başlık Bölümü */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            Zayıf Konular
          </h2>
          <p className="text-[11px] sm:text-sm font-semibold text-slate-500 mt-0.5 sm:mt-1">
            Düşük doğruluk + yüksek soru = hızlı net artışı.
          </p>
        </div>
        <div className="self-start flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-indigo-600 bg-indigo-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-indigo-100">
          <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Fırsat Skoru
        </div>
      </div>

      {/* Konu Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {weakTopics.map((topic, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Üst Kısım: Ders ve Konu */}
            <h3 className="font-bold text-slate-800 text-xs sm:text-sm mb-1 leading-tight pr-6 sm:pr-8">
              <span className="text-indigo-600">{topic.subject}</span> • {topic.topic}
            </h3>
            
            <p className="text-[10px] sm:text-xs font-bold text-slate-500 mb-1.5 sm:mb-2">
              {topic.totalQ} soru • {topic.correct}D {topic.incorrect}Y {topic.empty}B
            </p>
            
            <p className="text-[10px] sm:text-xs font-semibold text-rose-500 mb-3 sm:mb-4 flex items-center gap-1 sm:gap-1.5 leading-tight">
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              {topic.insight}
            </p>

            {/* Büyük Yüzdeler */}
            <div className="flex items-end justify-between mb-3 sm:mb-4">
              <div className="text-xl sm:text-2xl font-black text-emerald-500 leading-none">
                {Math.round(topic.accuracy)}%
              </div>
              <div className="text-[10px] sm:text-sm font-bold text-rose-500 bg-rose-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
                Kayıp: {Math.round(topic.lossRate)}%
              </div>
            </div>

            {/* Progress Barlar ve Yüzde Detayları */}
            <div className="space-y-2 sm:space-y-3">
              <div className="space-y-1 sm:space-y-1.5">
                <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-600">
                  <span>Doğru Cevap</span>
                  <span>{Math.round(topic.accuracy)}%</span>
                </div>
                <Progress value={topic.accuracy} className="h-1.5 bg-slate-100" indicatorClassName="bg-emerald-500" />
              </div>
              
              <div className="space-y-1 sm:space-y-1.5">
                <div className="flex justify-between text-[10px] sm:text-xs font-bold text-slate-600">
                  <span>Yanlış Cevap</span>
                  <span>{Math.round(topic.incorrectRate)}%</span>
                </div>
                <Progress value={topic.incorrectRate} className="h-1.5 bg-slate-100" indicatorClassName="bg-rose-500" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

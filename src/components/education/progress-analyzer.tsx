"use client";

import * as React from "react";
import { format, startOfWeek, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { cn } from "@/lib/utils";

interface ProgressAnalyzerProps {
  data: any[]; // processedData from stats-client
}

export function ProgressAnalyzer({ data }: ProgressAnalyzerProps) {
  // 1. Dersleri Bul
  const subjects = React.useMemo(() => {
    return Array.from(new Set(data.map(d => d._subjectName))).filter(Boolean).sort();
  }, [data]);

  const [selectedSubject, setSelectedSubject] = React.useState<string>(String(subjects[0] || "Diğer"));
  const [selectedTopic, setSelectedTopic] = React.useState<string | null>(null);

  // Derse ait tüm veriler (Tarihi geçerli olanlar)
  const subjectData = React.useMemo(() => {
    return data.filter(d => d._subjectName === selectedSubject && d._solvedDate && !isNaN(d._solvedDate.getTime()));
  }, [data, selectedSubject]);

  // 2. Seçili Derse Ait Konu İstatistikleri
  const topicStats = React.useMemo(() => {
    const grouped: Record<string, any> = {};
    subjectData.forEach(item => {
      const topic = item._topicName || "Genel";
      if (!grouped[topic]) {
        grouped[topic] = { topic, totalQ: 0, correct: 0, incorrect: 0, empty: 0 };
      }
      grouped[topic].totalQ += (item._totalQ || 0);
      grouped[topic].correct += (item._correct || 0);
      grouped[topic].incorrect += (item._incorrect || 0);
      grouped[topic].empty += (item._empty || 0);
    });

    return Object.values(grouped).map(g => {
      const successRate = g.totalQ > 0 ? (g.correct / g.totalQ) * 100 : 0;
      return { ...g, successRate };
    }).sort((a, b) => b.totalQ - a.totalQ); // Soru sayısına göre sırala
  }, [subjectData]);

  // 3. Grafik İçin Zaman Serisi Verisi
  const chartData = React.useMemo(() => {
    let filtered = subjectData;
    if (selectedTopic) {
      filtered = subjectData.filter(d => d._topicName === selectedTopic);
    }

    const groupedByDate: Record<string, any> = {};
    
    filtered.forEach(item => {
      const d = item._solvedDate;
      const dateKey = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = { dateKey, totalQ: 0, correct: 0 };
      }
      groupedByDate[dateKey].totalQ += (item._totalQ || 0);
      groupedByDate[dateKey].correct += (item._correct || 0);
    });

    const dates = Object.keys(groupedByDate).sort();
    
    return dates.map(date => {
      const g = groupedByDate[date];
      const successRate = g.totalQ > 0 ? (g.correct / g.totalQ) * 100 : 0;
      let displayDate = date;
      try {
        displayDate = format(parseISO(date), 'd MMM', { locale: tr });
      } catch(e) {}

      return {
        displayDate,
        "Başarı (%)": Number(successRate.toFixed(1)),
      };
    });
  }, [subjectData, selectedTopic]);

  // Bar rengi belirleme fonksiyonu (Görseldeki renklere uygun)
  const getBarColor = (rate: number) => {
    if (rate >= 70) return "bg-emerald-500";
    if (rate >= 50) return "bg-[#eab308]"; // Sarı (Yellow-500)
    if (rate >= 30) return "bg-[#f97316]"; // Turuncu (Orange-500)
    return "bg-[#ef4444]"; // Kırmızı (Red-500)
  };

  if (subjects.length === 0) {
    return <div className="p-8 text-center text-slate-500">Gösterilecek veri bulunmuyor.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Ders Seçim Barı */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {subjects.map(s => {
          const isActive = selectedSubject === String(s);
          return (
            <button
              key={String(s)}
              onClick={() => {
                setSelectedSubject(String(s));
                setSelectedTopic(null); // Ders değişince konu seçimini sıfırla
              }}
              className={cn(
                "px-4 py-2 font-bold text-sm rounded-t-lg transition-colors border-b-2",
                isActive 
                  ? "border-indigo-600 text-indigo-700 bg-indigo-50/50" 
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )}
            >
              {String(s)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-black text-[#6B21A8] uppercase tracking-wide">
          {selectedSubject}
        </h2>
        {selectedTopic && (
          <button 
            onClick={() => setSelectedTopic(null)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-md"
          >
            Tüm Derse Dön
          </button>
        )}
      </div>

      {/* Gelişim Grafiği (Zamana Göre) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">
          {selectedTopic ? `${selectedTopic} Gelişimi (Haftalık)` : `${selectedSubject} Genel Gelişimi (Haftalık)`}
        </h3>
        <div className="w-full h-[250px]">
          {chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium">
              Geçmiş veri bulunmuyor.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickMargin={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Başarı (%)" 
                  stroke="#6366F1" 
                  strokeWidth={3} 
                  activeDot={{ r: 6, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Veri Tablosu */}
      <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm -mx-4 sm:mx-0">
        <div className="bg-[#f8fafc] px-3 sm:px-4 py-2 sm:py-3 border-b border-slate-200 text-[10px] sm:text-xs text-slate-500 font-medium">
          Grafiğini görmek istediğiniz konunun üzerine tıklayabilirsiniz. Düşük çözünürlüklü ekranlarda tabloyu sağa kaydırabilirsiniz.
        </div>
        <table className="w-full text-xs sm:text-sm text-left border-collapse min-w-[500px]">
          <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-700 font-bold text-[10px] sm:text-sm">
            <tr>
              <th className="px-2 sm:px-4 py-2 sm:py-4 border-r border-slate-200 w-[35%] sm:w-2/5">Konu / Kazanım</th>
              <th className="px-1 sm:px-2 py-2 sm:py-4 border-r border-slate-200 text-center w-12 sm:w-24">Soru</th>
              <th className="px-1 sm:px-2 py-2 sm:py-4 border-r border-slate-200 text-center w-12 sm:w-20">Doğru</th>
              <th className="px-1 sm:px-2 py-2 sm:py-4 border-r border-slate-200 text-center w-12 sm:w-20">Yanlış</th>
              <th className="px-1 sm:px-2 py-2 sm:py-4 border-r border-slate-200 text-center w-12 sm:w-20">Boş</th>
              <th className="px-1 sm:px-2 py-2 sm:py-4 border-r border-slate-200 text-center w-16 sm:w-24">Başarı %</th>
              <th className="px-2 sm:px-4 py-2 sm:py-4 text-center w-20 sm:w-32">Grafik</th>
            </tr>
          </thead>
          <tbody>
            {topicStats.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Bu derse ait veri bulunamadı.</td>
              </tr>
            ) : (
              topicStats.map((ts, idx) => {
                const isSelected = selectedTopic === ts.topic;
                return (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedTopic(ts.topic)}
                    className={cn(
                      "border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer",
                      isSelected ? "bg-indigo-50/50" : ""
                    )}
                  >
                    <td className="px-2 sm:px-4 py-3 sm:py-4 border-r border-slate-200 text-slate-700 font-medium text-[10px] sm:text-sm line-clamp-2 sm:line-clamp-none">
                      {ts.topic}
                    </td>
                    <td className="px-1 sm:px-2 py-3 sm:py-4 border-r border-slate-200 text-center text-slate-600 font-medium">
                      {ts.totalQ}
                    </td>
                    <td className="px-1 sm:px-2 py-3 sm:py-4 border-r border-slate-200 text-center text-[#10b981] font-medium">
                      {ts.correct}
                    </td>
                    <td className="px-1 sm:px-2 py-3 sm:py-4 border-r border-slate-200 text-center text-[#ef4444] font-medium">
                      {ts.incorrect}
                    </td>
                    <td className="px-1 sm:px-2 py-3 sm:py-4 border-r border-slate-200 text-center text-slate-400 font-medium">
                      {ts.empty}
                    </td>
                    <td className="px-1 sm:px-2 py-3 sm:py-4 border-r border-slate-200 text-center text-slate-900 font-bold">
                      %{ts.successRate.toFixed(1)}
                    </td>
                    <td className="px-2 sm:px-4 py-3 sm:py-4 align-middle">
                      <div className="w-full h-1.5 sm:h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", getBarColor(ts.successRate))}
                          style={{ width: `${ts.successRate}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

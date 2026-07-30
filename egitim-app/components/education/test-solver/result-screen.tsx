import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle2, XCircle, HelpCircle, Trophy, Sparkles } from 'lucide-react-native';

export function ResultScreen({ test }: any) {
  if (!test) return null;

  return (
    <View className="m-4 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
      <View className="items-center mb-6">
        <View className="bg-indigo-100 dark:bg-indigo-500/20 p-4 rounded-full mb-4">
          <Trophy size={36} color="#4f46e5" strokeWidth={1.5} />
        </View>
        <Text className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-1">
          Sınav Analizi
        </Text>
        <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Sonuçların başarıyla kaydedildi
        </Text>
      </View>

      <View className="flex-row flex-wrap justify-between gap-y-4">
        {/* Doğru */}
        <View className="w-[48%] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-5 items-center">
          <CheckCircle2 size={24} color="#10b981" className="mb-2" />
          <Text className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {test.correctAnswers || 0}
          </Text>
          <Text className="text-xs font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider mt-1">
            Doğru
          </Text>
        </View>

        {/* Yanlış */}
        <View className="w-[48%] bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl p-5 items-center">
          <XCircle size={24} color="#f43f5e" className="mb-2" />
          <Text className="text-3xl font-black text-rose-600 dark:text-rose-400">
            {test.incorrectAnswers || 0}
          </Text>
          <Text className="text-xs font-bold text-rose-600/70 dark:text-rose-400/70 uppercase tracking-wider mt-1">
            Yanlış
          </Text>
        </View>

        {/* Boş */}
        <View className="w-[48%] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 items-center">
          <HelpCircle size={24} color="#64748b" className="mb-2" />
          <Text className="text-3xl font-black text-slate-600 dark:text-slate-300">
            {test.emptyAnswers || 0}
          </Text>
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
            Boş
          </Text>
        </View>

        {/* Başarı */}
        <View className="w-[48%] bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-5 items-center">
          <Sparkles size={24} color="#6366f1" className="mb-2" />
          <Text className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
            %{test.score?.toFixed(0) || 0}
          </Text>
          <Text className="text-xs font-bold text-indigo-600/70 dark:text-indigo-400/70 uppercase tracking-wider mt-1">
            Başarı
          </Text>
        </View>
      </View>
    </View>
  );
}

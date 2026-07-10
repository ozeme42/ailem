import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';

export function ExamOpticalSolver({
  test,
  examDetails,
  studentAnswers,
  handleAnswer,
  isReviewMode,
  expandedSubjects,
  toggleSubject
}: any) {
  if (!test || !examDetails) {
    return (
      <View className="p-6 items-center justify-center">
        <ActivityIndicator size="small" color="#4f46e5" />
        <Text className="text-slate-500 text-xs mt-2">Deneme bilgileri yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View className="space-y-4">
      {examDetails.subjects.map((subject: any, sIdx: number) => {
        const safeSubjectId = subject.id ? String(subject.id) : `subject-${sIdx}`;
        const isExpanded = expandedSubjects.has(safeSubjectId);

        // Calculate question offset
        let offset = 0;
        for (let i = 0; i < sIdx; i++) {
          offset += examDetails.subjects[i].questionCount;
        }

        // Calculate subject marked count
        let markedCount = 0;
        for (let q = 1; q <= subject.questionCount; q++) {
          const numStr = (offset + q).toString();
          if (studentAnswers[numStr]) markedCount++;
        }

        return (
          <View 
            key={safeSubjectId}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm"
          >
            {/* Subject Header Row */}
            <TouchableOpacity 
              onPress={() => toggleSubject(safeSubjectId)}
              activeOpacity={0.8}
              className="p-4 flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-950/20"
            >
              <View className="flex-1 mr-3 flex-row items-center gap-3">
                <View className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950 rounded-xl items-center justify-center font-black text-indigo-550 text-xs">
                  <Text className="font-black text-indigo-600 dark:text-indigo-400">{sIdx + 1}</Text>
                </View>
                <View>
                  <Text className="text-sm font-bold text-slate-800 dark:text-slate-100">{subject.name}</Text>
                  <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {subject.questionCount} Soru • {markedCount} İşaretlendi
                  </Text>
                </View>
              </View>
              <View className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center shrink-0">
                {isExpanded ? (
                  <ChevronUp size={16} color="#64748b" />
                ) : (
                  <ChevronDown size={16} color="#64748b" />
                )}
              </View>
            </TouchableOpacity>

            {/* Optical Sheet inside expanded subject */}
            {isExpanded && (
              <View className="p-4 border-t border-slate-100 dark:border-slate-850 space-y-4">
                {Array.from({ length: subject.questionCount }).map((_, idx) => {
                  const qIndex = offset + idx + 1;
                  const qNum = qIndex.toString();
                  const sAns = studentAnswers[qNum] || "";
                  const cAns = test.answerKey?.[qNum];

                  return (
                    <View key={qNum} className="flex-row items-center justify-between py-2 border-b border-slate-50 dark:border-slate-850 pb-2">
                      <View className="w-8">
                        <Text className="font-black text-sm text-slate-500 dark:text-slate-400">{qIndex}.</Text>
                      </View>
                      
                      <View className="flex-1 flex-row justify-end gap-1.5">
                        {['A', 'B', 'C', 'D', 'E'].map(opt => {
                          const isSelected = sAns === opt;
                          const isCorrectOpt = isReviewMode && opt === cAns;
                          const isWrongOpt = isReviewMode && isSelected && opt !== cAns;

                          return (
                            <TouchableOpacity
                              key={opt}
                              disabled={isReviewMode}
                              onPress={() => handleAnswer(qNum, isSelected ? '' : opt)}
                              className={`w-8.5 h-8.5 rounded-full border flex items-center justify-center font-bold text-[11px] ${
                                !isReviewMode
                                  ? isSelected
                                    ? 'bg-indigo-500 border-indigo-500 text-white'
                                    : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-500'
                                  : isCorrectOpt
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : isWrongOpt
                                      ? 'bg-rose-500 border-rose-500 text-white'
                                      : 'bg-slate-50 border-slate-100 dark:bg-slate-850 dark:border-slate-800 text-slate-350 opacity-40'
                              }`}
                            >
                              <Text className={`font-black ${isSelected || (isReviewMode && (isCorrectOpt || isWrongOpt)) ? 'text-white' : 'text-slate-600 dark:text-slate-350'}`}>
                                {opt}
                              </Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

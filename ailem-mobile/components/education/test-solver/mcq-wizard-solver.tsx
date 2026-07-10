import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Modal, TextInput } from 'react-native';
import { HelpCircle, ChevronLeft, ChevronRight, Grid3x3, CheckCircle2, X, Check, XCircle, AlertCircle } from 'lucide-react-native';

export function McqWizardSolver({
  test,
  activeQuestions,
  currentIndex,
  setCurrentIndex,
  studentAnswers,
  studentTextAnswers = {},
  handleAnswer,
  handleTextAnswer,
  isReviewMode,
  handleFinishTest
}: any) {
  const [navOpen, setNavOpen] = useState(false);

  if (!activeQuestions || activeQuestions.length === 0) return null;

  const currentQ = activeQuestions[currentIndex];
  const qNumStr = (currentIndex + 1).toString();
  const totalQ = activeQuestions.length;
  const isOpenEnded = currentQ?.type === 'open_ended' || test?.openEnded;
  const answeredCount = isOpenEnded
    ? Object.keys(studentTextAnswers).length
    : Object.keys(studentAnswers).length;
  const progress = totalQ > 0 ? answeredCount / totalQ : 0;

  const getQStatus = (idx: number) => {
    const num = (idx + 1).toString();
    if (isOpenEnded) {
      const textAns = studentTextAnswers[num];
      if (!textAns) return 'empty';
      if (isReviewMode) {
        const evaluation = test?.studentTextAnswersEvaluation?.[num];
        if (evaluation === 'correct') return 'correct';
        if (evaluation === 'incorrect') return 'wrong';
        return 'answered';
      }
      return 'answered';
    }
    const ans = studentAnswers[num];
    if (!ans) return 'empty';
    if (isReviewMode) {
      // For JSON tests, correct answer is embedded in the question itself
      const q = activeQuestions[idx];
      const correct = test?.answerKey?.[num] || q?.answer || '';
      if (!correct) return 'answered';
      return ans.trim().toUpperCase() === correct.trim().toUpperCase() ? 'correct' : 'wrong';
    }
    return 'answered';
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'answered': return { bg: '#6366f1', text: '#ffffff', border: '#4f46e5' };
      case 'correct':  return { bg: '#10b981', text: '#ffffff', border: '#059669' };
      case 'wrong':    return { bg: '#f43f5e', text: '#ffffff', border: '#e11d48' };
      default:         return { bg: '#f1f5f9', text: '#94a3b8', border: '#e2e8f0' };
    }
  };

  const optionColors = (isSelected: boolean, isCorrect: boolean, isWrong: boolean) => {
    if (!isReviewMode) {
      return isSelected
        ? { row: 'bg-indigo-600 border-indigo-600', badge: 'bg-white/20', label: 'text-white', badgeText: 'text-white' }
        : { row: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700', badge: 'bg-slate-100 dark:bg-slate-800', label: 'text-slate-700 dark:text-slate-200', badgeText: 'text-slate-500 dark:text-slate-400' };
    }
    if (isCorrect) return { row: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400', badge: 'bg-emerald-500', label: 'text-emerald-800 dark:text-emerald-300', badgeText: 'text-white' };
    if (isWrong)   return { row: 'bg-rose-50 dark:bg-rose-950/30 border-rose-400', badge: 'bg-rose-500', label: 'text-rose-800 dark:text-rose-300', badgeText: 'text-white' };
    return { row: 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-50', badge: 'bg-slate-100 dark:bg-slate-800', label: 'text-slate-500', badgeText: 'text-slate-400' };
  };

  return (
    <View>
      {/* ─── Progress Bar + Nav Button ─── */}
      <View className="px-1 mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">
            <Text className="text-indigo-600 dark:text-indigo-400 font-black">{answeredCount}</Text> / {totalQ} cevaplandı
          </Text>
          <TouchableOpacity
            onPress={() => setNavOpen(true)}
            className="flex-row items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 px-3 py-1.5 rounded-full"
          >
            <Grid3x3 size={13} color="#6366f1" />
            <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-bold">Sorulara Git</Text>
          </TouchableOpacity>
        </View>

        {/* Progress track */}
        <View className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <View
            className="h-full bg-indigo-500 rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </View>
      </View>

      {/* ─── Question Card ─── */}
      <View className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 mb-4">

        {/* Header Strip */}
        <View className="flex-row items-center justify-between px-5 py-3 bg-indigo-600">
          <View className="flex-row items-center gap-2">
            <View className="w-7 h-7 bg-white/20 rounded-full items-center justify-center">
              <Text className="text-white font-black text-xs">{currentIndex + 1}</Text>
            </View>
            <Text className="text-indigo-100 text-xs font-bold uppercase tracking-wider">
              Soru {currentIndex + 1} / {totalQ}
            </Text>
          </View>
          {test?.sourceType && (
            <View className="bg-white/15 px-2.5 py-1 rounded-full">
              <Text className="text-white text-[10px] font-black uppercase tracking-wider">
                {test.sourceType}
              </Text>
            </View>
          )}
        </View>

        <View className="p-5">
          {/* Question Image */}
          {'imageUrl' in currentQ && currentQ.imageUrl ? (
            <View className="w-full h-52 bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 mb-4 items-center justify-center">
              <Image source={{ uri: currentQ.imageUrl }} className="w-full h-full" resizeMode="contain" />
            </View>
          ) : null}

          {/* Question Text */}
          {'text' in currentQ ? (
            <View className="mb-5 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Text className="text-slate-800 dark:text-slate-100 font-semibold text-[15px] leading-relaxed">
                {currentQ.text}
              </Text>
            </View>
          ) : (
            <View className="mb-5 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 items-center">
              <HelpCircle size={32} color="#94a3b8" />
              <Text className="text-slate-400 text-xs mt-2 text-center font-medium">
                Soru görselini inceleyin ve cevabınızı işaretleyin.
              </Text>
            </View>
          )}

          {/* Options / Text Input */}
          {isOpenEnded ? (
            <View className="gap-4">
              <View className="p-4 bg-indigo-50/30 dark:bg-indigo-950/20 border-2 border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
                <Text className="text-[10px] font-black uppercase text-indigo-400 tracking-widest pl-1 mb-2">Cevabınız</Text>
                <TextInput
                  value={studentTextAnswers[qNumStr] || ''}
                  onChangeText={(text) => handleTextAnswer?.(qNumStr, text)}
                  placeholder="Cevabınızı buraya yazınız..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  className="text-slate-800 dark:text-slate-100 text-sm font-semibold leading-relaxed p-0 min-h-[100px]"
                  style={{ textAlignVertical: 'top' }}
                  editable={!isReviewMode}
                />
              </View>

              {isReviewMode && (
                <View className="gap-3 border-t border-slate-150 dark:border-slate-800 pt-4">
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Değerlendirme Sonucu</Text>
                  
                  {/* Evaluation Status Badge */}
                  {(() => {
                    const status = test?.studentTextAnswersEvaluation?.[qNumStr];
                    if (status === 'correct') {
                      return (
                        <View className="flex-row items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-250 rounded-2xl p-3.5">
                          <CheckCircle2 size={18} color="#10b981" />
                          <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">Doğru Kabul Edildi</Text>
                        </View>
                      );
                    }
                    if (status === 'incorrect') {
                      return (
                        <View className="flex-row items-center gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-250 rounded-2xl p-3.5">
                          <XCircle size={18} color="#ef4444" />
                          <Text className="text-rose-700 dark:text-rose-400 font-bold text-sm">Yanlış Kabul Edildi</Text>
                        </View>
                      );
                    }
                    if (status === 'empty') {
                      return (
                        <View className="flex-row items-center gap-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 rounded-2xl p-3.5">
                          <AlertCircle size={18} color="#64748b" />
                          <Text className="text-slate-600 dark:text-slate-400 font-bold text-sm">Boş Kabul Edildi</Text>
                        </View>
                      );
                    }
                    return (
                      <View className="flex-row items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-250 rounded-2xl p-3.5">
                        <AlertCircle size={18} color="#d97706" />
                        <Text className="text-amber-700 dark:text-amber-400 font-bold text-sm">Puanlama Bekleniyor</Text>
                      </View>
                    );
                  })()}

                  {/* Feedback Message */}
                  {test?.studentTextAnswersFeedback?.[qNumStr] ? (
                    <View className="bg-slate-50 dark:bg-slate-850 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                      <Text className="text-[10px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Öğretmen Notu</Text>
                      <Text className="text-slate-650 dark:text-slate-300 text-xs font-semibold leading-relaxed">
                        {test.studentTextAnswersFeedback[qNumStr]}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          ) : ('options' in currentQ && Array.isArray(currentQ.options)) ? (
            // Rich options with text
            <View className="gap-2.5">
              {currentQ.options.map((opt: string, idx: number) => {
                const label = String.fromCharCode(65 + idx);
                const isSelected = studentAnswers[qNumStr] === label;
                const correctAns = (test?.answerKey?.[qNumStr] || currentQ?.correctAnswer || currentQ?.answer || '').trim().toUpperCase();
                const isCorrect = isReviewMode && label === correctAns;
                const isWrong   = isReviewMode && isSelected && label !== correctAns;
                const c = optionColors(isSelected, isCorrect, isWrong);

                return (
                  <TouchableOpacity
                    key={label}
                    disabled={isReviewMode}
                    onPress={() => handleAnswer(qNumStr, isSelected ? '' : label)}
                    activeOpacity={0.75}
                    className={`flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border-2 ${c.row}`}
                  >
                    <View className={`w-8 h-8 rounded-xl items-center justify-center flex-shrink-0 ${c.badge}`}>
                      <Text className={`font-black text-sm ${c.badgeText}`}>{label}</Text>
                    </View>
                    <Text className={`flex-1 font-semibold text-[13px] leading-snug ${c.label}`}>
                      {opt}
                    </Text>
                    {isCorrect && <CheckCircle2 size={18} color="#10b981" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            // Classic A-E bubble options
            <View className="flex-row justify-between gap-2 mt-2">
              {['A', 'B', 'C', 'D', 'E'].map(opt => {
                const isSelected = studentAnswers[qNumStr] === opt;
                const correctAns = (test?.answerKey?.[qNumStr] || currentQ?.correctAnswer || currentQ?.answer || '').trim().toUpperCase();
                const isCorrect  = isReviewMode && opt === correctAns;
                const isWrong    = isReviewMode && isSelected && opt !== correctAns;

                let bg = 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
                let txt = 'text-slate-600 dark:text-slate-400';
                if (!isReviewMode && isSelected) { bg = 'bg-indigo-600 border-indigo-600'; txt = 'text-white'; }
                if (isCorrect) { bg = 'bg-emerald-500 border-emerald-500'; txt = 'text-white'; }
                if (isWrong)   { bg = 'bg-rose-500 border-rose-500'; txt = 'text-white'; }
                if (isReviewMode && !isSelected && !isCorrect) bg += ' opacity-40';

                return (
                  <TouchableOpacity
                    key={opt}
                    disabled={isReviewMode}
                    onPress={() => handleAnswer(qNumStr, isSelected ? '' : opt)}
                    activeOpacity={0.75}
                    className={`flex-1 h-14 rounded-2xl border-2 items-center justify-center ${bg}`}
                  >
                    <Text className={`font-black text-lg ${txt}`}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Navigation Footer */}
        <View className="px-5 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex-row items-center justify-between">
          <TouchableOpacity
            disabled={currentIndex === 0}
            onPress={() => setCurrentIndex(currentIndex - 1)}
            className={`flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl border ${
              currentIndex === 0
                ? 'opacity-30 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 active:bg-slate-100'
            }`}
          >
            <ChevronLeft size={15} color="#64748b" />
            <Text className="text-slate-600 dark:text-slate-400 font-bold text-xs">Önceki</Text>
          </TouchableOpacity>

          {/* Middle dot indicators (max 7) */}
          <View className="flex-row items-center gap-1">
            {Array.from({ length: Math.min(totalQ, 7) }).map((_, i) => {
              const dotIdx = totalQ <= 7 ? i : Math.floor(i * (totalQ - 1) / 6);
              const isCurrent = dotIdx === currentIndex;
              const isAns = !!studentAnswers[(dotIdx + 1).toString()];
              return (
                <TouchableOpacity key={i} onPress={() => setCurrentIndex(dotIdx)}>
                  <View className={`rounded-full ${
                    isCurrent ? 'w-6 h-2 bg-indigo-500' :
                    isAns     ? 'w-2 h-2 bg-indigo-300 dark:bg-indigo-700' :
                                'w-2 h-2 bg-slate-200 dark:bg-slate-700'
                  }`} />
                </TouchableOpacity>
              );
            })}
          </View>

          {currentIndex < totalQ - 1 ? (
            <TouchableOpacity
              onPress={() => setCurrentIndex(currentIndex + 1)}
              className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 active:bg-indigo-700"
            >
              <Text className="text-white font-bold text-xs">Sonraki</Text>
              <ChevronRight size={15} color="white" />
            </TouchableOpacity>
          ) : !isReviewMode ? (
            <TouchableOpacity
              onPress={() => handleFinishTest(false)}
              className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 active:bg-emerald-700 shadow-sm"
            >
              <Text className="text-white font-bold text-xs">Bitir</Text>
              <CheckCircle2 size={15} color="white" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}
        </View>
      </View>

      {/* ─── Question Navigator Modal ─── */}
      <Modal visible={navOpen} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-5" style={{ maxHeight: '75%' }}>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-lg font-black text-slate-900 dark:text-white">Soru Gezgini</Text>
                <Text className="text-xs text-slate-400 mt-0.5">{answeredCount}/{totalQ} cevaplanmış</Text>
              </View>
              <TouchableOpacity
                onPress={() => setNavOpen(false)}
                className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Legend */}
            <View className="flex-row flex-wrap gap-x-4 gap-y-2 mb-4 px-1">
              {(isReviewMode ? [
                { label: 'Cevapsız', bg: '#f1f5f9', border: '#e2e8f0' },
                { label: 'Doğru', bg: '#10b981', border: '#059669' },
                { label: 'Yanlış', bg: '#f43f5e', border: '#e11d48' },
              ] : [
                { label: 'Cevapsız', bg: '#f1f5f9', border: '#e2e8f0' },
                { label: 'Cevaplı', bg: '#6366f1', border: '#4f46e5' },
              ]).map(({ label, bg, border }) => (
                <View key={label} className="flex-row items-center gap-1.5">
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: bg, borderWidth: 1.5, borderColor: border }} />
                  <Text className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{label}</Text>
                </View>
              ))}
            </View>

            {/* Grid */}
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap gap-2.5 pb-4">
                {activeQuestions.map((_: any, idx: number) => {
                  const status = getQStatus(idx);
                  const c = statusColor(status);
                  const isCurrent = idx === currentIndex;

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => { setCurrentIndex(idx); setNavOpen(false); }}
                      style={[
                        {
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: c.bg,
                          borderWidth: isCurrent ? 2.5 : 1.5,
                          borderColor: isCurrent ? '#818cf8' : c.border,
                        },
                      ]}
                    >
                      <Text style={{ color: c.text, fontWeight: '900', fontSize: 13 }}>{idx + 1}</Text>
                      {isReviewMode && status === 'correct' && (
                        <View style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: 8, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' }}>
                          <Check size={9} color="white" strokeWidth={3} />
                        </View>
                      )}
                      {isReviewMode && status === 'wrong' && (
                        <View style={{ position: 'absolute', top: -5, right: -5, width: 16, height: 16, borderRadius: 8, backgroundColor: '#e11d48', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' }}>
                          <X size={9} color="white" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Go to first unanswered */}
            {!isReviewMode && answeredCount < totalQ && (
              <TouchableOpacity
                onPress={() => {
                  const firstEmpty = activeQuestions.findIndex((_: any, i: number) => !studentAnswers[(i+1).toString()]);
                  if (firstEmpty !== -1) { setCurrentIndex(firstEmpty); setNavOpen(false); }
                }}
                className="mt-3 bg-indigo-600 rounded-2xl py-3.5 items-center"
              >
                <Text className="text-white font-black text-sm">İlk Boş Soruya Git</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

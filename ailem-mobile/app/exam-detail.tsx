import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  Target, 
  FileText, 
  CalendarDays, 
  CheckCircle, 
  PenTool,
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Award, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  BookOpen,
  Image as ImageIcon,
  Save,
  MessageSquareText,
  HelpCircle,
  Check,
} from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { onTestsUpdate, onSinglePracticeExamUpdate, safeParseDate, updateTest, onTestQuestionsUpdate } from '../lib/dataService';
import { Test, PracticeExam } from '../lib/data';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';

const C = {
  BLUE:   '#3B82F6',
  GREEN:  '#10B981',
  ORANGE: '#F59E0B',
  RED:    '#EF4444',
  PURPLE: '#8B5CF6',
  TEAL:   '#14B8A6',
  INDIGO: '#6366F1',
  NAVY:   '#0F172A',
  CARD_DARK: '#1E293B',
};

export default function ExamDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [test, setTest] = useState<Test | null>(null);
  const [examDetails, setExamDetails] = useState<PracticeExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    
    const unsubscribe = onTestsUpdate((data) => {
      const found = data?.find(t => t.id === id);
      setTest(found || null);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (test?.sourceType === 'exam' && test.sourceId) {
      const unsubscribe = onSinglePracticeExamUpdate(test.sourceId, (data) => {
        setExamDetails(data);
        if (data && data.subjects.length > 0) {
          // Expand first subject by default
          setExpandedSubjects(new Set([data.subjects[0].id || 'subject-0']));
        }
      });
      return () => unsubscribe();
    }
  }, [test]);

  const toggleSubject = (subjId: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subjId)) next.delete(subjId); else next.add(subjId);
      return next;
    });
  };

  // Evaluation States
  const [evalIndex, setEvalIndex] = useState(0);
  const [evaluations, setEvaluations] = useState<Record<string, 'correct' | 'incorrect' | 'empty'>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [subQuestions, setSubQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onTestQuestionsUpdate(id as string, (qs: any[]) => {
      setSubQuestions(qs);
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (test) {
      setEvaluations((test as any).studentTextAnswersEvaluation || {});
      setFeedbacks((test as any).studentTextAnswersFeedback || {});
    }
  }, [test?.id]);

  const activeQuestions = useMemo(() => {
    if (subQuestions && subQuestions.length > 0) {
      return subQuestions;
    }
    return (test as any)?.questions || (test as any)?.jsonQuestions || [];
  }, [test, subQuestions]);

  const handleOpenPdf = async () => {
    if (!test?.fileUrl) return;
    try {
      await WebBrowser.openBrowserAsync(test.fileUrl);
    } catch (e) {
      console.error(e);
      Alert.alert("Hata", "PDF dosyası açılamadı.");
    }
  };

  const cleanHtml = (html: string) => {
    if (!html) return "";
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p\b[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  const handleEvaluate = (qNum: string, status: 'correct' | 'incorrect' | 'empty') => {
    setEvaluations(prev => ({
      ...prev,
      [qNum]: status
    }));
  };

  const handleFeedback = (qNum: string, text: string) => {
    setFeedbacks(prev => ({
      ...prev,
      [qNum]: text
    }));
  };

  const handleFinishEvaluation = async () => {
    if (!test) return;

    let correctCount = 0;
    let incorrectCount = 0;
    let emptyCount = 0;
    const totalQ = activeQuestions.length || test.questionCount || 0;

    for (let i = 1; i <= totalQ; i++) {
      const qNum = i.toString();
      const status = evaluations[qNum];
      if (status === 'correct') {
        correctCount++;
      } else if (status === 'incorrect') {
        incorrectCount++;
      } else {
        emptyCount++;
      }
    }

    const newScore = totalQ > 0 ? (correctCount / totalQ) * 100 : 0;

    try {
      setLoading(true);
      await updateTest(test.id, {
        status: 'Sonuçlandı',
        studentTextAnswersEvaluation: evaluations,
        studentTextAnswersFeedback: feedbacks,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        emptyAnswers: emptyCount,
        score: newScore,
        completedDate: new Date().toISOString()
      });
      Alert.alert('Başarılı', 'Değerlendirme kaydedildi ve sınav sonuçlandırıldı.');
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Değerlendirme kaydedilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  if (!test) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full mr-4">
             <ChevronLeft size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">Sınav Bulunamadı</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFinished = test.status === 'Sonuçlandı';
  const isPendingEvaluation = test.status === 'Değerlendirme Bekliyor';
  const correct = test.correctAnswers || 0;
  const incorrect = test.incorrectAnswers || 0;
  const empty = test.emptyAnswers || 0;
  const totalQuestions = test.questionCount || (correct + incorrect + empty);
  const net = correct - (incorrect / 3);
  const score = test.score || 0;
  const studentAnswers = test.studentAnswers || {};

  if (isPendingEvaluation) {
    const currentQ = activeQuestions[evalIndex];
    const qNumStr = (evalIndex + 1).toString();
    const currentEval = evaluations[qNumStr] || 'unevaluated';
    const currentFeedback = feedbacks[qNumStr] || '';
    const studentAnswer = test.studentTextAnswers?.[qNumStr] || 'Cevap yazılmamış.';

    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
        <Stack.Screen options={{ headerShown: false }} />
        
        {/* HEADER NAVBAR */}
        <View className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
             <ChevronLeft size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-lg font-black text-slate-900 dark:text-white">Puanlama: Soru {evalIndex + 1}/{activeQuestions.length}</Text>
          <View className="w-10 h-10" />
        </View>

        {/* Scrollable grid palette for questions */}
        <View className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 py-3 px-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {activeQuestions.map((_: any, idx: number) => {
              const num = (idx + 1).toString();
              const status = evaluations[num];
              const isActive = idx === evalIndex;
              
              let badgeColor = 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
              let textColor = 'text-slate-500';
              if (status === 'correct') { badgeColor = 'bg-emerald-500 border-emerald-600'; textColor = 'text-white'; }
              else if (status === 'incorrect') { badgeColor = 'bg-rose-500 border-rose-600'; textColor = 'text-white'; }
              else if (status === 'empty') { badgeColor = 'bg-slate-400 border-slate-500'; textColor = 'text-white'; }
              else if (isActive) { badgeColor = 'bg-indigo-600 border-indigo-700'; textColor = 'text-white'; }

              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setEvalIndex(idx)}
                  className={`w-9 h-9 rounded-xl border-2 items-center justify-center ${badgeColor} ${
                    isActive ? 'scale-105 border-indigo-400' : 'border-transparent'
                  }`}
                >
                  <Text className={`text-xs font-black ${textColor}`}>{idx + 1}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false} className="flex-1">
          {/* Question Image (if any) or text */}
          {currentQ?.imageUrl ? (
            <View className="w-full h-52 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-150 dark:border-slate-800 shadow-sm mb-4 justify-center items-center">
              <Image source={{ uri: currentQ.imageUrl }} className="w-full h-full" resizeMode="contain" />
            </View>
          ) : currentQ?.text ? (
            <View className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-sm mb-4">
              <Text className="text-slate-800 dark:text-slate-100 font-semibold text-sm leading-relaxed text-center">
                {currentQ.text}
              </Text>
            </View>
          ) : (
            <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-dashed border-slate-200 dark:border-slate-800 mb-4 items-center justify-center py-8">
              <HelpCircle size={28} color="#94a3b8" />
              <Text className="text-slate-400 text-xs mt-1.5 text-center">Görsel veya açıklama bulunmuyor.</Text>
            </View>
          )}

          {/* Student's Written Answer Card */}
          <View className="bg-indigo-50/50 dark:bg-indigo-950/20 border-2 border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-5 mb-4">
            <Text className="text-[10px] font-black uppercase text-indigo-400 tracking-widest pl-1 mb-2">Öğrenci Cevabı</Text>
            <Text className="text-slate-800 dark:text-slate-100 text-base font-bold leading-relaxed whitespace-pre-wrap">
              {studentAnswer}
            </Text>
          </View>

          {/* Evaluation Action Buttons */}
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-150 dark:border-slate-800 shadow-sm gap-3">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide pl-1">Değerlendir</Text>
            
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => handleEvaluate(qNumStr, 'correct')}
                className={`flex-1 h-14 rounded-2xl flex-row items-center justify-center gap-1.5 border-2 ${
                  currentEval === 'correct'
                    ? 'bg-emerald-500 border-emerald-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700'
                }`}
              >
                <CheckCircle2 size={16} color={currentEval === 'correct' ? '#fff' : '#10b981'} />
                <Text className={`font-bold text-sm ${currentEval === 'correct' ? 'text-white' : 'text-slate-750 dark:text-slate-300'}`}>Doğru</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleEvaluate(qNumStr, 'incorrect')}
                className={`flex-1 h-14 rounded-2xl flex-row items-center justify-center gap-1.5 border-2 ${
                  currentEval === 'incorrect'
                    ? 'bg-rose-500 border-rose-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700'
                }`}
              >
                <XCircle size={16} color={currentEval === 'incorrect' ? '#fff' : '#ef4444'} />
                <Text className={`font-bold text-sm ${currentEval === 'incorrect' ? 'text-white' : 'text-slate-750 dark:text-slate-300'}`}>Yanlış</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleEvaluate(qNumStr, 'empty')}
                className={`flex-1 h-14 rounded-2xl flex-row items-center justify-center gap-1.5 border-2 ${
                  currentEval === 'empty'
                    ? 'bg-slate-500 border-slate-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700'
                }`}
              >
                <AlertCircle size={16} color={currentEval === 'empty' ? '#fff' : '#64748b'} />
                <Text className={`font-bold text-sm ${currentEval === 'empty' ? 'text-white' : 'text-slate-750 dark:text-slate-300'}`}>Boş</Text>
              </TouchableOpacity>
            </View>

            {/* Feedback input area */}
            <View className="flex-row items-start gap-2 bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-slate-200/60 dark:border-slate-700 mt-1.5 min-h-[90px]">
              <MessageSquareText size={15} color="#94a3b8" style={{ marginTop: 2.5 }} />
              <TextInput
                value={currentFeedback}
                onChangeText={(text) => handleFeedback(qNumStr, text)}
                placeholder="Öğrenciye not veya geri bildirim bırak..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                className="flex-1 text-xs font-semibold text-slate-850 dark:text-white p-0"
                style={{ textAlignVertical: 'top' }}
              />
            </View>
          </View>
        </ScrollView>

        {/* Evaluation navigation Footer */}
        <View className="px-5 py-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex-row justify-between items-center">
          <TouchableOpacity
            disabled={evalIndex === 0}
            onPress={() => setEvalIndex(Math.max(0, evalIndex - 1))}
            className={`flex-row items-center gap-1 px-4 py-2.5 rounded-xl border ${
              evalIndex === 0
                ? 'opacity-30 bg-slate-50 border-slate-200'
                : 'bg-white border-slate-200'
            }`}
          >
            <ChevronLeft size={16} color="#64748b" />
            <Text className="text-slate-655 font-bold text-xs">Önceki</Text>
          </TouchableOpacity>

          {evalIndex < activeQuestions.length - 1 ? (
            <TouchableOpacity
              onPress={() => setEvalIndex(evalIndex + 1)}
              className="bg-indigo-600 px-6 py-2.5 rounded-xl flex-row items-center gap-1 active:bg-indigo-700"
            >
              <Text className="text-white font-bold text-xs">Sonraki Soru</Text>
              <ChevronRight size={16} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleFinishEvaluation}
              className="bg-emerald-600 px-6 py-2.5 rounded-xl flex-row items-center gap-1.5 active:bg-emerald-700"
            >
              <Save size={14} color="white" />
              <Text className="text-white font-bold text-xs">Puanlamayı Bitir</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* HEADER NAVBAR */}
      <View className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
           <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">Sınav Raporu</Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
         
         {/* EXAM TITLE CARD */}
         <View className="p-4">
           <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 items-center mb-2 mt-2">
              <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
                 <FileText size={40} color="#3b82f6" />
              </View>
              <Text className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">{test.title}</Text>
              <View className="bg-blue-100 dark:bg-blue-900/30 px-4 py-1.5 rounded-full mb-4">
                 <Text className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-xs">{test.subject || 'Genel'}</Text>
              </View>

              {!isFinished && (
                <TouchableOpacity 
                   onPress={() => router.push({ pathname: '/test-solver', params: { id: test.id, type: test.sourceType } })}
                   className="bg-blue-500 w-full flex-row items-center justify-center py-4 rounded-2xl active:scale-[0.98]"
                >
                   <PenTool size={20} color="white" className="mr-2" />
                   <Text className="text-white font-bold text-lg">Sınavı Çözmeye Başla</Text>
                </TouchableOpacity>
              )}
           </View>
         </View>

         {/* EXAM INFO METRICS */}
         <View className="px-4 mb-4">
           <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
              <Text className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Sınav Bilgileri</Text>
              
              <View className="flex-row items-center justify-between mb-4">
                 <View className="flex-row items-center">
                    <CalendarDays size={18} color="#94a3b8" className="mr-3" />
                    <Text className="text-slate-600 dark:text-slate-350 text-sm font-medium">Atanma Tarihi</Text>
                 </View>
                 <Text className="text-slate-800 dark:text-slate-100 text-sm font-bold">
                   {test.assignedDate ? format(safeParseDate(test.assignedDate), 'd MMMM yyyy', { locale: tr }) : '-'}
                 </Text>
              </View>

              <View className="flex-row items-center justify-between mb-4">
                 <View className="flex-row items-center">
                    <Target size={18} color="#94a3b8" className="mr-3" />
                    <Text className="text-slate-600 dark:text-slate-350 text-sm font-medium">Sınav Formatı</Text>
                 </View>
                 <Text className="text-slate-800 dark:text-slate-100 text-sm font-bold capitalize">
                   {test.sourceType || 'Belirtilmedi'}
                 </Text>
              </View>

              <View className="flex-row items-center justify-between">
                 <View className="flex-row items-center">
                    <CheckCircle size={18} color="#94a3b8" className="mr-3" />
                    <Text className="text-slate-600 dark:text-slate-350 text-sm font-medium">Durum</Text>
                 </View>
                 <Text className={`text-sm font-bold ${isFinished ? 'text-emerald-500' : 'text-amber-500'}`}>
                   {isFinished ? 'Tamamlandı' : 'Bekliyor'}
                 </Text>
              </View>
           </View>
         </View>

         {/* EXAM RESULT - ANALYZED RESULTS SCREEN (SAME AS WEB PROJECT) */}
         {isFinished && (
           <View className="px-4 space-y-5">
             
             {/* Bento Stats General Results Card */}
             <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
               <View className="flex-row items-center gap-2 mb-4">
                 <Award size={18} color="#10b981" />
                 <Text className="text-sm font-bold text-slate-800 dark:text-slate-100">Genel Sonuç</Text>
               </View>

               <View className="flex-row flex-wrap justify-between gap-y-3">
                 <View className="w-[31%] bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 items-center justify-center">
                   <Text className="text-xl font-black text-indigo-600 dark:text-indigo-400">%{score.toFixed(0)}</Text>
                   <Text className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1">Başarı</Text>
                 </View>
                 <View className="w-[31%] bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 items-center justify-center">
                   <Text className="text-xl font-black text-indigo-500">{net.toFixed(2)}</Text>
                   <Text className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1">Net</Text>
                 </View>
                 <View className="w-[31%] bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 items-center justify-center">
                   <Text className="text-xl font-black text-emerald-600 dark:text-emerald-450">{correct}</Text>
                   <Text className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1">Doğru</Text>
                 </View>
                 <View className="w-[31%] bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 items-center justify-center">
                   <Text className="text-xl font-black text-red-500">{incorrect}</Text>
                   <Text className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1">Yanlış</Text>
                 </View>
                 <View className="w-[31%] bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 items-center justify-center">
                   <Text className="text-xl font-black text-slate-450 dark:text-slate-400">{empty}</Text>
                   <Text className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1">Boş</Text>
                 </View>
                 <View className="w-[31%] bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 items-center justify-center">
                   <Text className="text-xl font-black text-slate-800 dark:text-white">{totalQuestions}</Text>
                   <Text className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1">Toplam Soru</Text>
                 </View>
               </View>
             </View>

             {/* Dynamic Question Results List */}
             <View className="space-y-4">
               <View className="flex-row items-center gap-2 pl-1 mb-1">
                 <BookOpen size={16} color="#4f46e5" />
                 <Text className="text-base font-bold text-slate-800 dark:text-slate-100">Soru Analiz Detayları</Text>
               </View>

               {/* A. JSON Test Cards */}
               {test.sourceType === 'json' && test.jsonQuestions && test.jsonQuestions.length > 0 ? (
                 test.jsonQuestions.map((q, idx) => {
                   const qNumStr = (idx + 1).toString();
                   const sAns = studentAnswers[qNumStr] || "";
                   const cAns = q.answer || "";
                   const isAnswered = !!sAns;
                   const isCorrect = isAnswered && sAns.trim().toUpperCase() === cAns.trim().toUpperCase();

                   return (
                     <View 
                       key={q.id || idx} 
                       className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-sm ${
                         isCorrect 
                           ? 'border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/5 dark:bg-emerald-950/5' 
                           : isAnswered 
                           ? 'border-rose-100 dark:border-rose-950/40 bg-rose-50/5 dark:bg-rose-950/5' 
                           : 'border-slate-200 dark:border-slate-800'
                       }`}
                     >
                       <View className="flex-row items-start gap-3 mb-4">
                         <View className={`w-6 h-6 rounded-full items-center justify-center border font-black text-xs ${
                           isCorrect 
                             ? 'bg-emerald-500 border-emerald-500 text-white' 
                             : isAnswered 
                             ? 'bg-rose-500 border-rose-500 text-white' 
                             : 'bg-slate-100 border-slate-200 dark:bg-slate-850 dark:border-slate-700 text-slate-500'
                         }`}>
                           <Text className="font-bold text-xs text-white">{idx + 1}</Text>
                         </View>
                         <Text className="flex-1 font-bold text-slate-850 dark:text-slate-100 leading-relaxed text-sm">
                           {q.text}
                         </Text>
                       </View>

                       {/* Options list */}
                       <View className="space-y-2 mb-3">
                         {q.options && q.options.map((opt, oIdx) => {
                           const letter = String.fromCharCode(65 + oIdx);
                           const isSelected = sAns === letter;
                           const isCorrectOpt = letter === cAns;

                           return (
                             <View 
                               key={letter}
                               className={`flex-row items-center gap-3 p-3 rounded-2xl border ${
                                 isCorrectOpt
                                   ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                                   : isSelected
                                   ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30'
                                   : 'bg-slate-50/40 border-slate-100 dark:bg-slate-950/20 dark:border-slate-850'
                               }`}
                             >
                               <View className={`w-6 h-6 rounded-lg items-center justify-center border font-black text-[10px] ${
                                 isCorrectOpt
                                   ? 'bg-emerald-500 border-emerald-500 text-white'
                                   : isSelected
                                   ? 'bg-rose-500 border-rose-500 text-white'
                                   : 'bg-slate-100 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-500'
                               }`}>
                                 <Text className={`font-bold text-[10px] ${isCorrectOpt || isSelected ? 'text-white' : 'text-slate-550'}`}>{letter}</Text>
                               </View>
                               <Text className={`flex-1 text-xs font-semibold ${
                                 isCorrectOpt 
                                   ? 'text-emerald-700 dark:text-emerald-450 font-bold' 
                                   : isSelected 
                                   ? 'text-rose-700 dark:text-rose-400 font-bold' 
                                   : 'text-slate-655 dark:text-slate-350'
                               }`}>
                                 {opt}
                               </Text>
                             </View>
                           );
                         })}
                       </View>

                       {/* Answer feedback status */}
                       <View className={`p-3 rounded-2xl flex-row items-center gap-2 ${
                         isCorrect 
                           ? 'bg-emerald-50 dark:bg-emerald-950/20' 
                           : isAnswered 
                           ? 'bg-rose-50 dark:bg-rose-950/20' 
                           : 'bg-slate-100 dark:bg-slate-950/30'
                       }`}>
                         {isCorrect ? (
                           <>
                             <CheckCircle2 size={16} color={C.GREEN} />
                             <Text className="text-emerald-700 dark:text-emerald-450 font-bold text-xs">Cevabınız Doğru: {sAns}</Text>
                           </>
                         ) : isAnswered ? (
                           <>
                             <XCircle size={16} color={C.RED} />
                             <Text className="text-rose-700 dark:text-rose-455 font-bold text-xs flex-1">
                               Cevabınız Yanlış: {sAns} (Doğru Cevap: {cAns})
                             </Text>
                           </>
                         ) : (
                           <>
                             <AlertCircle size={16} color="#94a3b8" />
                             <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs flex-1">
                               Cevapsız Bırakıldı (Doğru Cevap: {cAns})
                             </Text>
                           </>
                         )}
                       </View>
                     </View>
                   );
                 })
               ) : null}

               {/* B. Image-based Question Cards */}
               {(test.sourceType === 'quick' || test.sourceType === 'bank' || test.sourceType === 'mistake') && activeQuestions && activeQuestions.length > 0 ? (
                 activeQuestions.map((q: any, idx: number) => {
                   const qNumStr = q.questionNumber.toString();
                   const sAns = studentAnswers[qNumStr] || "";
                   const cAns = q.correctAnswer || q.answer || test.answerKey?.[qNumStr] || "";
                   const isAnswered = !!sAns;
                   const isCorrect = isAnswered && sAns.trim().toUpperCase() === cAns.trim().toUpperCase();

                   return (
                     <View 
                       key={q.questionId || idx} 
                       className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-sm ${
                         isCorrect 
                           ? 'border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/5 dark:bg-emerald-950/5' 
                           : isAnswered 
                           ? 'border-rose-100 dark:border-rose-950/40 bg-rose-50/5 dark:bg-rose-950/5' 
                           : 'border-slate-200 dark:border-slate-800'
                       }`}
                     >
                       <View className="flex-row justify-between items-center mb-3">
                         <View className="flex-row items-center gap-2">
                           <View className={`w-6 h-6 rounded-full items-center justify-center font-bold text-xs ${
                             isCorrect 
                               ? 'bg-emerald-500 text-white' 
                               : isAnswered 
                               ? 'bg-rose-500 text-white' 
                               : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                           }`}>
                             <Text className="font-bold text-xs text-white">{q.questionNumber}</Text>
                           </View>
                           <Text className="font-black text-slate-800 dark:text-white text-sm">Soru {q.questionNumber}</Text>
                         </View>
                         {isCorrect ? (
                           <View className="bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                             <Text className="text-[10px] font-black text-emerald-600 dark:text-emerald-450 uppercase">Doğru</Text>
                           </View>
                         ) : isAnswered ? (
                           <View className="bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/30">
                             <Text className="text-[10px] font-black text-rose-600 dark:text-rose-455 uppercase">Yanlış</Text>
                           </View>
                         ) : (
                           <View className="bg-slate-50 dark:bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                             <Text className="text-[10px] font-bold text-slate-400 uppercase">Boş</Text>
                           </View>
                         )}
                       </View>

                       {/* Question Image View */}
                       {q.imageUrl ? (
                         <View className="w-full h-48 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850 overflow-hidden justify-center items-center mb-4">
                           <Image source={{ uri: q.imageUrl }} className="w-full h-full" resizeMode="contain" />
                         </View>
                       ) : (
                         <View className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-6 items-center justify-center mb-4">
                           <ImageIcon size={24} color="#94a3b8" />
                           <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">Soru Görseli Bulunmuyor</Text>
                         </View>
                       )}

                       {/* Options bubble row */}
                       <View className="flex-row justify-between items-center bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-850">
                         {['A', 'B', 'C', 'D', 'E'].map(opt => {
                           const isSelected = sAns === opt;
                           const isCorrectOpt = opt === cAns;

                           return (
                             <View 
                               key={opt}
                               className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs ${
                                 isCorrectOpt
                                   ? 'bg-emerald-500 border-emerald-500'
                                   : isSelected
                                   ? 'bg-rose-500 border-rose-500'
                                   : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                               }`}
                             >
                               <Text className={`font-black text-xs ${
                                 isCorrectOpt || isSelected
                                   ? 'text-white'
                                   : 'text-slate-550 dark:text-slate-400'
                               }`}>
                                 {opt}
                               </Text>
                             </View>
                           );
                         })}
                       </View>

                       {/* Answer details footer */}
                       {!isCorrect && (
                         <View className="mt-3 flex-row items-center gap-1.5 px-1.5">
                           <AlertCircle size={12} color="#94a3b8" />
                           <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                             {isAnswered ? `Senin Seçtiğin: ${sAns} • ` : ''}Doğru Cevap: {cAns || 'Belirtilmedi'}
                           </Text>
                         </View>
                       )}
                     </View>
                   );
                 })
               ) : null}

               {/* C. Practice Exam Accordions */}
               {test.sourceType === 'exam' && examDetails ? (
                 examDetails.subjects.map((subject, sIdx) => {
                   const safeSubjectId = subject.id ? String(subject.id) : `subject-${sIdx}`;
                   const isExpanded = expandedSubjects.has(safeSubjectId);

                   // Question offset helper
                   let offset = 0;
                   for (let i = 0; i < sIdx; i++) {
                     offset += examDetails.subjects[i].questionCount;
                   }

                   // Calculate subject-level statistics
                   let subCorrect = 0;
                   let subIncorrect = 0;
                   let subEmpty = 0;

                   for (let q = 1; q <= subject.questionCount; q++) {
                     const numStr = (offset + q).toString();
                     const sAns = studentAnswers[numStr] || "";
                     const cAns = test.answerKey?.[numStr] || "";
                     if (!sAns) {
                       subEmpty++;
                     } else if (sAns === cAns) {
                       subCorrect++;
                     } else {
                       subIncorrect++;
                     }
                   }

                   return (
                     <View 
                       key={safeSubjectId}
                       className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm"
                     >
                       {/* Subject Accordion Trigger Header */}
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
                             <Text className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest mt-0.5">
                               {subject.questionCount} Soru • {subCorrect} D - {subIncorrect} Y - {subEmpty} B
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

                       {/* Expandable Bubble Panel */}
                       {isExpanded && (
                         <View className="p-4 border-t border-slate-100 dark:border-slate-850 space-y-3">
                           {Array.from({ length: subject.questionCount }).map((_, idx) => {
                             const qIndex = offset + idx + 1;
                             const qNum = qIndex.toString();
                             const sAns = studentAnswers[qNum] || "";
                             const cAns = test.answerKey?.[qNum] || "";
                             const isAnswered = !!sAns;
                             const isCorrect = isAnswered && sAns === cAns;
                             const isWrong = isAnswered && sAns !== cAns;

                             return (
                               <View 
                                 key={qNum} 
                                 className={`flex-row items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-850 pb-2 ${
                                   isCorrect 
                                     ? 'bg-emerald-50/20 dark:bg-emerald-950/5' 
                                     : isWrong 
                                     ? 'bg-rose-50/20 dark:bg-rose-950/5' 
                                     : ''
                                 }`}
                               >
                                 <View className="w-8">
                                   <Text className={`font-black text-xs ${
                                     isCorrect 
                                       ? 'text-emerald-600 dark:text-emerald-450' 
                                       : isWrong 
                                       ? 'text-rose-600 dark:text-rose-455' 
                                       : 'text-slate-400'
                                   }`}>{qIndex}.</Text>
                                 </View>
                                 
                                 <View className="flex-1 flex-row justify-end gap-1.5">
                                   {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                     const isSelected = sAns === opt;
                                     const isCorrectOpt = opt === cAns;
                                     const isWrongOpt = isSelected && opt !== cAns;

                                     return (
                                       <View
                                         key={opt}
                                         className={`w-8.5 h-8.5 rounded-full border flex items-center justify-center font-bold text-[10px] ${
                                           isCorrectOpt
                                             ? 'bg-emerald-500 border-emerald-500'
                                             : isWrongOpt
                                             ? 'bg-rose-500 border-rose-500'
                                             : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                         }`}
                                       >
                                         <Text className={`font-black ${
                                           isCorrectOpt || isWrongOpt 
                                             ? 'text-white' 
                                             : 'text-slate-600 dark:text-slate-350'
                                         }`}>
                                           {opt}
                                         </Text>
                                       </View>
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
                 })
               ) : null}

               {/* D. Other/Generic Tests Bubble Sheets */}
                {test.sourceType !== 'json' && test.sourceType !== 'quick' && test.sourceType !== 'bank' && test.sourceType !== 'mistake' && test.sourceType !== 'exam' ? (
                  <View className="space-y-4">
                    {/* HTML Doc Preview */}
                    {test.sourceType === 'html' && (test as any).htmlContent ? (
                      <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
                        <View className="flex-row items-center gap-2 mb-1">
                          <FileText size={18} color="#06b6d4" />
                          <Text className="font-bold text-slate-800 dark:text-slate-100 text-sm">Sınav Metni (HTML)</Text>
                        </View>
                        <ScrollView className="max-h-[300px] bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900">
                          <Text className="text-xs text-slate-650 dark:text-slate-350 font-semibold leading-relaxed">
                            {cleanHtml((test as any).htmlContent)}
                          </Text>
                        </ScrollView>
                      </View>
                    ) : null}

                    {/* PDF Doc Open Button */}
                    {test.sourceType === 'pdf' && (test as any).fileUrl ? (
                      <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex-row items-center justify-between">
                        <View className="flex-row items-center gap-3">
                          <View className="w-10 h-10 bg-red-50 dark:bg-red-950/40 rounded-full items-center justify-center">
                            <FileText size={20} color="#ef4444" />
                          </View>
                          <View>
                            <Text className="font-bold text-slate-850 dark:text-white text-sm">Sınav Dokümanı (PDF)</Text>
                            <Text className="text-[10px] font-bold text-slate-400 mt-0.5">İncelemek için dosyayı açın</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={handleOpenPdf}
                          className="bg-red-550 px-4 py-2.5 rounded-xl active:scale-[0.98]"
                        >
                          <Text className="text-white font-bold text-xs">PDF'i Aç</Text>
                               </TouchableOpacity>
                      </View>
                    ) : null}

                    <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3">
                   {Array.from({ length: test.questionCount || 10 }).map((_, i) => {
                     const startNum = test.startNumber || 1;
                     const qNum = (startNum + i).toString();
                     const sAns = studentAnswers[qNum] || "";
                     const cAns = test.answerKey?.[qNum] || "";
                     const isAnswered = !!sAns;
                     const isCorrect = isAnswered && sAns === cAns;
                     const isWrong = isAnswered && sAns !== cAns;

                     return (
                       <View 
                         key={qNum} 
                         className={`flex-row items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-850 pb-2 ${
                           isCorrect 
                             ? 'bg-emerald-50/20 dark:bg-emerald-950/5' 
                             : isWrong 
                             ? 'bg-rose-50/20 dark:bg-rose-950/5' 
                             : ''
                         }`}
                       >
                         <View className="w-8 flex-row items-center">
                           <Text className={`font-black text-xs ${
                             isCorrect 
                               ? 'text-emerald-600 dark:text-emerald-450' 
                               : isWrong 
                               ? 'text-rose-600 dark:text-rose-455' 
                               : 'text-slate-400'
                           }`}>{qNum}.</Text>
                         </View>
                         
                         <View className="flex-1 flex-row justify-end gap-2">
                           {['A', 'B', 'C', 'D', 'E'].map(opt => {
                             const isSelected = sAns === opt;
                             const isCorrectOpt = opt === cAns;
                             const isWrongOpt = isSelected && opt !== cAns;

                             return (
                               <View
                                 key={opt}
                                 className={`w-8.5 h-8.5 rounded-full border flex items-center justify-center font-bold text-[10px] ${
                                   isCorrectOpt
                                     ? 'bg-emerald-500 border-emerald-500'
                                     : isWrongOpt
                                     ? 'bg-rose-500 border-rose-500'
                                     : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                 }`}
                               >
                                 <Text className={`font-black ${
                                   isCorrectOpt || isWrongOpt 
                                     ? 'text-white' 
                                     : 'text-slate-600 dark:text-slate-350'
                                 }`}>
                                   {opt}
                                 </Text>
                               </View>
                             )
                           })}
                         </View>
                       </View>
                     );
                   })}
                 </View>
                 </View>
               ) : null}

             </View>
           </View>
         )}
         
         <View className="h-10"></View>
      </ScrollView>
    </SafeAreaView>
  );
}

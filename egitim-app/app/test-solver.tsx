import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image, 
  Alert, 
  StyleSheet, 
  Dimensions, 
  Linking,
  Modal,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  Play, 
  Pause, 
  ExternalLink, 
  BookOpen, 
  FileText, 
  CheckCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  Layers,
  Sparkles,
  HelpCircle,
  PenTool,
  Eraser,
  Trash2
} from 'lucide-react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { onTestsUpdate, onSinglePracticeExamUpdate, updateTest, safeParseDate, onTestQuestionsUpdate } from '../lib/dataService';
import { Test, PracticeExam, AnswerKey } from '../lib/data';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { WebView } from 'react-native-webview';
import { useColorScheme } from 'nativewind';

// IMPORT MODULAR SOLVERS
import { McqWizardSolver } from '../components/education/test-solver/mcq-wizard-solver';
import { PdfDocumentSolver } from '../components/education/test-solver/pdf-document-solver';
import { HtmlDocumentSolver } from '../components/education/test-solver/html-document-solver';
import { ExamOpticalSolver } from '../components/education/test-solver/exam-optical-solver';
import { ResultScreen } from '../components/education/test-solver/result-screen';

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

export default function TestSolverScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 992; // Desktop/Web side-by-side breakpoint

  const [test, setTest] = useState<Test | null>(null);
  const [examDetails, setExamDetails] = useState<PracticeExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Answers State
  const [studentAnswers, setStudentAnswers] = useState<AnswerKey>({});
  const [studentTextAnswers, setStudentTextAnswers] = useState<{ [key: string]: string }>({});

  // Wizard / Page index state for JSON / MCQ Questions
  const [currentIndex, setCurrentIndex] = useState(0);

  // Accordion state for Practice Exams (Optical Form)
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [subQuestions, setSubQuestions] = useState<any[]>([]);


  // Timer State
  const [timerSeconds, setTimerSeconds] = useState(40 * 60); // 40 mins default
  const [isPaused, setIsPaused] = useState(false);
  const timerInterval = useRef<any>(null);

  // Fetch Test Details
  useEffect(() => {
    if (!id) return;
    
    // Listen to test questions subcollection
    const unsubQuestions = onTestQuestionsUpdate(id as string, (qs) => {
      setSubQuestions(qs);
    });

    const unsubscribe = onTestsUpdate(async (data) => {
      const found = data?.find(t => t.id === id);
      if (found) {
        setTest(found);
        
        try {
          const draftAns = await AsyncStorage.getItem(`draft_answers_${found.id}`);
          const draftTextAns = await AsyncStorage.getItem(`draft_text_answers_${found.id}`);
          
          if (draftAns) {
            setStudentAnswers(JSON.parse(draftAns));
          } else if (found.studentAnswers) {
            setStudentAnswers(found.studentAnswers);
          }
          
          if (draftTextAns) {
            setStudentTextAnswers(JSON.parse(draftTextAns));
          } else if (found.studentTextAnswers) {
            setStudentTextAnswers(found.studentTextAnswers);
          }
        } catch (e) {
          if (found.studentAnswers) setStudentAnswers(found.studentAnswers);
          if (found.studentTextAnswers) setStudentTextAnswers(found.studentTextAnswers);
        }

        // Initialize timer
        if (found.durationMinutes) {
          setTimerSeconds(found.durationMinutes * 60);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubQuestions();
    };
  }, [id]);

  // Auto-save drafts when answers change
  useEffect(() => {
    if (test?.id && Object.keys(studentAnswers).length > 0) {
      AsyncStorage.setItem(`draft_answers_${test.id}`, JSON.stringify(studentAnswers)).catch(console.error);
    }
  }, [studentAnswers, test?.id]);

  useEffect(() => {
    if (test?.id && Object.keys(studentTextAnswers).length > 0) {
      AsyncStorage.setItem(`draft_text_answers_${test.id}`, JSON.stringify(studentTextAnswers)).catch(console.error);
    }
  }, [studentTextAnswers, test?.id]);

  // Fetch Practice Exam Template if it's an exam
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

  // Timer Countdown Logic
  useEffect(() => {
    if (loading || !test || test.status === 'Sonuçlandı') return;

    if (!isPaused && timerSeconds > 0) {
      timerInterval.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerInterval.current!);
            Alert.alert("Süre Doldu", "Sınav süreniz doldu. Cevaplarınız otomatik olarak kaydediliyor.", [
              { text: "Tamam", onPress: () => handleFinishTest(true) }
            ]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [loading, test, isPaused, timerSeconds]);

  // Format Seconds to MM:SS
  const formattedTime = useMemo(() => {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [timerSeconds]);

  // Answer handler
  const handleAnswer = (qNum: string, answer: string) => {
    if (!test || test.status === 'Sonuçlandı') return;
    setStudentAnswers(prev => {
      const next = { ...prev };
      if (answer === '') {
        delete next[qNum];
      } else {
        next[qNum] = answer;
      }
      return next;
    });
  };

  const handleTextAnswer = (qNum: string, answer: string) => {
    if (!test || test.status === 'Sonuçlandı') return;
    setStudentTextAnswers(prev => ({
      ...prev,
      [qNum]: answer
    }));
  };

  // Toggle Accordion Subject for Practice Exam
  const toggleSubject = (subjId: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subjId)) next.delete(subjId); else next.add(subjId);
      return next;
    });
  };

  // Submit / Finish Test
  const handleFinishTest = async (autoSubmit = false) => {
    if (!test) return;

    if (!autoSubmit) {
      const answeredCount = Object.keys(studentAnswers).length;
      const totalQ = test.questionCount || 0;
      const confirmMsg = answeredCount === totalQ 
        ? "Tüm soruları cevapladınız. Sınavı tamamlamak istiyor musunuz?"
        : `${totalQ} sorudan ${answeredCount} tanesini cevapladınız. Boş kalan sorularınız var. Sınavı bitirmek istiyor musunuz?`;

      if (Platform.OS === 'web') {
        if (window.confirm(confirmMsg)) {
          submitResults();
        }
        return;
      }

      Alert.alert(
        "Sınavı Bitir",
        confirmMsg,
        [
          { text: "Vazgeç", style: "cancel" },
          { text: "Evet, Bitir", onPress: submitResults }
        ]
      );
    } else {
      await submitResults();
    }
  };

  const submitResults = async () => {
    if (!test) return;
    setIsSubmitting(true);

    try {
      let correct = 0;
      let incorrect = 0;
      let empty = 0;
      const totalQ = test.questionCount || 0;

      // Build answerKey with robust fallbacks from subQuestions, test.questions, or jsonQuestions
      const effectiveAnswerKey: { [key: string]: string } = {};
      
      // 1. Start with test.answerKey if defined
      if (test.answerKey) {
        Object.keys(test.answerKey).forEach((k) => {
          if (test.answerKey?.[k]) {
            effectiveAnswerKey[k] = test.answerKey[k];
          }
        });
      }

      // 2. Fall back to subQuestions (assigned from question bank)
      if (subQuestions && subQuestions.length > 0) {
        subQuestions.forEach((q) => {
          const qNum = q.questionNumber.toString();
          const ans = q.correctAnswer || q.answer || q.correct_answer || '';
          if (!effectiveAnswerKey[qNum] && ans) {
            effectiveAnswerKey[qNum] = ans;
          }
        });
      }

      // 3. Fall back to test.questions (quick tests or other array-based questions)
      if (test.questions && test.questions.length > 0) {
        test.questions.forEach((q, idx) => {
          const qNum = (idx + 1).toString();
          const ans = (q as any).correctAnswer || (q as any).answer || (q as any).correct_answer || '';
          if (!effectiveAnswerKey[qNum] && ans) {
            effectiveAnswerKey[qNum] = ans;
          }
        });
      }

      // 4. Fall back to jsonQuestions (JSON-based tests)
      if (test.jsonQuestions && test.jsonQuestions.length > 0) {
        test.jsonQuestions.forEach((q, idx) => {
          const qNum = (idx + 1).toString();
          const ans = (q as any).answer || (q as any).correctAnswer || (q as any).correct_answer || '';
          if (!effectiveAnswerKey[qNum] && ans) {
            effectiveAnswerKey[qNum] = ans;
          }
        });
      }

      // Calculate correct / incorrect answers
      for (let i = 1; i <= totalQ; i++) {
        const qNum = i.toString();
        const sAns = studentAnswers[qNum] || "";
        const cAns = effectiveAnswerKey[qNum] || "";

        if (!sAns) {
          empty++;
        } else if (cAns) {
          if (sAns.trim().toUpperCase() === cAns.trim().toUpperCase()) {
            correct++;
          } else {
            incorrect++;
          }
        } else {
          // No answer key defined for this question → mark as empty (unevaluated)
          empty++;
        }
      }

      const isTestOpenEnded = test.openEnded || false;
      const finalStatus = isTestOpenEnded ? 'Değerlendirme Bekliyor' : 'Sonuçlandı';
      const score = totalQ > 0 ? (correct / totalQ) * 100 : 0;

      await updateTest(test.id, {
        status: finalStatus,
        studentAnswers,
        studentTextAnswers,
        correctAnswers: correct,
        incorrectAnswers: incorrect,
        emptyAnswers: empty,
        score,
        completedDate: new Date().toISOString(),
        timeSpentSeconds: (test.durationMinutes || 40) * 60 - timerSeconds
      });

      // Clear drafts on successful submission
      AsyncStorage.removeItem(`draft_answers_${test.id}`).catch(() => {});
      AsyncStorage.removeItem(`draft_text_answers_${test.id}`).catch(() => {});

      if (Platform.OS === 'web') {
        window.alert("Sınav sonucunuz başarıyla kaydedildi.");
        setTest(prev => prev ? { 
          ...prev, 
          status: finalStatus,
          score,
          correctAnswers: correct,
          incorrectAnswers: incorrect,
          emptyAnswers: empty,
          studentAnswers,
          studentTextAnswers,
          timeSpentSeconds: (test.durationMinutes || 40) * 60 - timerSeconds
        } : null);
        return;
      }

      Alert.alert("Tebrikler", "Sınav sonucunuz başarıyla kaydedildi.", [
        { text: "Sonuçları İncele", onPress: () => setTest(prev => prev ? { 
          ...prev, 
          status: finalStatus,
          score,
          correctAnswers: correct,
          incorrectAnswers: incorrect,
          emptyAnswers: empty,
          studentAnswers,
          studentTextAnswers,
          timeSpentSeconds: (test.durationMinutes || 40) * 60 - timerSeconds
        } : null) },
        { text: "Geri Dön", onPress: () => router.back() }
      ]);
    } catch (e) {
      console.error("Error submitting test: ", e);
      Alert.alert("Hata", "Sınav kaydedilirken bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open external PDF file
  const handleOpenPdf = async () => {
    if (!test?.fileUrl) return;
    try {
      await WebBrowser.openBrowserAsync(test.fileUrl);
    } catch (e) {
      Linking.openURL(test.fileUrl);
    }
  };

  // HTML tag cleaner
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

  // Determine available questions array based on test type
  const activeQuestions = useMemo(() => {
    if (subQuestions && subQuestions.length > 0) {
      return subQuestions;
    }
    if (test?.jsonQuestions && test.jsonQuestions.length > 0) {
      return test.jsonQuestions;
    }
    if (test?.questions && test.questions.length > 0) {
      return test.questions;
    }
    return [];
  }, [test, subQuestions]);

  // Dynamic progress calculator
  const progressPercent = useMemo(() => {
    if (!test?.questionCount) return 0;
    const answeredCount = Object.keys(studentAnswers).length;
    return Math.round((answeredCount / test.questionCount) * 100);
  }, [studentAnswers, test]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-slate-500 dark:text-slate-400 font-semibold mt-4">Sınav detayları hazırlanıyor...</Text>
      </SafeAreaView>
    );
  }

  if (!test) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <AlertTriangle size={48} color={C.RED} />
        <Text className="text-slate-800 dark:text-white font-bold text-lg mt-4">Sınav Bulunamadı</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-indigo-600 px-6 py-3 rounded-2xl">
          <Text className="text-white font-bold">Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (test.status === 'Değerlendirme Bekliyor') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 justify-center items-center p-6">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 items-center w-full max-w-sm">
          <View className="w-20 h-20 bg-amber-50 dark:bg-amber-900/30 rounded-full items-center justify-center mb-5 border-4 border-white dark:border-slate-800 shadow-sm">
            <Clock size={36} color="#d97706" />
          </View>
          <Text className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">Sınav Tamamlandı! 🎉</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-xs text-center mb-6 leading-relaxed">
            Açık uçlu sınavınız başarıyla kaydedildi. Velinizin değerlendirmesi ve puanlaması bekleniyor.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-indigo-600 w-full py-3.5 rounded-2xl items-center justify-center active:scale-[0.98]"
          >
            <Text className="text-white font-bold text-sm">Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isReviewMode = test.status === 'Sonuçlandı';

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <Stack.Screen options={{ headerShown: false }} />

        {/* HEADER NAVBAR */}
        <View className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row justify-between items-center z-10 shadow-sm">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full">
            <ChevronLeft size={24} color="#64748b" />
          </TouchableOpacity>
          
          <View className="items-center">
            <Text className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[150px]" numberOfLines={1}>
              {test.title}
            </Text>
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {test.subject}
            </Text>
          </View>

          {/* TIMER DISPLAY */}
          {!isReviewMode ? (
            <TouchableOpacity 
              onPress={() => setIsPaused(!isPaused)}
              className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                isPaused 
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30' 
                  : 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/30'
              }`}
            >
              <Clock size={13} color={isPaused ? C.ORANGE : C.INDIGO} />
              <Text className={`font-black text-sm ${isPaused ? 'text-amber-600' : 'text-indigo-600'}`}>
                {formattedTime}
              </Text>
              {isPaused ? (
                <Play size={11} color={C.ORANGE} fill={C.ORANGE} />
              ) : (
                <Pause size={11} color={C.INDIGO} fill={C.INDIGO} />
              )}
            </TouchableOpacity>
          ) : (
            <View className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-3.5 py-1.5 rounded-full">
              <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">ANALİZ MODU</Text>
            </View>
          )}
        </View>

        {/* TOP PROGRESS BANNER */}
        {!isReviewMode && (
          <View className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 px-4 py-2 flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Çözüm İlerlemesi</Text>
                <Text className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  {Object.keys(studentAnswers).length} / {test.questionCount} Soru
                </Text>
              </View>
              <View className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-full">
                <View className="h-full rounded-full bg-indigo-500" style={{ width: `${progressPercent}%` }} />
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => handleFinishTest(false)}
              disabled={isSubmitting}
              className="bg-indigo-600 disabled:bg-indigo-400 px-4 py-2 rounded-xl shadow-sm shadow-indigo-600/10"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-bold text-xs">Bitir</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* RENDER DYNAMIC SOLVER BASED ON SOURCE TYPE */}
        {/* OTHER SOLVERS IN SCROLLVIEW */}
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} scrollEnabled={test.sourceType !== 'pdf'}>
          
          {/* REVIEW/ANALYZED VIEW BANNER */}
            {isReviewMode && <ResultScreen test={test} />}

            <View className="p-4">
              {/* PAUSED BANNER */}
              {isPaused && !isReviewMode && (
                <View className="bg-amber-50/50 dark:bg-amber-950/10 border border-dashed border-amber-200 dark:border-amber-900/30 rounded-3xl p-6 items-center justify-center mb-6">
                  <Clock size={36} color={C.ORANGE} />
                  <Text className="text-amber-800 dark:text-amber-400 font-bold text-base mt-3">Sınav Duraklatıldı</Text>
                  <Text className="text-slate-500 text-xs text-center mt-1">Devam etmek için üstteki timer butonuna veya aşağıdaki butona tıklayın.</Text>
                  <TouchableOpacity onPress={() => setIsPaused(false)} className="mt-4 bg-amber-500 px-6 py-2.5 rounded-xl">
                    <Text className="text-white font-bold text-sm">Devam Et</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* SOLVER RENDER ENGINE */}
              {(!isPaused || isReviewMode) && (
                <View>
                  {/* 1. JSON / QUICK / MCQ WIZARD SOLVER */}
                  {(test.sourceType === 'json' || test.sourceType === 'quick' || test.sourceType === 'bank' || test.sourceType === 'mistake') && activeQuestions.length > 0 ? (
                    <McqWizardSolver 
                      test={test}
                      activeQuestions={activeQuestions}
                      currentIndex={currentIndex}
                      setCurrentIndex={setCurrentIndex}
                      studentAnswers={studentAnswers}
                      studentTextAnswers={studentTextAnswers}
                      handleAnswer={handleAnswer}
                      handleTextAnswer={handleTextAnswer}
                      isReviewMode={isReviewMode}
                      handleFinishTest={handleFinishTest}
                    />
                  ) : null}

                  {/* HTML DOCUMENT SOLVER */}
                  {test.sourceType === 'html' ? (
                    <HtmlDocumentSolver 
                      test={test}
                      studentAnswers={studentAnswers}
                      studentTextAnswers={studentTextAnswers}
                      handleAnswer={handleAnswer}
                      handleTextAnswer={handleTextAnswer}
                      isReviewMode={isReviewMode}
                      isDark={isDark}
                    />
                  ) : null}

                  {/* 2. PDF DOCUMENT SOLVER */}
                  {test.sourceType === 'pdf' ? (
                    <PdfDocumentSolver 
                      test={test}
                      studentAnswers={studentAnswers}
                      studentTextAnswers={studentTextAnswers}
                      handleAnswer={handleAnswer}
                      handleTextAnswer={handleTextAnswer}
                      isReviewMode={isReviewMode}
                      handleOpenPdf={handleOpenPdf}
                    />
                  ) : null}

                  {/* 4. PRACTICE EXAM (DENEME / ACCORDION OPTIK FORM) */}
                  {test.sourceType === 'exam' ? (
                    <ExamOpticalSolver 
                      test={test}
                      examDetails={examDetails}
                      studentAnswers={studentAnswers}
                      handleAnswer={handleAnswer}
                      isReviewMode={isReviewMode}
                      expandedSubjects={expandedSubjects}
                      toggleSubject={toggleSubject}
                    />
                  ) : null}

                  {/* 5. DEFAULT / TRACKED BOOK / MCQ OPTICAL SOLVER */}
                  {test.sourceType === 'trackedBook' || (!activeQuestions.length && test.sourceType !== 'pdf' && test.sourceType !== 'html' && test.sourceType !== 'exam') ? (
                    test.openEnded ? (
                      <View className="space-y-4 mt-2">
                        <View className="flex-row items-center gap-2 px-1">
                          <PenTool size={16} color={C.INDIGO} />
                          <Text className="font-bold text-slate-850 dark:text-slate-200">Açık Uçlu Cevap Alanı</Text>
                        </View>

                        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-4">
                          {Array.from({ length: test.questionCount || 10 }).map((_, i) => {
                            const startNum = test.startNumber || 1;
                            const qNum = (startNum + i).toString();
                            const tAns = studentTextAnswers[qNum] || "";

                            return (
                              <View key={qNum} className="mb-6">
                                <Text className="font-black text-sm text-slate-500 dark:text-slate-400 mb-2">Soru {qNum}</Text>
                                <View className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden min-h-[120px]">
                                  <TextInput
                                    value={tAns}
                                    onChangeText={(text) => handleTextAnswer(qNum, text)}
                                    placeholder="Cevabınızı buraya yazın..."
                                    placeholderTextColor="#94a3b8"
                                    multiline
                                    editable={!isReviewMode}
                                    className="flex-1 p-4 text-slate-800 dark:text-slate-200 text-base"
                                    textAlignVertical="top"
                                  />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ) : (
                      <View className="space-y-4 mt-2">
                        <View className="flex-row items-center gap-2 px-1">
                          <Layers size={16} color={C.INDIGO} />
                          <Text className="font-bold text-slate-850 dark:text-slate-200">Optik Cevap Kağıdı</Text>
                        </View>

                        <View className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-4">
                        {Array.from({ length: test.questionCount || 10 }).map((_, i) => {
                          const startNum = test.startNumber || 1;
                          const qNum = (startNum + i).toString();
                          const sAns = studentAnswers[qNum] || "";
                          const cAns = test.answerKey?.[qNum];

                          return (
                            <View key={qNum} className="flex-row items-center justify-between py-2 border-b border-slate-100 dark:border-slate-850 pb-2.5">
                              <View className="w-8 flex-row items-center">
                                <Text className="font-black text-sm text-slate-500 dark:text-slate-400">{qNum}.</Text>
                              </View>
                              
                              <View className="flex-1 flex-row justify-end gap-2">
                                {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                  const isSelected = sAns === opt;
                                  const isCorrectOpt = isReviewMode && opt === cAns;
                                  const isWrongOpt = isReviewMode && isSelected && opt !== cAns;

                                  return (
                                    <TouchableOpacity
                                      key={opt}
                                      disabled={isReviewMode}
                                      onPress={() => handleAnswer(qNum, isSelected ? '' : opt)}
                                      className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs transition-all ${
                                        !isReviewMode
                                          ? isSelected
                                            ? 'bg-indigo-500 border-indigo-500 text-white'
                                            : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-500'
                                          : isCorrectOpt
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : isWrongOpt
                                              ? 'bg-rose-500 border-rose-500 text-white'
                                              : 'bg-slate-50 border-slate-100 dark:bg-slate-850 dark:border-slate-800 text-slate-300 opacity-40'
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
                    </View>
                    )
                  ) : null}
                </View>
              )}
            </View>

          </ScrollView>
      </KeyboardAvoidingView>

      {/* FOOTER BITIR BUTTON (FOR PDF, HTML, EXAM, TRACKED BOOK SIZES) */}
      {!isReviewMode && test.sourceType !== 'json' && test.sourceType !== 'quick' && test.sourceType !== 'bank' && test.sourceType !== 'mistake' && (
        <View className="absolute bottom-0 inset-x-0 p-4 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 flex-row gap-4 items-center">
          <TouchableOpacity 
            onPress={() => handleFinishTest(false)}
            disabled={isSubmitting}
            className="flex-1 bg-indigo-600 disabled:bg-indigo-400 py-4 rounded-2xl items-center justify-center shadow-lg shadow-indigo-600/10 active:scale-95"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Sınavı Tamamla ve Bitir</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}


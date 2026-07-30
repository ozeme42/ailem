import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check, Clock } from 'lucide-react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TrackedBook, TrackedBookTest } from '../lib/data';
import { updateStudyAssignment } from '../lib/dataService';

export default function BookTestSolverScreen() {
  const router = useRouter();
  const { bookId, testId, assignmentId } = useLocalSearchParams();
  
  const [book, setBook] = useState<TrackedBook | null>(null);
  const [test, setTest] = useState<TrackedBookTest | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Solving State
  const [studentAnswers, setStudentAnswers] = useState<{ [key: string]: string }>({});
  const [studentTextAnswers, setStudentTextAnswers] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!bookId || !testId) {
          Alert.alert("Hata", "Eksik parametre.");
          router.back();
          return;
        }

        const bookDoc = await getDoc(doc(db, 'trackedBooks', bookId as string));
        if (bookDoc.exists()) {
          setBook({ id: bookDoc.id, ...bookDoc.data() } as TrackedBook);
        }

        const testDoc = await getDoc(doc(db, 'trackedBookTests', testId as string));
        if (testDoc.exists()) {
          const t = { id: testDoc.id, ...testDoc.data() } as TrackedBookTest;
          setTest(t);
        }
      } catch (e) {
        console.error(e);
        Alert.alert("Hata", "Veriler yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [bookId, testId]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOpticalAnswer = (qNum: string, answer: string) => {
    setStudentAnswers(prev => {
      const next = { ...prev };
      if (next[qNum] === answer) delete next[qNum];
      else next[qNum] = answer;
      return next;
    });
  };

  const handleTextAnswer = (qNum: string, text: string) => {
    setStudentTextAnswers(prev => ({ ...prev, [qNum]: text }));
  };

  const finishTest = async () => {
    if (!test || !book) return;

    Alert.alert(
      "Testi Bitir",
      "Cevaplarınızı kaydedip testi sonlandırmak istiyor musunuz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Bitir", 
          style: "default",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              // Optik okuma ise doğru/yanlış hesapla
              let correct = 0, incorrect = 0, empty = 0;
              const qCount = test.questionCount || 20;
              const isOpenEnded = test.openEnded === true || book.bookType === 'open_ended' || (!book.bookType && book.title?.toLowerCase().includes('açık uçlu'));

              if (!isOpenEnded) {
                for (let i = 1; i <= qCount; i++) {
                  const sAns = studentAnswers[i.toString()];
                  const cAns = test.answerKey?.[i.toString()];

                  if (!sAns) {
                    empty++;
                  } else if (cAns && sAns === cAns) {
                    correct++;
                  } else if (cAns && sAns !== cAns) {
                    incorrect++;
                  } else {
                    // Cevap anahtarı yoksa boş say
                    empty++;
                  }
                }
              }

              // Update the test
              const payload: any = {};
              
              if (isOpenEnded) {
                payload.studentTextAnswers = studentTextAnswers;
              } else {
                payload.studentAnswers = studentAnswers;
                if (test.answerKey && Object.keys(test.answerKey).length > 0) {
                  payload.correctAnswers = correct;
                  payload.incorrectAnswers = incorrect;
                  payload.emptyAnswers = empty;
                }
              }
              payload.status = 'Sonuçlandı';
              payload.durationMinutes = Math.round(elapsedTime / 60);

              await updateDoc(doc(db, 'trackedBookTests', test.id), payload);
              
              // Eğer bu bir ödevse, ödevi de tamamlandı olarak işaretle
              if (assignmentId && typeof assignmentId === 'string') {
                await updateStudyAssignment(assignmentId, { 
                  status: 'completed', 
                  completedAt: new Date().toISOString() 
                });
              }

              Alert.alert("Başarılı", "Test çözümünüz başarıyla kaydedildi.", [
                { text: "Tamam", onPress: () => router.back() }
              ]);

            } catch (e) {
              console.error(e);
              Alert.alert("Hata", "Kaydedilirken bir hata oluştu.");
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading || !test || !book) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  const isOpenEnded = test.openEnded === true || book.bookType === 'open_ended' || (!book.bookType && book.title?.toLowerCase().includes('açık uçlu'));
  const qCount = test.questionCount || 20;
  
  // Progress calc
  const answeredCount = isOpenEnded 
    ? Object.keys(studentTextAnswers).filter(k => studentTextAnswers[k].trim() !== '').length 
    : Object.keys(studentAnswers).length;
  const progressPercent = Math.round((answeredCount / qCount) * 100) || 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2">
          <ChevronLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <View className="flex-1 items-center px-4">
          <Text className="font-bold text-slate-800 dark:text-slate-100 text-base" numberOfLines={1}>{test.name}</Text>
          <Text className="text-xs text-slate-500 font-medium mt-0.5">{book.title}</Text>
        </View>
        <View className="flex-row items-center bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800">
          <Clock size={12} color="#4f46e5" className="mr-1.5" />
          <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-400">{formatTime(elapsedTime)}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-850 shadow-sm z-10">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-xs font-bold text-slate-500">İlerleme</Text>
          <Text className="text-xs font-black text-indigo-600 dark:text-indigo-400">{answeredCount} / {qCount}</Text>
        </View>
        <View className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <View className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPercent}%` }} />
        </View>
      </View>

      {/* Solving Area */}
      <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-850">
          <Text className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            {isOpenEnded ? "Açık Uçlu Cevap Alanı" : "Optik Cevap Formu"}
          </Text>

          {Array.from({ length: qCount }).map((_, i) => {
            const qNum = (i + 1).toString();

            if (isOpenEnded) {
              const tAns = studentTextAnswers[qNum] || "";
              return (
                <View key={qNum} className="mb-6">
                  <Text className="font-black text-sm text-slate-500 dark:text-slate-400 mb-2">Soru {qNum}</Text>
                  <TextInput
                    value={tAns}
                    onChangeText={(text) => handleTextAnswer(qNum, text)}
                    placeholder="Cevabınızı buraya yazın..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-800 dark:text-slate-200 min-h-[100px] text-base"
                    textAlignVertical="top"
                  />
                </View>
              );
            }

            // Optical Mode
            const sAns = studentAnswers[qNum] || "";
            return (
              <View key={qNum} className="flex-row items-center justify-between py-3 border-b border-slate-50 dark:border-slate-850 pb-3 mb-1">
                <View className="w-10">
                  <Text className="font-black text-base text-slate-500 dark:text-slate-400">{qNum}.</Text>
                </View>
                
                <View className="flex-1 flex-row justify-end gap-2">
                  {['A', 'B', 'C', 'D', 'E'].map(opt => {
                    const isSelected = sAns === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => handleOpticalAnswer(qNum, opt)}
                        activeOpacity={0.7}
                        className={`w-11 h-11 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-500 border-indigo-500 shadow-md shadow-indigo-500/30'
                            : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                        }`}
                      >
                        <Text className={`font-black text-sm ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Finish Button */}
      <View className="absolute bottom-6 left-6 right-6">
        <TouchableOpacity
          onPress={finishTest}
          disabled={isSubmitting}
          activeOpacity={0.8}
          className={`flex-row items-center justify-center p-4 rounded-2xl shadow-lg shadow-emerald-500/30 ${
            isSubmitting ? 'bg-emerald-400' : 'bg-emerald-500'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Check size={20} color="white" className="mr-2" />
              <Text className="text-white font-bold text-lg">Testi Bitir</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

import { View, Text, TouchableOpacity, ActivityIndicator, Image, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Dimensions, Animated, Easing, StyleSheet, ImageBackground, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Play, Pause, Square, Volume2, VolumeX, BookOpen, X, Sparkles, Clock, CheckCircle2, CloudRain, Music, Settings, Wind, MonitorSmartphone, Minimize2, Circle as CircleIcon, Hourglass as HourglassIcon, Maximize } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Mask, Circle, Path, Defs, ClipPath, G, Rect, LinearGradient as SvgLinearGradient, Stop, Ellipse, Polygon, Line } from 'react-native-svg';

import { useAuth } from '../context/auth-context';
import { onBooksUpdate, addReadingSession, updateUserBookStatus, getUserBookProgress } from '../lib/dataService';
import { Book } from '../lib/data';

const { width, height } = Dimensions.get('window');

export default function ReadingSessionPlayScreen() {
  const router = useRouter();
  const { familyId } = useAuth();
  const { bookId, memberId } = useLocalSearchParams();

  // Data State
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  // Timer State
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  // Yüzde yüz stabil SVG render için state
  const [animVal, setAnimVal] = useState(0);
  const startTimeRef = useRef(new Date().toISOString());

  // Audio State
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const [activeTab, setActiveTab] = useState<'timer'|'pomodoro'>('timer');
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [pagesReadInput, setPagesReadInput] = useState('');
  const [currentPageInput, setCurrentPageInput] = useState('');
  const [oldPagesState, setOldPagesState] = useState(0);

  // Settings
  const [pomodoroWorkTime, setPomodoroWorkTime] = useState(25);
  const [animationMode, setAnimationMode] = useState<'pulse' | 'rain' | 'snow' | 'cafe' | 'off'>('pulse');
  const [soundMode, setSoundMode] = useState<string>('odak');
const [timerMode, setTimerMode] = useState<'hourglass' | 'ring' | 'orb' | 'digital'>('hourglass');
  const [timerDirection, setTimerDirection] = useState<'up' | 'down'>('up');
  const [targetMinutes, setTargetMinutes] = useState<number>(30);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  
  // Circular & Hourglass Timer Animation (0 to 60)
  const circleAnim = useRef(new Animated.Value(0)).current;

  // Kum saati: artık dönmüyor, her dakika alttan doluyor.
  // animVal 0..60 → t = animVal/60 (0→1)
  // Üst hazne t=0'da dolu, t=1'de boş (yukarıdan daralır)
  // Alt hazne t=0'da boş, t=1'de dolu (tabandan yükselir)
  useEffect(() => {
    const id = circleAnim.addListener(({ value }) => {
      setAnimVal(value);
    });
    return () => circleAnim.removeListener(id);
  }, []);

  // Particles for weather animations
  const particles = useRef(Array.from({ length: 15 }).map(() => ({
    x: Math.random() * width,
    y: new Animated.Value(Math.random() * -height),
    speed: Math.random() * 2 + 2,
    size: Math.random() * 10 + 10,
    opacity: new Animated.Value(Math.random() * 0.5 + 0.3)
  }))).current;

  // Fetch book details
  useEffect(() => {
    if (!bookId) return;
    const unsubscribe = onBooksUpdate((allBooks) => {
      const found = allBooks.find(b => b.id === bookId);
      setBook(found || null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [bookId]);

  // Fetch old pages
  useEffect(() => {
    if (familyId && memberId && bookId && book?.pageCount) {
      getUserBookProgress(memberId as string, bookId as string).then(oldProgressPercent => {
        setOldPagesState(Math.round((oldProgressPercent / 100) * book.pageCount!));
      }).catch(() => {});
    }
  }, [familyId, memberId, bookId, book]);

  // Timer loop & Pulse Animation
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(prev => {
          const nextSeconds = prev + 1;
          // Check for countdown finish
          if (timerDirection === 'down' && nextSeconds >= targetMinutes * 60) {
            setIsActive(false);
            setIsFinishModalOpen(true);
          }
          return nextSeconds;
        });
      }, 1000);

      // Pulse Animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          })
        ])
      ).start();
      
      // Float Animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -10,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin)
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin)
          })
        ])
      ).start();

    } else {
      clearInterval(interval);
      pulseAnim.stopAnimation();
      floatAnim.stopAnimation();
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }).start();
    }
    
    // Particle loop
    let reqId: any;
    const loopParticles = () => {
      particles.forEach(p => {
        // Simple manual fall animation logic without heavy Animated.loop for each
        const curY = (p.y as any)._value;
        if (curY > height) {
          p.y.setValue(-50);
        } else {
          p.y.setValue(curY + p.speed);
        }
      });
      if (isActive && animationMode !== 'off' && animationMode !== 'pulse') {
        reqId = requestAnimationFrame(loopParticles);
      }
    };
    if (isActive && animationMode !== 'off' && animationMode !== 'pulse') {
      reqId = requestAnimationFrame(loopParticles);
    }

    return () => {
      clearInterval(interval);
      pulseAnim.stopAnimation();
      floatAnim.stopAnimation();
      if (reqId) cancelAnimationFrame(reqId);
    };
  }, [isActive, animationMode, timerDirection, targetMinutes]);

  // Handle Real-Time SVG Timer Animation (0-60 seconds logic for full progress)
  useEffect(() => {
    if (!isActive) {
      circleAnim.stopAnimation();
      return;
    }

    const maxSeconds = timerDirection === 'down' ? targetMinutes * 60 : 60;
    
    if (timerMode === 'hourglass') {
      // Her dakika yeni döngü: sıfırdan başlat
      const progressInCycle = seconds % 60;
      if (progressInCycle === 0 && seconds > 0) {
        circleAnim.setValue(0);
      }

      // Her saniye: mevcut dakika içindeki ilerleme (0..60)
      const nextVal = progressInCycle + 1;

      Animated.timing(circleAnim, {
        toValue: nextVal,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: false
      }).start();
    } else {
      const currentBase = timerDirection === 'down' ? seconds : (seconds % 60);
      
      if (timerDirection === 'up' && seconds > 0 && seconds % 60 === 0) {
        circleAnim.setValue(0);
      }
  
      const nextVal = ((currentBase + 1) / maxSeconds) * 60;
  
      Animated.timing(circleAnim, {
        toValue: nextVal,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: false
      }).start();
    }
  }, [seconds, isActive, timerDirection, targetMinutes, timerMode]);

  // Audio Sound player
  async function loadAndPlaySound() {
    setIsAudioLoading(true);
    setIsAudioPlaying(true);
    setIsAudioLoading(false);
  }

  async function toggleAudio() {
    if (isAudioPlaying) {
      setIsAudioPlaying(false);
    } else {
      setIsAudioPlaying(true);
    }
  }

  useEffect(() => {
    loadAndPlaySound();
  }, []);

  const handlePauseToggle = () => {
    setIsActive(!isActive);
  };

  const handleCancelSession = () => {
    Alert.alert(
      "Oturumu İptal Et",
      "Oturumu sonlandırmak ve kaydetmemek istediğinize emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "İptal Et", 
          style: "destructive",
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }
        }
      ]
    );
  };

  const handleFinishTimer = () => {
    setIsActive(false);
    setIsFinishModalOpen(true);
  };

  const handleSaveSession = async () => {
    const pages = Number(pagesReadInput);
    const targetPage = Number(currentPageInput);

    if (isNaN(pages) || pages < 0) {
      Alert.alert("Hata", "Lütfen geçerli bir okunan sayfa sayısı girin.");
      return;
    }

    if (!familyId || !memberId || !bookId || !book) return;

    try {
      const oldProgressPercent = await getUserBookProgress(memberId as string, bookId as string);
      const oldPages = Math.round((oldProgressPercent / 100) * book.pageCount);
      
      let newPagesRead = pages;
      if (targetPage > oldPages && newPagesRead === 0) {
          newPagesRead = targetPage - oldPages;
      }

      // Save Session
      await addReadingSession({
        memberId: memberId as string,
        bookId: bookId as string,
        startTime: startTimeRef.current,
        endTime: new Date().toISOString(),
        durationSeconds: seconds,
        pagesRead: newPagesRead,
      });

      const newProgressPercent = targetPage > 0 
        ? Math.min(100, Math.round((targetPage / book.pageCount) * 100))
        : Math.min(100, Math.round(((oldPages + newPagesRead) / book.pageCount) * 100));
        
      const finalStatus = (newProgressPercent >= 100 && !book.isForChildren) ? 'finished' : 'reading';

      await updateUserBookStatus(familyId, memberId as string, bookId as string, finalStatus, newProgressPercent);

      setIsFinishModalOpen(false);
      Alert.alert("Tebrikler! 🎉", `${newPagesRead} sayfa okuma oturumu başarıyla kaydedildi!`, [
        { text: "Tamam", onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          } 
        }
      ]);
    } catch (e) {
      Alert.alert("Hata", "Oturum kaydedilirken hata oluştu.");
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const displaySeconds = timerDirection === 'down' 
    ? Math.max(0, targetMinutes * 60 - seconds)
    : seconds;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090f' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#09090f', justifyContent: 'center', alignItems: 'center' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: 'white', fontWeight: 'bold', marginBottom: 16 }}>Kitap bulunamadı.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── IMMERSIVE BACKGROUND ── */}
      <View style={StyleSheet.absoluteFill}>
        <Image source={{ uri: book.image }} style={styles.bgImage} blurRadius={Platform.OS === 'ios' ? 40 : 25} />
        <LinearGradient
          colors={['rgba(9, 9, 15, 0.4)', 'rgba(9, 9, 15, 0.9)', '#09090f']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* ── PARTICLES (Rain/Snow/Cafe) ── */}
      {(animationMode === 'rain' || animationMode === 'snow' || animationMode === 'cafe') && isActive && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {particles.map((p, i) => (
            <Animated.Text
              key={i}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                fontSize: p.size,
                opacity: p.opacity,
              }}
            >
              {animationMode === 'rain' ? '💧' : animationMode === 'snow' ? '❄️' : '☕'}
            </Animated.Text>
          ))}
        </View>
      )}

      <SafeAreaView style={styles.safeArea}>
        
        {/* ── HEADER ── */}
        {!isFullScreen && (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancelSession} style={styles.iconBtn}>
              <ChevronLeft size={22} color="white" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <BookOpen size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.headerTitle}>Odaklanmış Okuma</Text>
              </View>
            </View>
            
            <TouchableOpacity onPress={() => setIsSettingsModalOpen(true)} style={styles.iconBtn}>
               <Settings size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── EXIT FULLSCREEN BUTTON ── */}
        {isFullScreen && (
          <TouchableOpacity 
            onPress={() => setIsFullScreen(false)} 
            style={[styles.iconBtn, { position: 'absolute', top: 20, right: 20, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.5)' }]}
          >
            <Minimize2 size={22} color="white" />
          </TouchableOpacity>
        )}

        {/* ── MAIN CONTENT ── */}
        <View style={[styles.mainContent, { justifyContent: timerMode === 'digital' ? 'center' : 'flex-start', paddingTop: timerMode === 'digital' || isFullScreen ? 0 : 20 }]}>
          
          {!isFullScreen && (
            timerMode === 'digital' ? (
              <>
                {/* Animated Book Cover (Large) */}
                <Animated.View style={[styles.bookContainer, { transform: [{ translateY: floatAnim }] }]}>
                  <View style={styles.bookGlow} />
                  <Image source={{ uri: book.image }} style={styles.bookCover} />
                </Animated.View>

                {/* Book Info */}
                <View style={styles.infoContainer}>
                  <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                  <Text style={styles.bookAuthor}>{book.author}</Text>
                </View>
              </>
            ) : (
              /* Small Book Info for Space-Saving Layout */
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginBottom: 20, width: '100%', gap: 16 }}>
                <Image source={{ uri: book.image }} style={{ width: 64, height: 96, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'white', fontSize: 20, fontWeight: '800', marginBottom: 4 }} numberOfLines={2}>{book.title}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' }}>{book.author}</Text>
                </View>
              </View>
            )
          )}

          {/* ── TIMER AREA ── */}
          <View style={[styles.timerWrapper, timerMode !== 'digital' && { flex: 1, justifyContent: 'center' }]}>
            {/* Animated Pulse Rings (Only for Digital Mode) */}
            {isActive && animationMode === 'pulse' && timerMode === 'digital' && (
              <>
                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.1], outputRange: [0.3, 0] }) }]} />
                <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({ inputRange: [1, 1.1], outputRange: [0.15, 0] }), padding: 80 }]} />
              </>
            )}
            
            {timerMode === 'hourglass' ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: isFullScreen ? 0 : 20, marginBottom: isFullScreen ? 0 : 20, transform: [{ scale: isFullScreen ? 1.3 : 1 }] }}>
                <View style={{ width: 160, height: 300 }}>
                  {/* WEB PROJESİNDEKİ KUM SAATİ BİREBİR AYNISI */}
                  {(() => {
                    const W = 160;
                    const H = 300;
                    const midX = W / 2;
                    const neckW = 8;
                    const rimH = 18;
                    const neckY = H / 2;

                    const cycleProgress = seconds % 60;
                    const topSandPct = 100 - (cycleProgress / 60) * 100;
                    const bottomSandPct = 100 - topSandPct;

                    const topInnerH = neckY - rimH;
                    const topSandH = (topSandPct / 100) * topInnerH;
                    const topSandFreeY = neckY - topSandH;
                    const topPolyY1 = topSandFreeY;
                    const topPolyY2 = neckY;

                    const topWidthAtY = (y: number) => {
                      const t = (y - rimH) / topInnerH;
                      return (W - 16) * (1 - t) + neckW * t;
                    };
                    const topFreeW = topWidthAtY(topSandFreeY);
                    const topPolyW1 = topWidthAtY(topPolyY1);
                    const topPolyW2 = topWidthAtY(topPolyY2);

                    const bottomInnerH = (H - rimH) - neckY;
                    const bottomSandH = (bottomSandPct / 100) * bottomInnerH;
                    const bottomSandFreeY = (H - rimH) - bottomSandH;
                    const bottomPolyY1 = bottomSandFreeY;
                    const bottomPolyY2 = H - rimH;

                    const bottomWidthAtY = (y: number) => {
                      const t = (y - neckY) / bottomInnerH;
                      return neckW * (1 - t) + (W - 16) * t;
                    };
                    const bottomFreeW = bottomWidthAtY(bottomSandFreeY);
                    const bottomPolyW1 = bottomWidthAtY(bottomPolyY1);
                    const bottomPolyW2 = bottomWidthAtY(bottomPolyY2);

                    const sandColor = "#6366f1";
                    const sandColor2 = "#06b6d4";

                    return (
                      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ filter: "drop-shadow(0 8px 32px rgba(99,102,241,0.25))" }}>
                        <Defs>
                          <SvgLinearGradient id="hg-sandGrad" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor={sandColor2} />
                            <Stop offset="100%" stopColor={sandColor} />
                          </SvgLinearGradient>
                          <SvgLinearGradient id="hg-glassBody" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0%" stopColor="white" stopOpacity="0.25" />
                            <Stop offset="40%" stopColor="white" stopOpacity="0.05" />
                            <Stop offset="100%" stopColor="white" stopOpacity="0.15" />
                          </SvgLinearGradient>
                          <SvgLinearGradient id="hg-rimGrad" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0%" stopColor="#e2e8f0" />
                            <Stop offset="50%" stopColor="#94a3b8" />
                            <Stop offset="100%" stopColor="#cbd5e1" />
                          </SvgLinearGradient>
                          <SvgLinearGradient id="hg-glassShine" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0%" stopColor="white" stopOpacity="0.6" />
                            <Stop offset="100%" stopColor="white" stopOpacity="0" />
                          </SvgLinearGradient>
                        </Defs>

                        {topSandPct > 0 && (
                          <Polygon
                            points={`${midX - topPolyW1 / 2},${topPolyY1} ${midX + topPolyW1 / 2},${topPolyY1} ${midX + topPolyW2 / 2},${topPolyY2} ${midX - topPolyW2 / 2},${topPolyY2}`}
                            fill="url(#hg-sandGrad)" opacity="0.92"
                          />
                        )}
                        {topSandPct > 1 && (
                          <Line x1={midX - topFreeW / 2 + 2} y1={topSandFreeY + 1} x2={midX + topFreeW / 2 - 2} y2={topSandFreeY + 1}
                            stroke="white" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
                        )}

                        {bottomSandPct > 0 && (
                          <Polygon
                            points={`${midX - bottomPolyW1 / 2},${bottomPolyY1} ${midX + bottomPolyW1 / 2},${bottomPolyY1} ${midX + bottomPolyW2 / 2},${bottomPolyY2} ${midX - bottomPolyW2 / 2},${bottomPolyY2}`}
                            fill="url(#hg-sandGrad)" opacity="0.92"
                          />
                        )}
                        {bottomSandPct > 1 && (
                          <Line x1={midX - bottomFreeW / 2 + 2} y1={bottomSandFreeY - 1} x2={midX + bottomFreeW / 2 - 2} y2={bottomSandFreeY - 1}
                            stroke="white" strokeWidth="2" strokeOpacity="0.35" strokeLinecap="round" />
                        )}

                        <Polygon points={`${8},${rimH} ${W - 8},${rimH} ${midX + neckW / 2},${neckY} ${midX - neckW / 2},${neckY}`}
                          fill="url(#hg-glassBody)" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
                        <Polygon points={`${midX - neckW / 2},${neckY} ${midX + neckW / 2},${neckY} ${W - 8},${H - rimH} ${8},${H - rimH}`}
                          fill="url(#hg-glassBody)" stroke="white" strokeWidth="1.5" strokeOpacity="0.4" />
                        <Polygon points={`${10},${rimH + 4} ${22},${rimH + 4} ${midX - neckW / 2 - 2},${neckY - 8} ${midX - neckW / 2 - 14},${neckY - 8}`}
                          fill="url(#hg-glassShine)" opacity="0.5" />

                        <Rect x={midX - neckW / 2} y={neckY - 2} width={neckW} height={4} fill={sandColor} rx="2" opacity="0.7" />

                        {isActive && topSandPct > 0 && (
                          <Rect x={midX - 1} y={neckY + 2} width={2} height={bottomSandFreeY > neckY + 14 ? bottomSandFreeY - neckY - 14 : 28}
                            fill={sandColor2} opacity={seconds % 2 === 0 ? "0.8" : "0.3"} rx="1" />
                        )}

                        <Rect x="2" y="2" width={W - 4} height={rimH - 2} rx="8" fill="url(#hg-rimGrad)" />
                        <Rect x="4" y="3" width={W - 8} height={6} rx="4" fill="white" fillOpacity="0.5" />
                        <Rect x="2" y={H - rimH} width={W - 4} height={rimH - 2} rx="8" fill="url(#hg-rimGrad)" />
                        <Rect x="4" y={H - 10} width={W - 8} height={6} rx="4" fill="white" fillOpacity="0.3" />
                      </Svg>
                    );
                  })()}
                </View>
                <BlurView intensity={20} tint="dark" style={[styles.timerContainer, { paddingHorizontal: 50, paddingVertical: 16, marginTop: 10, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[styles.timerText, { fontSize: 44, color: '#fbbf24' }]}>{formatTime(displaySeconds)}</Text>
                  <View style={[styles.statusBadge, { marginTop: 6, backgroundColor: 'transparent' }]}>
                    <View style={isActive ? styles.activeDot : styles.pausedDot} />
                    <Text style={isActive ? styles.statusTextActive : styles.statusTextPaused}>{isActive ? 'Okunuyor' : 'Duraklatıldı'}</Text>
                  </View>
                </BlurView>
              </View>
            ) : timerMode === 'ring' ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale: isFullScreen ? 1.3 : 1 }] }}>
                <Svg width="240" height="240" viewBox="0 0 240 240" style={{ position: 'absolute' }}>
                  <Circle cx="120" cy="120" r="105" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                  <AnimatedCircle 
                    cx="120" 
                    cy="120" 
                    r="105" 
                    stroke={isActive ? "#34d399" : "#f59e0b"} 
                    strokeWidth="6" 
                    fill="none" 
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 105}
                    strokeDashoffset={circleAnim.interpolate({
                      inputRange: [0, 60],
                      outputRange: timerDirection === 'down' ? [0, 2 * Math.PI * 105] : [2 * Math.PI * 105, 0],
                      extrapolate: 'clamp'
                    })}
                    transform="rotate(-90 120 120)"
                  />
                </Svg>
                <BlurView intensity={20} tint="dark" style={[styles.timerContainer, { width: 190, height: 190, borderRadius: 95, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center', borderWidth: 0 }]}>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.timerText, { fontSize: 40 }]}>{formatTime(displaySeconds)}</Text>
                  <View style={[styles.statusBadge, { paddingHorizontal: 12 }]}>
                    <View style={isActive ? styles.activeDot : styles.pausedDot} />
                    <Text style={isActive ? styles.statusTextActive : styles.statusTextPaused}>{isActive ? 'Okunuyor' : 'Duraklatıldı'}</Text>
                  </View>
                </BlurView>
              </View>
            ) : timerMode === 'orb' ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale: isFullScreen ? 1.3 : 1 }] }}>
                {(() => {
                  const fillPct = timerDirection === 'down' ? (targetMinutes * 60 - seconds) / (targetMinutes * 60) : (seconds % 60) / 60;
                  const validFillPct = isNaN(fillPct) ? 0 : Math.max(0, Math.min(1, fillPct));
                  const liqY = 240 - validFillPct * 240;
                  return (
                    <Svg width="240" height="240" viewBox="0 0 240 240" style={{ position: 'absolute' }}>
                      <Defs>
                        <ClipPath id="orb-clip">
                          <Circle cx="120" cy="120" r="110" />
                        </ClipPath>
                        <SvgLinearGradient id="orb-liq" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor="#34d399" />
                          <Stop offset="100%" stopColor="#10b981" />
                        </SvgLinearGradient>
                      </Defs>
                      <Circle cx="120" cy="120" r="110" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                      <Rect x="0" y={liqY} width="240" height="240" fill="url(#orb-liq)" clipPath="url(#orb-clip)" opacity="0.9" />
                      <Ellipse cx="70" cy="60" rx="15" ry="30" fill="white" opacity="0.15" transform="rotate(-30 70 60)" />
                    </Svg>
                  );
                })()}
                <BlurView intensity={20} tint="dark" style={[styles.timerContainer, { width: 190, height: 190, borderRadius: 95, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center', borderWidth: 0, backgroundColor: 'transparent' }]}>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.timerText, { fontSize: 40, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width:0, height:2}, textShadowRadius: 4 }]}>{formatTime(displaySeconds)}</Text>
                  <View style={[styles.statusBadge, { paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                    <View style={isActive ? styles.activeDot : styles.pausedDot} />
                    <Text style={isActive ? styles.statusTextActive : styles.statusTextPaused}>{isActive ? 'Okunuyor' : 'Duraklatıldı'}</Text>
                  </View>
                </BlurView>
              </View>
            ) : (
              <BlurView intensity={20} tint="dark" style={[styles.timerContainer, { transform: [{ scale: isFullScreen ? 1.5 : 1 }] }]}>
                
                <Text style={styles.timerText}>{formatTime(displaySeconds)}</Text>
                
                <View style={styles.statusBadge}>
                  {isActive ? (
                    <>
                      <View style={styles.activeDot} />
                      <Text style={styles.statusTextActive}>Okunuyor</Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.pausedDot} />
                      <Text style={styles.statusTextPaused}>Duraklatıldı</Text>
                    </>
                  )}
                </View>
              </BlurView>
            )}
          </View>
          
        </View>

        {/* ── CONTROLS ── */}
        {!isFullScreen && (
          <View style={styles.controlsContainer}>
            {/* Audio Toggle */}
            <TouchableOpacity 
              onPress={toggleAudio}
              style={styles.sideControlBtn}
            >
              {isAudioLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : isAudioPlaying ? (
                <Volume2 size={24} color="white" />
              ) : (
                <VolumeX size={24} color="rgba(255,255,255,0.5)" />
              )}
            </TouchableOpacity>

            {/* Play/Pause Main */}
            <TouchableOpacity 
              onPress={handlePauseToggle}
              activeOpacity={0.8}
              style={styles.playPauseBtn}
            >
              <BlurView intensity={30} tint="light" style={styles.playPauseBlur}>
                {isActive ? (
                  <Pause size={32} color="white" fill="white" />
                ) : (
                  <Play size={32} color="white" fill="white" style={{ marginLeft: 4 }} />
                )}
              </BlurView>
            </TouchableOpacity>

            {/* Finish Main */}
            <TouchableOpacity 
              onPress={handleFinishTimer}
              activeOpacity={0.8}
              style={styles.finishBtnWrapper}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.finishBtn}
              >
                <Square size={22} color="white" fill="white" />
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Fullscreen Toggle */}
            <TouchableOpacity 
              onPress={() => setIsFullScreen(true)}
              style={styles.sideControlBtn}
            >
              <Maximize size={24} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* ── SETTINGS MODAL ── */}
      <Modal visible={isSettingsModalOpen} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setIsSettingsModalOpen(false)} />
          
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ayarlar & Odak</Text>
              <TouchableOpacity onPress={() => setIsSettingsModalOpen(false)} style={styles.modalCloseBtn}>
                <X size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
              
              {/* Timer Direction Settings */}
              <View style={styles.settingGroup}>
                <Text style={styles.inputLabel}>SAYAÇ TÜRÜ</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 24 }}>
                  {[
                    { id: 'up', label: 'İleri Sayım', icon: Clock },
                    { id: 'down', label: 'Geri Sayım', icon: HourglassIcon }
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = timerDirection === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.modeCard, isSelected && styles.modeCardActive, { flex: 1 }]}
                        onPress={() => setTimerDirection(item.id as any)}
                      >
                        <View style={[styles.modeIconWrapper, isSelected && styles.modeIconWrapperActive]}>
                          <Icon size={20} color={isSelected ? '#34d399' : 'rgba(255,255,255,0.7)'} />
                        </View>
                        <Text style={[styles.modeLabel, isSelected && styles.modeLabelActive]}>{item.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {timerDirection === 'down' && (
                <View style={styles.settingGroup}>
                  <Text style={styles.inputLabel}>SÜRE HEDEFİ</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 8, marginBottom: 24 }}>
                    {[15, 30, 45, 60, 90, 120].map(mins => {
                      const isSelected = targetMinutes === mins;
                      return (
                        <TouchableOpacity
                          key={mins}
                          style={[{
                            paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16,
                            backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
                          }, isSelected && { backgroundColor: 'rgba(52, 211, 153, 0.1)', borderColor: '#34d399' }]}
                          onPress={() => setTargetMinutes(mins)}
                        >
                          <Text style={[{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600' }, isSelected && { color: '#34d399', fontWeight: '800' }]}>
                            {mins} dk
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Timer Mode Settings */}
              <View style={styles.settingGroup}>
                <Text style={styles.inputLabel}>SAYAÇ GÖRÜNÜMÜ</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24, marginTop: 8 }}>
                  {[
                    { id: 'hourglass', label: 'Kum Saati', icon: HourglassIcon },
                    { id: 'ring', label: 'Halka', icon: CircleIcon },
                    { id: 'orb', label: 'Küre', icon: CircleIcon },
                    { id: 'digital', label: 'Dijital', icon: MonitorSmartphone }
                  ].map(item => {
                    const Icon = item.icon;
                  const active = timerMode === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setTimerMode(item.id as any)}
                      style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: active ? '#6366f1' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: active ? '#818cf8' : 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    >
                      <Icon size={16} color={active ? "white" : "rgba(255,255,255,0.5)"} />
                      <Text style={{ color: active ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: '700' }}>{item.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Animasyon Seçimi */}
              <Text style={styles.inputLabel}>ANİMASYON MODU</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24, marginTop: 8 }}>
                {[
                  { id: 'pulse', label: 'Nabız', icon: Sparkles },
                  { id: 'rain', label: 'Yağmur', icon: CloudRain },
                  { id: 'snow', label: 'Kar', icon: Wind },
                  { id: 'cafe', label: 'Kafe', icon: Music },
                  { id: 'off', label: 'Kapalı', icon: X }
                ].map(item => {
                  const Icon = item.icon;
                  const active = animationMode === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setAnimationMode(item.id as any)}
                      style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: active ? '#6366f1' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: active ? '#818cf8' : 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    >
                      <Icon size={16} color={active ? "white" : "rgba(255,255,255,0.5)"} />
                      <Text style={{ color: active ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: '700' }}>{item.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Ses Seçimi */}
              <Text style={styles.inputLabel}>ARKA PLAN SESİ (BETA)</Text>
              <View style={{ gap: 10, marginTop: 8 }}>
                {[
                  { id: 'odak', label: 'Derin Odaklanma (Varsayılan)' },
                  { id: 'rain', label: 'Sağanak Yağmur' },
                  { id: 'fire', label: 'Şömine Çıtırtısı' },
                  { id: 'cafe', label: 'Kalabalık Kafe' },
                  { id: 'off', label: 'Sessiz Mod' }
                ].map(item => {
                  const active = soundMode === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        setSoundMode(item.id);
                        if (item.id === 'off') setIsAudioPlaying(false);
                        else setIsAudioPlaying(true);
                      }}
                      style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: active ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: active ? '#6366f1' : 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Text style={{ color: active ? 'white' : 'rgba(255,255,255,0.7)', fontWeight: '700' }}>{item.label}</Text>
                      {active && <Volume2 size={16} color="#818cf8" />}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── FINISH MODAL ── */}
      <Modal visible={isFinishModalOpen} transparent={true} animationType="fade">
        <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setIsFinishModalOpen(false)} />
          
          <KeyboardAvoidingView behavior="padding" style={{ width: '100%' }}>
            <View style={[styles.modalContent, { alignSelf: 'center', width: '90%', borderRadius: 32 }]}>
              <View style={styles.modalHandle} />
              
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Oturum Tamamlandı 🎉</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Clock size={12} color="#a5b4fc" />
                    <Text style={styles.modalSubtitle}>Süre: <Text style={{ color: 'white', fontWeight: 'bold' }}>{formatTime(seconds)}</Text></Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setIsFinishModalOpen(false)} style={styles.modalCloseBtn}>
                  <X size={20} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Bugün Kaç Sayfa Okudunuz?</Text>
                  <TextInput 
                    placeholder="Örn: 15"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="number-pad"
                    value={pagesReadInput}
                    onChangeText={setPagesReadInput}
                    style={styles.input}
                    autoFocus
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Şu An Kaçıncı Sayfadasınız? (İsteğe Bağlı)</Text>
                  <TextInput 
                    placeholder={`Şu an: ${oldPagesState}. Sayfa`}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="number-pad"
                    value={currentPageInput}
                    onChangeText={setCurrentPageInput}
                    style={styles.input}
                  />
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleSaveSession}
                activeOpacity={0.8}
                style={styles.saveBtnWrapper}
              >
                <LinearGradient
                  colors={['#4f46e5', '#6366f1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveBtn}
                >
                  <CheckCircle2 size={20} color="white" />
                  <Text style={styles.saveBtnText}>Kaydet ve Bitir</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </View>
  );
}

// SVG için Web uyumlu Wrapper (collapsable uyarısını çözer)
const CircleWrapper = React.forwardRef((props: any, ref: any) => {
  const { collapsable, ...rest } = props;
  return <Circle ref={ref} {...rest} />;
});
const AnimatedCircle = Animated.createAnimatedComponent(CircleWrapper);

const PathWrapper = React.forwardRef((props: any, ref: any) => {
  const { collapsable, ...rest } = props;
  return <Path ref={ref} {...rest} />;
});
const AnimatedPath = Animated.createAnimatedComponent(PathWrapper);

const RectWrapper = React.forwardRef((props: any, ref: any) => {
  const { collapsable, ...rest } = props;
  return <Rect ref={ref} {...rest} />;
});
const AnimatedRect = Animated.createAnimatedComponent(RectWrapper);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090f',
  },
  bgImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitleContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bookContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  bookGlow: {
    position: 'absolute',
    width: 200,
    height: 300,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    filter: 'blur(30px)' as any,
  },
  bookCover: {
    width: 180,
    height: 270,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  bookTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  bookAuthor: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
  },
  timerWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    width: 260,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,1)',
  },
  timerContainer: {
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 30,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timerText: {
    color: 'white',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
  },
  pausedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
  statusTextActive: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusTextPaused: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  sideControlBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playPauseBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  playPauseBlur: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  finishBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    gap: 16,
    marginBottom: 24,
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  input: {
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 20,
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  saveBtnWrapper: {
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: Platform.OS === 'ios' ? 10 : 0,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 60,
    borderRadius: 20,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
});
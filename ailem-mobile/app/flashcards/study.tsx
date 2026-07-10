import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Animated, PanResponder, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { onFlashcardsUpdate, updateFlashcard } from '../../lib/dataService';
import { Flashcard } from '../../lib/data';
import { ChevronLeft, RotateCcw, Check, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;

export default function StudyScreen() {
    const router = useRouter();
    const { deckId } = useLocalSearchParams<{ deckId: string }>();
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);

    const position = useRef(new Animated.ValueXY()).current;
    const flipAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!deckId) return;
        const unsub = onFlashcardsUpdate(deckId, (data) => {
            // Sort to prioritize cards that need review (lower level or older nextReviewAt)
            // For now, just shuffle or level sort
            const sorted = data.sort((a,b) => a.level - b.level);
            setCards(sorted);
            setLoading(false);
        });
        return () => unsub();
    }, [deckId]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (event, gesture) => {
                position.setValue({ x: gesture.dx, y: gesture.dy });
            },
            onPanResponderRelease: (event, gesture) => {
                if (gesture.dx > SWIPE_THRESHOLD) {
                    forceSwipe('right');
                } else if (gesture.dx < -SWIPE_THRESHOLD) {
                    forceSwipe('left');
                } else {
                    resetPosition();
                }
            }
        })
    ).current;

    const forceSwipe = (direction: 'right' | 'left') => {
        const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
        Animated.timing(position, {
            toValue: { x, y: 0 },
            duration: 250,
            useNativeDriver: false,
        }).start(() => onSwipeComplete(direction));
    };

    const resetPosition = () => {
        Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
        }).start();
    };

    const onSwipeComplete = async (direction: 'right' | 'left') => {
        const item = cards[currentIndex];
        
        // Update Firebase
        const newLevel = direction === 'right' ? Math.min((item.level || 0) + 1, 4) : 0;
        await updateFlashcard(item.id, { level: newLevel });

        position.setValue({ x: 0, y: 0 });
        flipAnim.setValue(0);
        setFlipped(false);
        setCurrentIndex(prev => prev + 1);
    };

    const flipCard = () => {
        Animated.timing(flipAnim, {
            toValue: flipped ? 0 : 180,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setFlipped(!flipped));
    };

    const getCardStyle = () => {
        const rotate = position.x.interpolate({
            inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
            outputRange: ['-120deg', '0deg', '120deg']
        });

        return {
            ...position.getLayout(),
            transform: [{ rotate }]
        };
    };

    const frontAnimatedStyle = {
        transform: [
            { rotateY: flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] }) }
        ]
    };
    const backAnimatedStyle = {
        transform: [
            { rotateY: flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] }) }
        ],
        opacity: flipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1] })
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#8b5cf6" />
            </SafeAreaView>
        );
    }

    if (currentIndex >= cards.length) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#020617', padding: 20 }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: 'white', marginBottom: 12 }}>Tebrikler! 🎉</Text>
                    <Text style={{ fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 32 }}>Bu destedeki tüm kartları çalıştınız.</Text>
                    <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 100 }}>
                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Destelere Dön</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#020617' }}>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
                        <ChevronLeft size={24} color="#cbd5e1" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#94a3b8' }}>
                        {currentIndex + 1} / {cards.length}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ position: 'absolute', top: 20, flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 40 }}>
                        <View style={{ alignItems: 'center', opacity: 0.5 }}>
                            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(239, 68, 68, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><X size={24} color="#ef4444" /></View>
                            <Text style={{ color: '#ef4444', fontWeight: '800' }}>Tekrar Et</Text>
                        </View>
                        <View style={{ alignItems: 'center', opacity: 0.5 }}>
                            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(16, 185, 129, 0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Check size={24} color="#10b981" /></View>
                            <Text style={{ color: '#10b981', fontWeight: '800' }}>Öğrendim</Text>
                        </View>
                    </View>

                    <Animated.View
                        {...panResponder.panHandlers}
                        style={[getCardStyle(), { width: SCREEN_WIDTH * 0.85, height: SCREEN_WIDTH * 1.1, zIndex: 10 }]}
                    >
                        <TouchableOpacity activeOpacity={1} onPress={flipCard} style={{ flex: 1 }}>
                            <View style={{ flex: 1 }}>
                                {/* Front */}
                                <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle, { backfaceVisibility: 'hidden', backgroundColor: '#1e293b', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 30 }]}>
                                    <Text style={{ fontSize: 28, fontWeight: '800', color: 'white', textAlign: 'center' }}>{cards[currentIndex].front}</Text>
                                    <View style={{ position: 'absolute', bottom: 32, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.5 }}>
                                        <RotateCcw size={16} color="white" />
                                        <Text style={{ color: 'white', fontSize: 12 }}>Çevirmek için dokun</Text>
                                    </View>
                                </Animated.View>
                                
                                {/* Back */}
                                <Animated.View style={[StyleSheet.absoluteFill, backAnimatedStyle, { backfaceVisibility: 'hidden', backgroundColor: '#4f46e5', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', padding: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30 }]}>
                                    <Text style={{ fontSize: 24, fontWeight: '700', color: 'white', textAlign: 'center' }}>{cards[currentIndex].back}</Text>
                                </Animated.View>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </SafeAreaView>
        </View>
    );
}


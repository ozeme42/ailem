import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, useWindowDimensions, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { onDecksUpdate, deleteDeck } from '../../lib/dataService';
import { Deck, Flashcard } from '../../lib/data';
import { ChevronLeft, Plus, BrainCircuit, Trash2, Edit2, PlayCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const gradients = [
    ['#3b82f6', '#0ea5e9'] as const,
    ['#8b5cf6', '#d946ef'] as const,
    ['#f59e0b', '#ef4444'] as const,
    ['#10b981', '#14b8a6'] as const,
] as const;

export default function MemorizationIndex() {
    const [decks, setDecks] = useState<Deck[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { width } = useWindowDimensions();
    
    useEffect(() => {
        const unsub = onDecksUpdate((data) => {
            setDecks(data.sort((a,b) => b.createdAt - a.createdAt));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const isDesktop = width >= 1024;
    const isTablet = width >= 768 && width < 1024;
    const colCount = isDesktop ? 4 : isTablet ? 3 : 2;
    const cardWidth = `${100 / colCount}%`;

    const handleDelete = (id: string) => {
        if (Platform.OS === 'web') {
            if(window.confirm('Bu desteyi silmek istediÄŸinize emin misiniz?')) {
                deleteDeck(id);
            }
            return;
        }
        Alert.alert('Emin misiniz?', 'Bu desteyi tamamen silmek istediÄŸinize emin misiniz?', [
            { text: 'Ä°ptal', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: () => deleteDeck(id) }
        ]);
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#8b5cf6" />
            </SafeAreaView>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#020617' }}>
            <Stack.Screen options={{ headerShown: false }} />
            
            {/* Ambient Backgrounds */}
            <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', zIndex: 0 }]} pointerEvents="none">
               <View style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, backgroundColor: 'rgba(139, 92, 246, 0.15)', borderRadius: 200, filter: 'blur(80px)' as any }} />
               <View style={{ position: 'absolute', bottom: -50, right: -100, width: 300, height: 300, backgroundColor: 'rgba(236, 72, 153, 0.15)', borderRadius: 150, filter: 'blur(80px)' as any }} />
            </View>

            <SafeAreaView style={{ flex: 1, zIndex: 1 }}>
                <View style={{ 
                    paddingHorizontal: isDesktop ? 32 : 16, 
                    paddingVertical: 16, 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    backgroundColor: 'rgba(2, 6, 23, 0.7)',
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.05)',
                    ...Platform.select({ web: { backdropFilter: 'blur(16px)' } as any, default: {} })
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
                            <ChevronLeft size={24} color="#cbd5e1" />
                        </TouchableOpacity>
                        <LinearGradient
                            colors={['#8b5cf6', '#d946ef']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <BrainCircuit size={20} color="#ffffff" />
                        </LinearGradient>
                        <View>
                            <Text style={{ fontSize: 20, fontWeight: '900', color: '#f1f5f9', letterSpacing: -0.5 }}>Ezberler</Text>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 }}>Zeka KartlarÄ± (Flashcards)</Text>
                        </View>
                    </View>

                    <TouchableOpacity 
                        onPress={() => router.push('/flashcards/new-deck')}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }}
                    >
                        <Plus size={16} color="white" style={{ marginRight: 6 }} />
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Yeni Deste</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: isDesktop ? 32 : 16 }} showsVerticalScrollIndicator={false}>
                    {decks.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 80, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed' }}>
                            <View style={{ width: 64, height: 64, backgroundColor: 'rgba(139, 92, 246, 0.2)', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <BrainCircuit size={32} color="#a78bfa" />
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#e2e8f0', marginBottom: 4 }}>Deste BulunamadÄ±</Text>
                            <Text style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>Ã–ÄŸrenmeye baÅŸlamak iÃ§in ilk destenizi oluÅŸturun.</Text>
                            <TouchableOpacity onPress={() => router.push('/flashcards/new-deck')}><Text style={{ color: '#c084fc', fontWeight: '600' }}>Hemen OluÅŸtur</Text></TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
                            {decks.map((deck, idx) => {
                                const colors = gradients[idx % gradients.length];
                                return (
                                    <View key={deck.id} style={{ width: Platform.OS === 'web' ? cardWidth as any : (isDesktop ? '25%' : isTablet ? '33.33%' : '50%'), padding: 8 }}>
                                        <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                            <TouchableOpacity 
                                                onPress={() => router.push({ pathname: '/flashcards/study', params: { deckId: deck.id } })}
                                                activeOpacity={0.8}
                                                style={{ padding: 20 }}
                                            >
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                                                    <LinearGradient colors={colors} style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                                                        <Text style={{ fontSize: 20 }}>{deck.icon || 'ğŸ“š'}</Text>
                                                    </LinearGradient>
                                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                                        <TouchableOpacity onPress={() => handleDelete(deck.id)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Trash2 size={14} color="#ef4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                                <Text style={{ fontSize: 18, fontWeight: '800', color: 'white', marginBottom: 4 }} numberOfLines={1}>{deck.title}</Text>
                                                <Text style={{ fontSize: 13, color: '#94a3b8' }} numberOfLines={2}>{deck.description || 'AÃ§Ä±klama yok'}</Text>
                                            </TouchableOpacity>

                                            <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                                                <TouchableOpacity 
                                                    onPress={() => router.push({ pathname: '/flashcards/cards', params: { deckId: deck.id } })}
                                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8 }}
                                                >
                                                    <Edit2 size={14} color="#94a3b8" />
                                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8' }}>KartlarÄ± YÃ¶net</Text>
                                                </TouchableOpacity>
                                                
                                                <TouchableOpacity 
                                                    onPress={() => router.push({ pathname: '/flashcards/study', params: { deckId: deck.id } })}
                                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139, 92, 246, 0.2)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100 }}
                                                >
                                                    <PlayCircle size={14} color="#c084fc" />
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#c084fc' }}>Ã‡alÄ±ÅŸ</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}


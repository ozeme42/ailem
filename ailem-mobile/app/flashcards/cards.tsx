import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { onFlashcardsUpdate, addFlashcard, deleteFlashcard } from '../../lib/dataService';
import { Flashcard } from '../../lib/data';
import { ChevronLeft, Plus, Trash2, Edit2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function CardsScreen() {
    const router = useRouter();
    const { deckId } = useLocalSearchParams<{ deckId: string }>();
    const [cards, setCards] = useState<Flashcard[]>([]);
    const [loading, setLoading] = useState(true);
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!deckId) return;
        const unsub = onFlashcardsUpdate(deckId, (data) => {
            setCards(data.sort((a,b) => b.createdAt - a.createdAt));
            setLoading(false);
        });
        return () => unsub();
    }, [deckId]);

    const handleAdd = async () => {
        if (!front.trim() || !back.trim()) {
            Alert.alert('Hata', 'Lütfen kartın ön ve arka yüzünü doldurun.');
            return;
        }
        setIsSubmitting(true);
        try {
            await addFlashcard({ deckId, front, back, level: 0 });
            setFront('');
            setBack('');
        } catch (e) {
            Alert.alert('Hata', 'Kart eklenemedi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id: string) => {
        if (Platform.OS === 'web') {
            if(window.confirm('Bu kartı silmek istediğinize emin misiniz?')) {
                deleteFlashcard(id);
            }
            return;
        }
        Alert.alert('Emin misiniz?', 'Bu kartı silmek istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: () => deleteFlashcard(id) }
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
            <SafeAreaView style={{ flex: 1 }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
                        <ChevronLeft size={24} color="#cbd5e1" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: 'white' }}>Kart Yönetimi</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8', marginBottom: 8, marginLeft: 4 }}>Yeni Kart Ekle</Text>
                    <TextInput
                        style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', padding: 12, borderRadius: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                        placeholder="Ön Yüz (Soru / Kelime)"
                        placeholderTextColor="#475569"
                        value={front}
                        onChangeText={setFront}
                    />
                    <TextInput
                        style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', padding: 12, borderRadius: 12, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', height: 80, textAlignVertical: 'top' }}
                        placeholder="Arka Yüz (Cevap / Anlam)"
                        placeholderTextColor="#475569"
                        multiline
                        value={back}
                        onChangeText={setBack}
                    />
                    <TouchableOpacity 
                        onPress={handleAdd}
                        disabled={isSubmitting}
                        style={{ backgroundColor: '#8b5cf6', padding: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', opacity: isSubmitting ? 0.7 : 1 }}
                    >
                        {isSubmitting ? <ActivityIndicator color="white" /> : (
                            <>
                                <Plus size={18} color="white" style={{ marginRight: 8 }} />
                                <Text style={{ color: 'white', fontWeight: '800', fontSize: 15 }}>Kart Ekle</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8', marginBottom: 16 }}>Mevcut Kartlar ({cards.length})</Text>
                    
                    {cards.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                            <Text style={{ color: '#475569', fontSize: 14 }}>Henüz kart eklenmemiş.</Text>
                        </View>
                    ) : (
                        cards.map(card => (
                            <View key={card.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1, paddingRight: 16 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: 'white', marginBottom: 4 }}>{card.front}</Text>
                                    <Text style={{ fontSize: 14, color: '#94a3b8' }}>{card.back}</Text>
                                    <View style={{ marginTop: 8, backgroundColor: 'rgba(139, 92, 246, 0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                        <Text style={{ fontSize: 10, color: '#c084fc', fontWeight: '700' }}>Seviye {card.level}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => handleDelete(card.id)} style={{ padding: 8, backgroundColor: 'rgba(2ef, 68, 68, 0.1)', borderRadius: 8 }}>
                                    <Trash2 size={16} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}


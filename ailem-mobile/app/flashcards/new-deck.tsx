import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { addDeck } from '../../lib/dataService';
import { ChevronLeft, Save } from 'lucide-react-native';

const EMOJIS = ['📚', '🧬', '🌍', '📐', '🧠', '💻', '🗣️', '🎭', '⚽'];

export default function NewDeckScreen() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('📚');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert("Hata", "Lütfen bir deste adı girin.");
            return;
        }
        setIsSubmitting(true);
        try {
            await addDeck({ title, description, icon });
            router.back();
        } catch (e) {
            Alert.alert("Hata", "Deste oluşturulamadı.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#020617' }}>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: -8 }}>
                        <ChevronLeft size={24} color="#cbd5e1" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: 'white' }}>Yeni Deste</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={{ padding: 20 }}>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8', marginBottom: 8, marginLeft: 4 }}>Simge</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                            {EMOJIS.map(e => (
                                <TouchableOpacity 
                                    key={e} 
                                    onPress={() => setIcon(e)}
                                    style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: icon === e ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: icon === e ? '#8b5cf6' : 'transparent' }}
                                >
                                    <Text style={{ fontSize: 24 }}>{e}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8', marginBottom: 8, marginLeft: 4 }}>Deste Adı</Text>
                        <TextInput
                            style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', padding: 16, borderRadius: 16, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                            placeholder="Örn: İngilizce Kelimeler"
                            placeholderTextColor="#475569"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#94a3b8', marginBottom: 8, marginLeft: 4 }}>Açıklama (İsteğe Bağlı)</Text>
                        <TextInput
                            style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'white', padding: 16, borderRadius: 16, fontSize: 16, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', height: 100, textAlignVertical: 'top' }}
                            placeholder="Bu deste ne hakkında?"
                            placeholderTextColor="#475569"
                            multiline
                            value={description}
                            onChangeText={setDescription}
                        />

                        <TouchableOpacity 
                            onPress={handleSave}
                            disabled={isSubmitting}
                            style={{ backgroundColor: '#8b5cf6', padding: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', opacity: isSubmitting ? 0.7 : 1 }}
                        >
                            {isSubmitting ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Save size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Desteyi Oluştur</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}


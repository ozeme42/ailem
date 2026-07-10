import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Target, Notebook, Timer, Heart, 
  Settings, LogOut, ChevronRight, UserCircle,
  BookOpen, Wallet, CheckSquare, Calendar as CalendarIcon, 
  ShoppingCart, GraduationCap, Sparkles, BookMarked
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';

export default function MoreScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isTablet = Math.min(winWidth, winHeight) >= 600;
  const isLandscape = winWidth > winHeight;
  const isTabletLandscape = isTablet && isLandscape;

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const greeting = user?.email?.split('@')[0] || 'Kullanıcı';

  // Theme tokens
  const t = {
    bg: isDark ? '#0f172a' : '#f1f5f9',
    headerBg: isDark ? ['#1e293b', '#0f172a'] as [string, string] : ['#ffffff', '#f1f5f9'] as [string, string],
    titleColor: isDark ? '#f1f5f9' : '#0f172a',
    subtitleColor: isDark ? '#64748b' : '#94a3b8',
    sectionTitleColor: isDark ? '#94a3b8' : '#64748b',
    settingsBg: isDark ? '#1e293b' : '#ffffff',
    settingsBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    settingsTitle: isDark ? '#e2e8f0' : '#1e293b',
    settingsDesc: isDark ? '#64748b' : '#94a3b8',
    divider: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    chevronColor: isDark ? '#475569' : '#cbd5e1',
    sectionLabelColor: isDark ? '#64748b' : '#94a3b8',
  };

  // Grouped features with gradient color pairs
  const sections = [
    {
      title: 'Planlama & Organizasyon',
      items: [
        { name: 'Takvim', desc: 'Etkinlikler & Programlar', icon: CalendarIcon, gradient: ['#f59e0b', '#f97316'] as [string, string], route: '/calendar' },
        { name: 'Görevler', desc: 'Ev İşleri & Atamalar', icon: CheckSquare, gradient: ['#92400e', '#b45309'] as [string, string], route: '/tasks' },
        { name: 'Hedefler', desc: 'Aile Hedefleri', icon: Target, gradient: ['#eab308', '#f59e0b'] as [string, string], route: '/goals' },
      ],
    },
    {
      title: 'Eğitim & Gelişim',
      items: [
        { name: 'Eğitim Paneli', desc: 'Dersler & Sınavlar', icon: GraduationCap, gradient: ['#7c3aed', '#8b5cf6'] as [string, string], route: '/education' },
        { name: 'Kitaplık', desc: 'Okunan Kitaplar', icon: BookOpen, gradient: ['#0d9488', '#14b8a6'] as [string, string], route: '/library' },
        { name: 'Notlar', desc: 'Defterler & Notlar', icon: Notebook, gradient: ['#d97706', '#f59e0b'] as [string, string], route: '/notes' },
      ],
    },
    {
      title: 'Maneviyat & İbadet',
      items: [
        { name: 'Ezberler', desc: 'Sure ve Dualar', icon: BookMarked, gradient: ['#0ea5e9', '#0284c7'] as [string, string], route: '/memorization' },
      ],
    },
    {
      title: 'Yaşam & Finans',
      items: [
        { name: 'Alışveriş', desc: 'Haftalık Listeler', icon: ShoppingCart, gradient: ['#059669', '#10b981'] as [string, string], route: '/shopping' },
        { name: 'Bütçe', desc: 'Gelir & Gider', icon: Wallet, gradient: ['#9333ea', '#a855f7'] as [string, string], route: '/budget-main' },
        { name: 'Faturalar', desc: 'Fatura Takibi', icon: Timer, gradient: ['#16a34a', '#22c55e'] as [string, string], route: '/bills' },
        { name: 'Yemek Tarifleri', desc: 'Aile Yemek Kitabı', icon: Heart, gradient: ['#0f766e', '#14b8a6'] as [string, string], route: '/yemek' },
        { name: 'Odaklanma', desc: 'Pomodoro Sayacı', icon: Timer, gradient: ['#ea580c', '#f97316'] as [string, string], route: '/pomodoro' },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }} />
      
      {/* Header */}
      <LinearGradient
        colors={t.headerBg}
        style={styles.headerContainer}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6', '#a78bfa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Sparkles size={20} color="white" />
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, { color: t.titleColor }]}>Özellikler</Text>
              <Text style={[styles.headerSubtitle, { color: t.subtitleColor }]}>Tüm aile araçlarını keşfedin</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => router.push('/profile')}>
            <LinearGradient
              colors={['#f59e0b', '#f97316']}
              style={[styles.avatarGradient, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.9)' }]}
            >
              <Text style={styles.avatarText}>{greeting.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
      >
        
        {isTabletLandscape ? (
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 20 }}>
            {/* 3 columns of features */}
            {sections.map((section, sIdx) => (
              <View key={sIdx} style={{ flex: 1, gap: 10 }}>
                {/* Section Title */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2, paddingHorizontal: 4 }}>
                  <View style={[styles.sectionDot, { backgroundColor: section.items[0].gradient[0] }]} />
                  <Text style={[styles.sectionTitle, { color: t.sectionTitleColor }]} numberOfLines={1}>{section.title}</Text>
                </View>

                {/* Vertical list of cards */}
                {section.items.map((feat, idx) => {
                  const Icon = feat.icon;
                  return (
                    <TouchableOpacity 
                      key={idx}
                      onPress={() => router.push(feat.route as any)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={feat.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.cardGradient, { height: 98 }]}
                      >
                        <View style={styles.decorCircle} />
                        <View style={styles.decorCircle2} />
                        
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                          <View style={styles.iconContainer}>
                            <Icon size={18} color="white" />
                          </View>
                          <ChevronRight size={14} color="rgba(255,255,255,0.5)" />
                        </View>
                        <View style={{ zIndex: 1 }}>
                          <Text style={styles.cardTitle}>{feat.name}</Text>
                          <Text style={styles.cardDesc} numberOfLines={1}>{feat.desc}</Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Column 4: Hesap & Ayarlar */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
                <View style={[styles.sectionDot, { backgroundColor: '#6366f1' }]} />
                <Text style={[styles.sectionTitle, { color: t.sectionTitleColor }]}>Hesap & Ayarlar</Text>
              </View>

              <View style={[styles.settingsContainer, { backgroundColor: t.settingsBg, borderColor: t.settingsBorder, marginTop: 0, padding: 14 }]}>
                <TouchableOpacity 
                  onPress={() => router.push('/profile')} 
                  style={styles.settingsRow}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    style={styles.settingsIconBox}
                  >
                    <UserCircle size={16} color="white" />
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.settingsItemTitle, { color: t.settingsTitle, fontSize: 13 }]} numberOfLines={1}>Profil</Text>
                  </View>
                  <ChevronRight size={14} color={t.chevronColor} />
                </TouchableOpacity>

                <View style={[styles.settingsDivider, { backgroundColor: t.divider, marginLeft: 44 }]} />

                <TouchableOpacity 
                  onPress={() => router.push('/settings')} 
                  style={styles.settingsRow}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#64748b', '#94a3b8']}
                    style={styles.settingsIconBox}
                  >
                    <Settings size={16} color="white" />
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.settingsItemTitle, { color: t.settingsTitle, fontSize: 13 }]}>Ayarlar</Text>
                  </View>
                  <ChevronRight size={14} color={t.chevronColor} />
                </TouchableOpacity>

                <View style={[styles.settingsDivider, { backgroundColor: t.divider, marginLeft: 44 }]} />

                <TouchableOpacity 
                  onPress={handleLogout} 
                  style={styles.settingsRow}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#ef4444', '#f87171']}
                    style={styles.settingsIconBox}
                  >
                    <LogOut size={16} color="white" />
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.settingsItemTitle, { color: '#ef4444', fontSize: 13 }]}>Çıkış Yap</Text>
                  </View>
                  <ChevronRight size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* Feature Sections */}
            {sections.map((section, sIdx) => (
              <View key={sIdx} style={styles.sectionContainer}>
                {/* Section Title */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
                  <View style={[styles.sectionDot, { backgroundColor: section.items[0].gradient[0] }]} />
                  <Text style={[styles.sectionTitle, { color: t.sectionTitleColor }]}>{section.title}</Text>
                </View>

                {/* Cards Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                  {section.items.map((feat, idx) => {
                    const Icon = feat.icon;
                    const isLastOdd = section.items.length % 2 !== 0 && idx === section.items.length - 1;
                    return (
                      <TouchableOpacity 
                        key={idx}
                        onPress={() => router.push(feat.route as any)}
                        style={[styles.cardWrapper, isLastOdd && { width: '100%' }]}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={feat.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.cardGradient, isLastOdd && { height: 90 }]}
                        >
                          {/* Decorative circles */}
                          <View style={styles.decorCircle} />
                          <View style={styles.decorCircle2} />
                          
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                            <View style={styles.iconContainer}>
                              <Icon size={18} color="white" />
                            </View>
                            <ChevronRight size={14} color="rgba(255,255,255,0.5)" />
                          </View>
                          <View style={{ zIndex: 1 }}>
                            <Text style={styles.cardTitle}>{feat.name}</Text>
                            <Text style={styles.cardDesc}>{feat.desc}</Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* System Settings */}
            <View style={[styles.settingsContainer, { backgroundColor: t.settingsBg, borderColor: t.settingsBorder }]}>
              <Text style={[styles.settingsSectionTitle, { color: t.sectionLabelColor }]}>Hesap & Ayarlar</Text>
              
              <TouchableOpacity 
                onPress={() => router.push('/profile')} 
                style={styles.settingsRow}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.settingsIconBox}
                >
                  <UserCircle size={16} color="white" />
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.settingsItemTitle, { color: t.settingsTitle }]}>Profil Ayarları</Text>
                  <Text style={[styles.settingsItemDesc, { color: t.settingsDesc }]}>{user?.email}</Text>
                </View>
                <ChevronRight size={16} color={t.chevronColor} />
              </TouchableOpacity>

              <View style={[styles.settingsDivider, { backgroundColor: t.divider }]} />

              <TouchableOpacity 
                onPress={() => router.push('/settings')} 
                style={styles.settingsRow}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#64748b', '#94a3b8']}
                  style={styles.settingsIconBox}
                >
                  <Settings size={16} color="white" />
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.settingsItemTitle, { color: t.settingsTitle }]}>Uygulama Ayarları</Text>
                  <Text style={[styles.settingsItemDesc, { color: t.settingsDesc }]}>Bildirimler, tema, dil</Text>
                </View>
                <ChevronRight size={16} color={t.chevronColor} />
              </TouchableOpacity>

              <View style={[styles.settingsDivider, { backgroundColor: t.divider }]} />

              <TouchableOpacity 
                onPress={handleLogout} 
                style={styles.settingsRow}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#ef4444', '#f87171']}
                  style={styles.settingsIconBox}
                >
                  <LogOut size={16} color="white" />
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.settingsItemTitle, { color: '#ef4444' }]}>Çıkış Yap</Text>
                  <Text style={[styles.settingsItemDesc, { color: t.settingsDesc }]}>Oturumu sonlandır</Text>
                </View>
                <ChevronRight size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  logoGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  avatarGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionContainer: {
    marginTop: 20,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardWrapper: {
    width: '48.5%',
    marginBottom: 12,
  },
  cardGradient: {
    height: 115,
    borderRadius: 20,
    padding: 14,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -15,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  settingsContainer: {
    marginTop: 28,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 16,
    marginLeft: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingsItemDesc: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  settingsDivider: {
    height: 1,
    marginLeft: 50,
  },
});

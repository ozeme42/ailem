import { Tabs } from 'expo-router';
import { Home, CheckSquare, Calendar, BookOpen, Menu, ShoppingCart, GraduationCap } from 'lucide-react-native';
import { View, Platform, StyleSheet, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
        tabBarBackground: () => (
          <View style={{ flex: 1, overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <BlurView 
              tint={isDark ? 'dark' : 'light'} 
              intensity={80} 
              style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(30,41,59,0.7)' : 'rgba(248,250,252,0.85)' }]} 
            />
          </View>
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, focused }) => {
            const activeColor = '#3b82f6';
            return (
              <View style={{ alignItems: 'center', width: 60 }}>
                <View style={{
                  width: 48, height: focused ? 48 : 30, borderRadius: 24,
                  backgroundColor: focused ? activeColor : 'transparent',
                  justifyContent: 'center', alignItems: 'center',
                  transform: [{ translateY: focused ? -15 : 0 }],
                  shadowColor: focused ? activeColor : 'transparent',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: focused ? 0.6 : 0,
                  shadowRadius: 8,
                  elevation: focused ? 5 : 0,
                }}>
                  <Home size={focused ? 24 : 22} color={focused ? '#fff' : color} />
                </View>
                <Text style={{ fontSize: 9, color: focused ? activeColor : color, fontWeight: focused ? '800' : '700', marginTop: focused ? -8 : 2 }}>Ana Sayfa</Text>
              </View>
          )},
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Alışveriş',
          tabBarIcon: ({ color, focused }) => {
            const activeColor = '#ec4899';
            return (
              <View style={{ alignItems: 'center', width: 60 }}>
                <View style={{
                  width: 48, height: focused ? 48 : 30, borderRadius: 24,
                  backgroundColor: focused ? activeColor : 'transparent',
                  justifyContent: 'center', alignItems: 'center',
                  transform: [{ translateY: focused ? -15 : 0 }],
                  shadowColor: focused ? activeColor : 'transparent',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: focused ? 0.6 : 0,
                  shadowRadius: 8,
                  elevation: focused ? 5 : 0,
                }}>
                  <ShoppingCart size={focused ? 24 : 22} color={focused ? '#fff' : color} />
                </View>
                <Text style={{ fontSize: 9, color: focused ? activeColor : color, fontWeight: focused ? '800' : '700', marginTop: focused ? -8 : 2 }}>Alışveriş</Text>
              </View>
          )},
        }}
      />
      <Tabs.Screen
        name="education"
        options={{
          title: 'Eğitim',
          tabBarIcon: ({ color, focused }) => {
            const activeColor = '#8b5cf6';
            return (
              <View style={{ alignItems: 'center', width: 60 }}>
                <View style={{
                  width: 48, height: focused ? 48 : 30, borderRadius: 24,
                  backgroundColor: focused ? activeColor : 'transparent',
                  justifyContent: 'center', alignItems: 'center',
                  transform: [{ translateY: focused ? -15 : 0 }],
                  shadowColor: focused ? activeColor : 'transparent',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: focused ? 0.6 : 0,
                  shadowRadius: 8,
                  elevation: focused ? 5 : 0,
                }}>
                  <GraduationCap size={focused ? 24 : 22} color={focused ? '#fff' : color} />
                </View>
                <Text style={{ fontSize: 9, color: focused ? activeColor : color, fontWeight: focused ? '800' : '700', marginTop: focused ? -8 : 2 }}>Eğitim</Text>
              </View>
          )},
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Kitaplık',
          tabBarIcon: ({ color, focused }) => {
            const activeColor = '#f59e0b';
            return (
              <View style={{ alignItems: 'center', width: 60 }}>
                <View style={{
                  width: 48, height: focused ? 48 : 30, borderRadius: 24,
                  backgroundColor: focused ? activeColor : 'transparent',
                  justifyContent: 'center', alignItems: 'center',
                  transform: [{ translateY: focused ? -15 : 0 }],
                  shadowColor: focused ? activeColor : 'transparent',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: focused ? 0.6 : 0,
                  shadowRadius: 8,
                  elevation: focused ? 5 : 0,
                }}>
                  <BookOpen size={focused ? 24 : 22} color={focused ? '#fff' : color} />
                </View>
                <Text style={{ fontSize: 9, color: focused ? activeColor : color, fontWeight: focused ? '800' : '700', marginTop: focused ? -8 : 2 }}>Kitaplık</Text>
              </View>
          )},
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Menü',
          tabBarIcon: ({ color, focused }) => {
            const activeColor = '#10b981';
            return (
              <View style={{ alignItems: 'center', width: 60 }}>
                <View style={{
                  width: 48, height: focused ? 48 : 30, borderRadius: 24,
                  backgroundColor: focused ? activeColor : 'transparent',
                  justifyContent: 'center', alignItems: 'center',
                  transform: [{ translateY: focused ? -15 : 0 }],
                  shadowColor: focused ? activeColor : 'transparent',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: focused ? 0.6 : 0,
                  shadowRadius: 8,
                  elevation: focused ? 5 : 0,
                }}>
                  <Menu size={focused ? 24 : 22} color={focused ? '#fff' : color} />
                </View>
                <Text style={{ fontSize: 9, color: focused ? activeColor : color, fontWeight: focused ? '800' : '700', marginTop: focused ? -8 : 2 }}>Menü</Text>
              </View>
          )},
        }}
      />
    </Tabs>
  );
}

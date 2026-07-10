import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CalendarEvent } from './data';
import { parseISO, subMinutes, isAfter } from 'date-fns';

// Bildirimlerin nasıl görüneceğini ayarlıyoruz (Uygulama açıkken bile düşmesi için)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// İzinleri kontrol et ve iste
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4f46e5',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Bildirim izni alınamadı!');
      return false;
    }
  } else {
    console.log('Bildirimler fiziksel bir cihazda çalışır');
  }

  return true;
}

// Bir etkinlik için bildirim kur
export async function scheduleEventNotification(event: CalendarEvent) {
  if (Platform.OS === 'web') return;
  // Eski bildirimi varsa iptal et (güncelleme durumları için)
  await cancelEventNotification(event.id);

  if (!event.reminderMinutes || event.reminderMinutes <= 0) return;

  const eventDate = parseISO(event.startDate); 
  
  if (event.startTime) {
    const [hours, minutes] = event.startTime.split(':').map(Number);
    eventDate.setHours(hours, minutes, 0, 0);
  } else {
    // Eğer saati yoksa sabah 09:00 kabul edelim
    eventDate.setHours(9, 0, 0, 0);
  }

  // Hatırlatıcı süresini çıkar
  let triggerDate = subMinutes(eventDate, event.reminderMinutes);

  // Eğer bildirim zamanı geçmişteyse kurma
  if (!isAfter(triggerDate, new Date())) return;

  let reminderText = `${event.reminderMinutes} dakika sonra`;
  if (event.reminderMinutes === 60) reminderText = '1 saat sonra';
  if (event.reminderMinutes === 1440) reminderText = 'Yarın';

  const title = `Yaklaşan Etkinlik: ${event.title}`;
  const body = `${event.title} etkinliği ${reminderText} başlayacak. ${event.location ? 'Konum: ' + event.location : ''}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { eventId: event.id },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
    identifier: event.id, // ID'yi identifier olarak veriyoruz ki sonra iptal edebilelim
  });
  
  console.log(`Bildirim kuruldu: ${title} - Zaman: ${triggerDate}`);
}

// Belirli bir etkinliğin bildirimini iptal et
export async function cancelEventNotification(eventId: string) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(eventId);
}

// Firebase'den gelen tüm etkinlikleri senkronize et (Silinmişleri iptal et, yenileri kur)
export async function syncLocalNotifications(events: CalendarEvent[]) {
  if (Platform.OS === 'web') return;
  // Şu anki kurulu tüm bildirimleri al
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIds = scheduledNotifications.map(n => n.identifier);

  // Gelen etkinliklerdeki ID'leri al
  const eventIds = events.map(e => e.id);

  // Silinmiş etkinliklerin bildirimlerini iptal et
  for (const id of scheduledIds) {
    if (!eventIds.includes(id)) {
      await cancelEventNotification(id);
    }
  }

  // Aktif etkinlikler için (eğer hatırlatıcı varsa) bildirim kur
  for (const event of events) {
    if (event.reminderMinutes && event.reminderMinutes > 0) {
       await scheduleEventNotification(event);
    }
  }
}

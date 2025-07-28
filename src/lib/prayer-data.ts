import type { PrayerContent } from './data';

export const initialPrayers: Omit<PrayerContent, 'id' | 'familyId'>[] = [
  // Namaz Sureleri
  {
    title: 'Fatiha Suresi',
    category: 'Namaz Sureleri',
    arabicText: `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ
اَلْحَمْدُ لِلّٰهِ رَبِّ الْعَالَم۪ينَۙ
اَلرَّحْمٰنِ الرَّح۪يمِۙ
مَالِكِ يَوْمِ الدّ۪ينِۜ
اِيَّاكَ نَعْبُدُ وَاِيَّاكَ نَسْتَع۪ينُۜ
اِھْدِنَا الصِّرَاطَ الْمُسْتَق۪يمَۙ
صِرَاطَ الَّذ۪ينَ اَنْعَمْتَ عَلَيْهِمْۙ غَيْرِ الْمَغْضُub عَلَيْهِمْ وَلَا الضَّٓالّ۪ينَ`,
    turkishText: `Bismillâhirrahmânirrahîm.
Elhamdu lillâhi rabbil'alemin
Errahmânir'rahim
Mâliki yevmiddin
İyyâke na'budu Ve iyyâke neste'în
İhdinessirâtal mustakîm
Sirâtallezîne en'amte aleyhim
Ğayrilmağdûbi aleyhim ve leddâllîn`,
    meaning: 'Rahman ve Rahim olan Allah\'ın adıyla.\nHamd, Alemlerin Rabbi\nRahman, Rahim\nHesap ve ceza gününün maliki Allah\'a mahsustur.\n(Allahım!) Yalnız sana ibadet ederiz ve yalnız senden yardım dileriz.\nBizi doğru yola, kendilerine nimet verdiklerinin yoluna ilet; gazaba uğrayanlarınkine ve sapkınlarınkine değil.',
    order: 1
  },
  {
    title: 'Fil Suresi',
    category: 'Namaz Sureleri',
    arabicText: `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ
اَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِاَصْحَابِ الْف۪يلِۜ
اَلَمْ يَجْعَلْ كَيْدَهُمْ ف۪ي تَضْل۪يلٍۙ
وَاَرْسَلَ عَلَيْهِمْ طَيْرًا اَبَاب۪يلَۙ
تَرْم۪يهِمْ بِحِجَارَةٍ مِنْ سِجّ۪يلٍۖ
فَجَعَلَهُمْ كَعَصْفٍ مَأْكُولٍ`,
    turkishText: `Elem tera keyfe fe'ale rabbuke biashâbilfîl
Elem yec'al keydehum fî tadlîl
Ve ersele aleyhim tayran ebâbîl
Termîhim bihicâratin min siccîl
Fece'alehum ke'asfin me'kûl`,
    meaning: `Rabbinin, fil sahiplerine ne yaptığını görmedin mi? Onların tuzaklarını boşa çıkarmadı mı? Üzerlerine balçıktan pişirilmiş taşlar atan sürü sürü kuşlar gönderdi. Nihayet onları yenilmiş ekin yaprakları gibi yaptı.`,
    order: 2
  },
  {
    title: 'Kureyş Suresi',
    category: 'Namaz Sureleri',
    arabicText: `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ
لِا۪ילَافِ قُرَيْشٍۙ
ا۪ילَافِهِمْ رِحْلَةَ الشِّتَٓاءِ وَالصَّيْفِۚ
فَلْيَعْبُدُوا رَبَّ هٰذَا الْبَيْتِۙ
اَلَّذ۪ٓي اَطْعَمَهُمْ مِنْ جُوعٍ وَاٰمَنَهُمْ مِنْ خَوْفٍ`,
    turkishText: `Li'î lâfi Kureyş
Îlâfihim rihleteşşitâi vessayf
Felya'budû rabbe hâzelbeyt
Ellezî et'amehum min cû'in ve âmenehum min havf`,
    meaning: `Kureyş'in güvenliği, onların kış ve yaz yolculuklarının güvenliği için, şu evin (Kâbe'nin) Rabbine kulluk etsinler. O ki, onları açlıktan doyurdu ve korkudan emin kıldı.`,
    order: 3
  },
  {
    title: 'Maun Suresi',
    category: 'Namaz Sureleri',
    arabicText: `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ
اَرَاَيْتَ الَّذ۪ي يُكَذِّبُ بِالدّ۪ينِۜ
فَذٰلِكَ الَّذ۪ي يَدُعُّ الْيَت۪يمَۙ
وَلَا يَحُضُّ عَلٰى طَعَامِ الْمِسْك۪ينِۜ
فَوَيْلٌ لِلْمُصَلّ۪ينَۙ
اَلَّذ۪ينَ هُمْ عَنْ صَلَاتِهِمْ سَاهُونَۙ
اَلَّذ۪ينَ هُمْ يُرَٓاؤُ۫نَۙ
وَيَمْنَعُونَ الْمَاعُونَ`,
    turkishText: `Era'eytellezî yukezzibu biddîn
Fezâlikellezî yedu'ulyetîm
Ve lâ yehuddu alâ ta'âmilmiskîn
Feveylun lilmusallîn
Ellezînehum an salâtihim sâhûn
Ellezînehum yurâûne
Ve yemne'ûnelmâ'ûn`,
    meaning: `Gördün mü o dine yalan diyeni? İşte o, yetimi itip kakar. Yoksulu doyurmaya teşvik etmez. O halde vay o namaz kılanların haline ki, Onlar namazlarını ciddiye almazlar. Onlar gösteriş yaparlar. Ve yardımlığa (zekât ve komşu yardımı gibi) mâni olurlar.`,
    order: 4
  },
  {
    title: 'Kevser Suresi',
    category: 'Namaz Sureleri',
    arabicText: `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ
اِنَّٓا اَعْطَيْنَاكَ الْكَوْثَرَۜ
فَصَلِّ لِرَبِّكَ وَانْحَرْۜ
اِنَّ شَانِئَكَ هُوَ الْاَبْتَرُ`,
    turkishText: `İnnâ a'taynâkelkevser
Fesalli lirabbike venhar
İnne şânieke huvel'ebter`,
    meaning: `(Resûlüm!) Kuşkusuz biz sana Kevser'i verdik. Şimdi sen Rabbin için namaz kıl ve kurban kes! Asıl sonu kesik olan, şüphesiz sana hınç besleyendir.`,
    order: 5
  },
  {
    title: 'Kafirun Suresi',
    category: 'Namaz Sureleri',
    arabicText: `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ
قُلْ يَٓا اَيُّهَا الْكَافِرُونَۙ
لَٓا اَعْبُدُ مَا تَعْبُدُونَۙ
وَلَٓا اَنْتُمْ عَابِدُونَ مَٓا اَعْبُدُۚ
وَلَٓا اَنَا۬ عَابِدٌ مَا عَبَدْتُمْۙ
وَلَٓا اَنْتُمْ عَابِدُونَ مَٓا اَعْبُدُۜ
لَكُمْ د۪ينُكُمْ وَلِيَ د۪ينِ`,
    turkishText: `Kul yâ eyyuhâlkâfirûn
Lâ a'budu mâ ta'budûn
Ve lâ entum âbidûne mâ a'bud
Ve lâ ene âbidun mâ abedtum
Ve lâ entum âbidûne mâ a'bud
Lekum dînukum veliye dîn`,
    meaning: `De ki: Ey inkârcılar! Ben sizin taptıklarınıza tapmam. Siz de benim taptığıma tapıcılar değilsiniz. Ben sizin taptıklarınıza tapmış değilim. Siz de benim taptığıma tapıcılar değilsiniz. Sizin dininiz size, benim dinim banadır.`,
    order: 6
  },
  {
    title: 'Nasr Suresi',
    category: 'Namaz Sureleri',
    arabicText: `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ
اِذَا جَٓاءَ نَصْرُ اللّٰهِ وَالْفَتْحُۙ
وَرَاَيْتَ النَّاسَ يَدْخُلُونَ ف۪ي د۪ينِ اللّٰهِ اَفْوَاجًاۙ
فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُۜ اِنَّهُ كَانَ تَوَّابًا`,
    turkishText: `İzâ câe nasrullâhi velfeth
Ve raeytennâse yedhulûne fî dînillâhi efvâcâ
Fesebbih bihamdi rabbike vestağfirh, İnnehû kâne tevvâbâ`,
    meaning: `Allah'ın yardımı ve fetih (Mekke fethi) geldiğinde ve insanların bölük bölük Allah'ın dinine girdiğini gördüğünde, Rabbine hamd ederek tespihte bulun ve O'ndan bağışlama dile. Çünkü O, tövbeleri çok kabul edendir.`,
    order: 7
  },
  {
    title: 'Tebbet Suresi',
    category: 'Namaz Sureleri',
    arabicText: `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ
تَبَّتْ يَدَٓا اَب۪ي لَهَبٍ وَتَبَّۜ
مَٓا اَغْنٰى عَنْهُ مَالُهُ وَمَا كَسَبَۜ
سَيَصْلٰى نَارًا ذَاتَ لَهَبٍۚ
وَامْرَاَتُهُۜ حَمَّالَةَ الْحَطَبِۚ
ف۪ي ج۪يدِهَا حَبْلٌ مِنْ مَسَدٍ`,
    turkishText: `Tebbet yedâ ebî lehebin ve tebb
Mâ ağnâ anhu mâluhû ve mâ keseb
Seyaslâ nâren zâte leheb
Vemraetuhû hammâletelhatab
Fî cîdihâ hablun min mesed`,
    meaning: `Ebû Leheb'in elleri kurusun, zaten kurudu. Malı ve kazandıkları ona fayda vermedi. O, alevli bir ateşe girecektir. Karısı da, odun taşıyıcı olarak. Boynunda bükülmüş hurma liflerinden bir ip olduğu halde.`,
    order: 8
  },
  {
    title: 'İhlas Suresi',
    category: 'Namaz Sureleri',
    arabicText: `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ
قُلْ هُوَ اللّٰهُ اَحَدٌۚ
اَللّٰهُ الصَّمَدُۚ
لَمْ يَلِدْ وَلَمْ يُولَدْۙ
وَلَمْ يَكُنْ لَهُ كُفُوًا اَحَدٌ`,
    turkishText: `Kul huvallâhu ehad
Allâhussamed
Lem yelid ve lem yûled
Ve lem yekun lehû kufuven ehad`,
    meaning: `De ki: O, Allah'tır, bir tektir. Allah Samed'dir (Her şey O'na muhtaçtır, O, hiçbir şeye muhtaç değildir). O, doğurmamış ve doğmamıştır. O'nun hiçbir dengi yoktur.`,
    order: 9
  },
  {
    title: 'Felak Suresi',
    category: 'Namaz Sureleri',
    arabicText: `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ
قُلْ اَعُوذُ بِرَبِّ الْفَلَقِۙ
مِنْ شَرِّ مَا خَلَقَۙ
وَمِنْ شَرِّ غَاسِقٍ اِذَا وَقَبَۙ
وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِۙ
وَمِنْ شَرِّ حَاسِدٍ اِذَا حَسَدَ`,
    turkishText: `Kul e'ûzu birabbil felak
Min şerri mâ halak
Ve min şerri ğâsikın izâ vekab
Ve min şerrinneffâsâti fil'ukad
Ve min şerri hâsidin izâ hased`,
    meaning: `De ki: "Sabahın Rabbine sığınırım, yarattığı şeylerin şerrinden, karanlığı çöktüğü zaman gecenin şerrinden, düğümlere üfürenlerin şerrinden, ve haset ettiği zaman hasetçinin şerrinden."`,
    order: 10
  },
  {
    title: 'Nas Suresi',
    category: 'Namaz Sureleri',
    arabicText: `بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ
قُلْ اَعُوذُ بِرَبِّ النَّاسِۙ
مَلِكِ النَّاسِۙ
اِلٰهِ النَّاسِۙ
مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِۙ
اَلَّذ۪ي يُوَسْوِسُ ف۪ي صُدُورِ النَّاسِۙ
مِنَ الْجِنَّةِ وَالنَّاسِ`,
    turkishText: `Kul e'ûzu birabbinnâs
Melikinnâs
İlâhinnâs
Min şerrilvesvâsilhannâs
Ellezî yuvesvisu fî sudûrinnâs
Minelcinneti vennâs`,
    meaning: `De ki: "İnsanların Rabbine, insanların Melikine, insanların İlahına sığınırım. O sinsi vesvesecinin şerrinden. O ki, insanların göğüslerine vesvese verir. Gerek cinden, gerek insandan."`,
    order: 11
  },
  // Namaz Duaları
  {
    title: 'Sübhaneke Duası',
    category: 'Namaz Duaları',
    arabicText: `سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ 
وَتَبَارَكَ اسْمُكَ 
وَتَعَالَى جَدُّكَ 
وَلاَ إِلَهَ غَيْرُكَ`,
    turkishText: `Subhanekellahumme ve bihamdik
Ve tebarekesmuk
Ve teala cedduk
Ve la ilahe gayruk.`,
    meaning: `Allah'ım! Sen eksik sıfatlardan uzaksın, seni daima överim. Senin adın mübarektir. Senin şanın her şeyden üstündür. Senden başka ilah yoktur.`,
    order: 12
  },
  {
    title: 'Ettehiyyatü Duası',
    category: 'Namaz Duaları',
    arabicText: `اَلتَّحِيَّاتُ لِلّٰهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ
اَلسَّلاَمُ عَلَيْكَ اَيُّهَا النَّبِيُّ وَرَحْمَةُ اللّٰهِ وَبَرَكَاتُهُ
اَلسَّلاَمُ عَلَيْنَا وَعَلٰى عِبَادِ اللّٰهِ الصَّالِح۪ينَ
اَشْهَدُ اَنْ لاَ اِلٰهَ اِلاَّ اللّٰهُ
وَاَشْهَدُ اَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ`,
    turkishText: `Ettehiyyâtu lillâhi vessalevâtu vettayibât
Esselâmu aleyke eyyuhennebiyyu ve rahmetullâhi ve berekâtuh
Esselâmu aleynâ ve alâ ibâdillâhissâlihîn
Eşhedü en lâ ilâhe illAllâh
Ve eşhedü enne Muhammeden abduhû ve resûluh`,
    meaning: `Dil ile, beden ile ve mal ile yapılan bütün ibadetler Allah'a mahsustur. Ey Peygamber! Allah'ın selamı, rahmeti ve bereketi senin üzerine olsun. Selam bizim ve Allah'ın iyi kullarının üzerine olsun. Şahitlik ederim ki, Allah'tan başka ilah yoktur. Yine şahitlik ederim ki, Muhammed, O'nun kulu ve elçisidir.`,
    order: 13
  },
  {
    title: 'Allahümme Salli Duası',
    category: 'Namaz Duaları',
    arabicText: `اَللّٰهُمَّ صَلِّ عَلٰى مُحَمَّدٍ وَعَلٰى اٰلِ مُحَمَّدٍ 
كَمَا صَلَّيْتَ عَلٰى اِبْرَاه۪يمَ وَعَلٰى اٰلِ اِبْرَاه۪يمَ 
اِنَّكَ حَم۪يدٌ مَج۪يدٌ`,
    turkishText: `Allahumme salli ala Muhammedin ve ala ali Muhammed
Kema salleyte ala İbrahime ve ala ali İbrahim
İnneke hamidun mecid.`,
    meaning: `Allah'ım! Muhammed'e ve Muhammed'in ailesine, İbrahim'e ve İbrahim'in ailesine rahmet ettiğin gibi rahmet eyle. Şüphesiz sen övülmeye layık ve şanı yüce olansın.`,
    order: 14
  },
  {
    title: 'Allahümme Barik Duası',
    category: 'Namaz Duaları',
    arabicText: `اَللّٰهُمَّ بَارِكْ عَلٰى مُحَمَّدٍ وَعَلٰى اٰلِ مُحَمَّدٍ 
كَمَا بَارَكْتَ عَلٰى اِبْرَاه۪يمَ وَعَلٰى اٰلِ اِبْرَاه۪يمَ 
اِنَّكَ حَم۪يدٌ مَج۪يدٌ`,
    turkishText: `Allahumme barik ala Muhammedin ve ala ali Muhammed
Kema barekte ala İbrahime ve ala ali İbrahim
İnneke hamidun mecid.`,
    meaning: `Allah'ım! Muhammed'e ve Muhammed'in ailesine, İbrahim'e ve İbrahim'in ailesine bereket ihsan ettiğin gibi bereket ihsan eyle. Şüphesiz sen övülmeye layık ve şanı yüce olansın.`,
    order: 15
  },
  {
    title: 'Rabbena Atina Duası',
    category: 'Namaz Duaları',
    arabicText: `رَبَّنَٓا اٰتِنَا فِي الدُّنْيَا حَسَنَةً 
وَفِي الْاٰخِرَةِ حَسَنَةً 
وَقِنَا عَذَابَ النَّارِ`,
    turkishText: `Rabbena atina fid'dunya haseneten
Ve fil'ahireti haseneten
Ve kına azabennar.`,
    meaning: `Rabbimiz! Bize dünyada da iyilik ver, ahirette de iyilik ver. Ve bizi cehennem azabından koru.`,
    order: 16
  },
  {
    title: 'Rabbenağfirli Duası',
    category: 'Namaz Duaları',
    arabicText: `رَبَّنَا اغْفِرْ ل۪ي وَلِوَالِدَيَّ 
وَلِلْمُؤْمِن۪ينَ يَوْمَ يَقُومُ الْحِسَابُ`,
    turkishText: `Rabbenağfirli ve li-valideyye
Ve lil-mu'minine yevme yekumul hisab.`,
    meaning: `Rabbimiz! Hesap gününde beni, annemi, babamı ve bütün mü'minleri bağışla.`,
    order: 17
  },
];

import AudioPlayer from '@/components/AudioPlayer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { RECITERS, TAFSIRS, fetchTafsir } from '@/services/api';
import { shareAyahText } from '@/utils/share';
import { STORAGE_KEYS, addBookmark, getPreference, isBookmarked, removeBookmark, setPreference } from '@/utils/storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, ChevronLeft, ChevronRight, Gauge, Heart, Palette, Settings, Type, Volume2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const THEMES = [
    { id: 'default', name: 'افتراضي', colors: { bg: Colors.surface, text: Colors.text.primary, border: Colors.borderLight, card: '#fff' } },
    { id: 'cream', name: 'كريمي', colors: { bg: '#FDF8E8', text: '#5D4037', border: '#DED1B6', card: '#FFFDF5' } },
    { id: 'dark', name: 'داكن', colors: { bg: '#1A1A1A', text: '#F5F5F5', border: '#333', card: '#262626' } },
    { id: 'nature', name: 'طبيعي', colors: { bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9', card: '#F1F8E9' } },
];

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export default function AyahDetailsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Core parameters
    const [surahNumber, setSurahNumber] = useState(parseInt(params.surahNumber as string));
    const [ayahNumberInSurah, setAyahNumberInSurah] = useState(parseInt(params.ayahNumberInSurah as string));
    const [globalAyahNumber, setGlobalAyahNumber] = useState(parseInt(params.globalAyahNumber as string));
    const [surahName, setSurahName] = useState(params.surahName as string);
    const [ayahText, setAyahText] = useState(params.ayahText as string);

    // Feature state
    const [tafsir, setTafsir] = useState<string>('');
    const [tafsirId, setTafsirId] = useState<string>('ar.muyassar');
    const [loadingTafsir, setLoadingTafsir] = useState(true);
    const [bookmarked, setBookmarked] = useState(false);
    const [showAudio, setShowAudio] = useState(false);
    const [showTafsirs, setShowTafsirs] = useState(false);

    // Creative/Premium features
    const [activeTheme, setActiveTheme] = useState(THEMES[0]);
    const [fontSize, setFontSize] = useState(28);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [showTransliteration, setShowTransliteration] = useState(false);
    const [transliteration, setTransliteration] = useState<string>('');
    const [activeReciter, setActiveReciter] = useState(RECITERS[0].id);

    useEffect(() => {
        const loadInitialData = async () => {
            const savedTafsir = await getPreference(STORAGE_KEYS.SELECTED_TAFSIR, 'ar.muyassar');
            setTafsirId(savedTafsir);
            checkBookmarkStatus();
            loadTransliteration();
        };
        loadInitialData();
    }, [globalAyahNumber]);

    useEffect(() => {
        if (globalAyahNumber && tafsirId) {
            loadTafsir();
        }
    }, [globalAyahNumber, tafsirId]);

    const loadTafsir = async () => {
        try {
            setLoadingTafsir(true);
            const tafsirText = await fetchTafsir(surahNumber, ayahNumberInSurah, tafsirId);
            setTafsir(tafsirText);
        } catch (error) {
            setTafsir('التفسير غير متوفر في الوقت الحالي.');
        } finally {
            setLoadingTafsir(false);
        }
    };

    const loadTransliteration = async () => {
        try {
            const response = await fetch(`https://api.alquran.cloud/v1/ayah/${globalAyahNumber}/en.transliteration`);
            const data = await response.json();
            setTransliteration(data.data.text);
        } catch (error) {
            setTransliteration('Transliteration unavailable');
        }
    };

    const handleTafsirChange = async (id: string) => {
        setTafsirId(id);
        setShowTafsirs(false);
        await setPreference(STORAGE_KEYS.SELECTED_TAFSIR, id);
    };

    const checkBookmarkStatus = async () => {
        const status = await isBookmarked(surahNumber, ayahNumberInSurah);
        setBookmarked(status);
    };

    const handleBookmarkToggle = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (bookmarked) {
            await removeBookmark(surahNumber, ayahNumberInSurah);
            setBookmarked(false);
        } else {
            await addBookmark(surahNumber, ayahNumberInSurah, ayahText, surahName);
            setBookmarked(true);
        }
    };

    const handleShare = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await shareAyahText(ayahText, surahName, surahNumber, ayahNumberInSurah);
    };

    const navigateToNext = async () => {
        // Logic for next ayah
        // To keep it simple for now, we'll just increment global, 
        // but in a real app we'd fetch the metadata for the next one
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const nextGlobal = globalAyahNumber + 1;
        if (nextGlobal > 6236) return;

        try {
            const resp = await fetch(`https://api.alquran.cloud/v1/ayah/${nextGlobal}/ar.alafasy`);
            const data = await resp.json();
            const ayah = data.data;
            setGlobalAyahNumber(ayah.number);
            setAyahNumberInSurah(ayah.numberInSurah);
            setSurahNumber(ayah.surah.number);
            setSurahName(ayah.surah.name);
            setAyahText(ayah.text);
        } catch (e) {
            console.error(e);
        }
    };

    const navigateToPrev = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const prevGlobal = globalAyahNumber - 1;
        if (prevGlobal < 1) return;

        try {
            const resp = await fetch(`https://api.alquran.cloud/v1/ayah/${prevGlobal}/ar.alafasy`);
            const data = await resp.json();
            const ayah = data.data;
            setGlobalAyahNumber(ayah.number);
            setAyahNumberInSurah(ayah.numberInSurah);
            setSurahNumber(ayah.surah.number);
            setSurahName(ayah.surah.name);
            setAyahText(ayah.text);
        } catch (e) {
            console.error(e);
        }
    };

    const convertToArabicNumerals = (num: number): string => {
        const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)] || digit).join('');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.colors.bg }]}>
            {/* Custom Header */}
            <View style={[styles.header, { borderBottomColor: activeTheme.colors.border }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={28} color={activeTheme.id === 'dark' ? '#fff' : Colors.primary} />
                </Pressable>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: activeTheme.id === 'dark' ? '#fff' : Colors.primary }]}>
                        {surahName}
                    </Text>
                    <Text style={styles.headerSubtitle}>الآية {convertToArabicNumerals(ayahNumberInSurah)}</Text>
                </View>
                <Pressable onPress={() => setShowTafsirs(!showTafsirs)} style={styles.headerAction}>
                    <Settings size={22} color={activeTheme.id === 'dark' ? '#fff' : Colors.primary} />
                </Pressable>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Visual Accent */}
                <View style={styles.decorativeTop}>
                    <View style={[styles.ayahNumberBadge, { borderColor: activeTheme.colors.border }]}>
                        <Text style={[styles.ayahNumberText, { color: activeTheme.colors.text }]}>
                            {convertToArabicNumerals(ayahNumberInSurah)}
                        </Text>
                    </View>
                </View>

                {/* Main Content Card */}
                <View style={[styles.ayahCard, { backgroundColor: activeTheme.colors.card, borderColor: activeTheme.colors.border }]}>
                    <Text style={[styles.ayahText, { fontSize, color: activeTheme.colors.text }]}>
                        {ayahText}
                    </Text>

                    {showTransliteration && (
                        <View style={styles.transliterationBox}>
                            <Text style={styles.transliterationText}>"{transliteration}"</Text>
                        </View>
                    )}
                </View>

                {/* Creative Controls Hub */}
                <View style={styles.hub}>
                    <Text style={styles.hubTitle}>أدوات العرض والتفاعل</Text>

                    {/* Display Row (Font & Trans) */}
                    <View style={styles.hubRow}>
                        <View style={styles.hubItem}>
                            <View style={styles.hubIconLabel}>
                                <Type size={16} color={Colors.primary} />
                                <Text style={styles.hubLabel}>حجم الخط</Text>
                            </View>
                            <View style={styles.fontControls}>
                                <Pressable onPress={() => setFontSize(Math.max(16, fontSize - 4))} style={styles.fontButton}>
                                    <Text style={styles.fontButtonText}>A-</Text>
                                </Pressable>
                                <Text style={styles.fontVal}>{fontSize}</Text>
                                <Pressable onPress={() => setFontSize(Math.min(48, fontSize + 4))} style={styles.fontButton}>
                                    <Text style={styles.fontButtonText}>A+</Text>
                                </Pressable>
                            </View>
                        </View>

                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setShowTransliteration(!showTransliteration);
                            }}
                            style={[styles.hubItem, styles.toggleItem, showTransliteration && styles.toggleItemActive]}
                        >
                            <BookOpen size={16} color={showTransliteration ? '#fff' : Colors.primary} />
                            <Text style={[styles.hubLabel, showTransliteration && { color: '#fff' }]}>ترجمة صوتية</Text>
                        </Pressable>
                    </View>

                    {/* Theme Row */}
                    <View style={styles.hubItem}>
                        <View style={styles.hubIconLabel}>
                            <Palette size={16} color={Colors.primary} />
                            <Text style={styles.hubLabel}>نمط العرض</Text>
                        </View>
                        <View style={styles.themeScroll}>
                            {THEMES.map((theme) => (
                                <Pressable
                                    key={theme.id}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setActiveTheme(theme);
                                    }}
                                    style={[
                                        styles.themeChip,
                                        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                                        activeTheme.id === theme.id && styles.themeChipActive
                                    ]}
                                >
                                    <Text style={[styles.themeChipText, { color: theme.colors.text }]}>{theme.name}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Speed Row */}
                    <View style={styles.hubItem}>
                        <View style={styles.hubIconLabel}>
                            <Gauge size={16} color={Colors.primary} />
                            <Text style={styles.hubLabel}>سرعة التلاوة</Text>
                        </View>
                        <View style={styles.speedScroll}>
                            {SPEEDS.map((speed) => (
                                <Pressable
                                    key={speed}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setPlaybackSpeed(speed);
                                    }}
                                    style={[
                                        styles.speedChip,
                                        playbackSpeed === speed && styles.speedChipActive
                                    ]}
                                >
                                    <Text style={[styles.speedChipText, playbackSpeed === speed && { color: '#fff' }]}>
                                        {speed}x
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Audio Component (Special Speed Support) */}
                <View style={styles.audioWrapper}>
                    <Pressable
                        onPress={() => setShowAudio(!showAudio)}
                        style={[styles.playBigButton, showAudio && styles.playBigButtonActive]}
                    >
                        <Volume2 size={24} color={showAudio ? '#fff' : Colors.primary} />
                        <Text style={[styles.playBigText, showAudio && { color: '#fff' }]}>استماع للآية</Text>
                    </Pressable>

                    {showAudio && (
                        <View style={styles.audioContainer}>
                            <AudioPlayer ayahNumber={globalAyahNumber} initialSpeed={playbackSpeed} reciterId={activeReciter} />
                        </View>
                    )}
                </View>

                {/* Tafsir View */}
                <View style={[styles.tafsirCard, { backgroundColor: activeTheme.colors.card, borderColor: activeTheme.colors.border }]}>
                    <View style={styles.tafsirHeader}>
                        <Text style={[styles.tafsirTitle, { color: activeTheme.colors.text }]}>تفسير الآية</Text>
                        <View style={styles.tafsirBadge}>
                            <Text style={styles.tafsirIdText}>{TAFSIRS.find(t => t.id === tafsirId)?.name}</Text>
                        </View>
                    </View>

                    {loadingTafsir ? (
                        <ActivityIndicator style={{ padding: 40 }} color={Colors.primary} />
                    ) : (
                        <Text style={[styles.tafsirText, { color: activeTheme.colors.text, opacity: 0.8 }]}>
                            {tafsir}
                        </Text>
                    )}
                </View>

                {/* Footer Controls (Next/Prev) */}
                <View style={styles.navigationRow}>
                    <Pressable onPress={navigateToNext} style={styles.navButton}>
                        <ChevronRight size={24} color={Colors.primary} />
                        <Text style={styles.navText}>الآية التالية</Text>
                    </Pressable>

                    <Pressable onPress={handleBookmarkToggle} style={styles.navBookmark}>
                        <Heart size={20} color={bookmarked ? Colors.primary : Colors.text.tertiary} fill={bookmarked ? Colors.primary : 'none'} />
                    </Pressable>

                    <Pressable onPress={navigateToPrev} style={styles.navButton}>
                        <Text style={styles.navText}>الآية السابقة</Text>
                        <ChevronLeft size={24} color={Colors.primary} />
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: Typography.fontFamily.amiriBold,
    },
    headerSubtitle: {
        fontSize: 12,
        color: Colors.text.tertiary,
        fontFamily: Typography.fontFamily.amiriRegular,
    },
    headerAction: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: 40,
    },
    decorativeTop: {
        alignItems: 'center',
        marginVertical: Spacing.md,
    },
    ayahNumberBadge: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(212, 175, 55, 0.05)',
    },
    ayahNumberText: {
        fontFamily: Typography.fontFamily.amiriBold,
        fontSize: 18,
    },
    ayahCard: {
        borderRadius: BorderRadius['2xl'],
        padding: Spacing.xl,
        borderWidth: 1,
        ...Shadows.md,
        marginBottom: Spacing.xl,
    },
    ayahText: {
        fontFamily: Typography.fontFamily.amiriRegular,
        textAlign: 'center',
        lineHeight: 52,
        writingDirection: 'rtl',
    },
    transliterationBox: {
        marginTop: Spacing.lg,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    transliterationText: {
        fontStyle: 'italic',
        textAlign: 'center',
        fontSize: 14,
        color: Colors.text.tertiary,
    },
    hub: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        gap: Spacing.lg,
        ...Shadows.sm,
    },
    hubTitle: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
        textAlign: 'right',
        opacity: 0.6,
    },
    hubRow: {
        flexDirection: 'row-reverse',
        gap: Spacing.md,
    },
    hubItem: {
        flex: 1,
        gap: Spacing.sm,
    },
    hubIconLabel: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    hubLabel: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.secondary,
    },
    toggleItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.borderLight,
        borderRadius: BorderRadius.lg,
        padding: 8,
        height: 44,
        alignSelf: 'center',
    },
    toggleItemActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    toggleItemText: {
        color: Colors.primary,
    },
    toggleItemTextActive: {
        color: '#fff',
    },
    fontControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        padding: 4,
        height: 44,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    fontButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fontButtonText: {
        fontWeight: 'bold',
        color: Colors.primary,
    },
    fontVal: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    themeScroll: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 8,
    },
    themeChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
    },
    themeChipActive: {
        borderColor: Colors.primary,
    },
    themeChipText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    speedScroll: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 8,
    },
    speedChip: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    speedChipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    speedChipText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    audioWrapper: {
        marginBottom: Spacing.xl,
    },
    playBigButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary,
        ...Shadows.sm,
    },
    playBigButtonActive: {
        backgroundColor: Colors.primary,
    },
    playBigText: {
        fontSize: 16,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
    },
    audioContainer: {
        marginTop: Spacing.md,
    },
    tafsirCard: {
        borderRadius: BorderRadius['2xl'],
        padding: Spacing.xl,
        borderWidth: 1,
        ...Shadows.md,
    },
    tafsirHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 8,
    },
    tafsirTitle: {
        fontSize: 18,
        fontFamily: Typography.fontFamily.amiriBold,
    },
    tafsirBadge: {
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tafsirIdText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    tafsirText: {
        fontFamily: Typography.fontFamily.amiriRegular,
        fontSize: 17,
        lineHeight: 32,
        textAlign: 'justify',
        writingDirection: 'rtl',
    },
    navigationRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing['2xl'],
        paddingTop: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
    },
    navButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    navText: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
    },
    navBookmark: {
        padding: 12,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
        ...Shadows.sm,
    }
});

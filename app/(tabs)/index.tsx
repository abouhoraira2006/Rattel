import SurahCard from '@/components/SurahCard';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { fetchSurahList, fetchSurahPage, getDailyAyah, normalizeArabic } from '@/services/api';
import { getLastRead, getReadingProgress, setLastRead } from '@/utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpenCheck, Search, TrendingUp } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface Surah {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    revelationType: string;
    numberOfAyahs: number;
}

interface LastRead {
    surahNumber: number;
    ayahNumber: number;
    pageNumber?: number;
}

interface DailyAyah {
    number: number;
    text: string;
    surah: {
        number: number;
        name: string;
        englishName: string;
    };
    numberInSurah: number;
}

export default function HomeScreen() {
    const router = useRouter();
    const [surahs, setSurahs] = useState<Surah[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastRead, setLastReadState] = useState<LastRead | null>(null);
    const [progress, setProgress] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSurahs = useMemo(() => {
        if (!searchQuery) return surahs;
        const normalizedQuery = normalizeArabic(searchQuery);
        return surahs.filter(s =>
            normalizeArabic(s.name).includes(normalizedQuery) ||
            s.englishName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [surahs, searchQuery]);

    const loadData = async () => {
        try {
            const [surahList, lastReadData, progressData, ayah] = await Promise.all([
                fetchSurahList(),
                getLastRead(),
                getReadingProgress(),
                getDailyAyah(),
            ]);

            setSurahs(surahList);
            setLastReadState(lastReadData || { surahNumber: 1, ayahNumber: 1 });
            setProgress(progressData);

            // If no last read, set default to Al-Fatihah
            if (!lastReadData) {
                await setLastRead(1, 1);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleSurahPress = async (surahNumber: number) => {
        try {
            const startPage = await fetchSurahPage(surahNumber);
            router.push({
                pathname: "/(reading)/[surahId]" as any,
                params: { surahId: surahNumber.toString(), page: startPage.toString() }
            });
        } catch (error) {
            router.push({
                pathname: "/(reading)/[surahId]" as any,
                params: { surahId: surahNumber.toString() }
            });
        }
    };

    const handleContinueReading = () => {
        if (lastRead) {
            router.push({
                pathname: "/(reading)/[surahId]" as any,
                params: { surahId: lastRead.surahNumber.toString(), page: (lastRead.pageNumber || 1).toString() }
            });
        }
    };


    const renderItem = useCallback(({ item, index }: { item: Surah, index: number }) => (
        <SurahCard
            key={item.number}
            number={item.number}
            name={item.name}
            englishName={item.englishName}
            englishNameTranslation={item.englishNameTranslation}
            numberOfAyahs={item.numberOfAyahs}
            revelationType={item.revelationType}
            onPress={() => handleSurahPress(item.number)}
            index={index}
        />
    ), [handleSurahPress]);

    const Header = useMemo(() => (
        <View style={styles.header}>
            {/* Continue Reading Card */}
            {lastRead && (
                <MotiView
                    from={{ opacity: 0, translateY: -20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{
                        type: 'timing',
                        duration: 600,
                        delay: 200,
                    }}
                >
                    <Pressable
                        onPress={handleContinueReading}
                        style={({ pressed }) => [
                            styles.heroCard,
                            pressed && styles.heroCardPressed,
                        ]}
                    >
                        <LinearGradient
                            colors={[Colors.primary, '#2D6A4F']}
                            style={styles.heroGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {/* Glass overlay */}
                            <View style={styles.glassOverlay}>
                                {/* Icon */}
                                <View style={styles.heroIcon}>
                                    <BookOpenCheck size={32} color={Colors.accent} strokeWidth={2} />
                                </View>

                                {/* Content */}
                                <View style={styles.heroContent}>
                                    <Text style={styles.heroLabel}>تابع القراءة</Text>
                                    <Text style={styles.heroSurah}>
                                        السورة {lastRead.surahNumber} · الآية {lastRead.ayahNumber}
                                    </Text>
                                    <Text style={styles.heroSubtext}>
                                        {surahs.find(s => s.number === lastRead.surahNumber)?.name || 'جاري التحميل...'}
                                    </Text>
                                    {lastRead.pageNumber && (
                                        <Text style={styles.heroPage}>
                                            صفحة {lastRead.pageNumber}
                                        </Text>
                                    )}

                                    {/* Progress Bar */}
                                    <View style={styles.progressContainer}>
                                        <View style={styles.progressBar}>
                                            <View style={[styles.progressFill, { width: `${progress}%` }]} />
                                        </View>
                                        <View style={styles.progressStats}>
                                            <TrendingUp size={14} color={Colors.accent} strokeWidth={2} />
                                            <Text style={styles.progressText}>{Math.round(progress)}% مكتمل</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </Pressable>
                </MotiView>
            )}

            {/* Surah search */}
            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Search size={20} color={Colors.text.tertiary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ابحث عن السورة..."
                        placeholderTextColor={Colors.text.tertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                </View>
            </View>

            {/* Section Title */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>جميع السور</Text>
                <Text style={styles.sectionSubtitle}>{filteredSurahs.length} سورة</Text>
            </View>
        </View>
    ), [lastRead, searchQuery, filteredSurahs.length, progress, surahs]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>جاري تحميل السور...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <FlatList
                data={filteredSurahs}
                renderItem={renderItem}
                keyExtractor={(item) => item.number.toString()}
                ListHeaderComponent={Header}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={Keyboard.dismiss}
                keyboardShouldPersistTaps="handled"
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    loadingText: {
        marginTop: Spacing.base,
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
    },
    listContent: {
        padding: Spacing.base,
        paddingBottom: Spacing['3xl'],
    },
    header: {
        marginBottom: Spacing.lg,
        gap: Spacing.base,
    },
    dailyAyahCard: {
        borderRadius: BorderRadius['2xl'],
        overflow: 'hidden',
        ...Shadows.lg,
    },
    dailyGradient: {
        padding: Spacing.lg,
    },
    dailyHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    dailyLabel: {
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriBold,
        color: '#8A6E1D',
    },
    dailyAyahText: {
        fontSize: Typography.fontSize.lg,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: '#1A1A1A',
        textAlign: 'center',
        writingDirection: 'rtl',
        lineHeight: 32,
        marginVertical: Spacing.sm,
    },
    dailyReference: {
        fontSize: Typography.fontSize.xs,
        fontFamily: Typography.fontFamily.amiriBold,
        color: '#8A6E1D',
        textAlign: 'left',
    },
    heroCard: {
        borderRadius: BorderRadius['2xl'],
        overflow: 'hidden',
        ...Shadows.xl,
    },
    heroCardPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    heroGradient: {
        padding: Spacing.lg,
    },
    glassOverlay: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        padding: Spacing.md,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContent: {
        flex: 1,
        marginRight: Spacing.lg,
        gap: 2,
    },
    heroLabel: {
        fontSize: Typography.fontSize.xs,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    heroSurah: {
        fontSize: Typography.fontSize.xl,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.inverse,
        textAlign: 'right',
    },
    heroSubtext: {
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'right',
    },
    heroPage: {
        fontSize: Typography.fontSize.xs,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.accent,
        textAlign: 'right',
    },
    progressContainer: {
        marginTop: Spacing.md,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.full,
    },
    progressStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    progressText: {
        fontSize: Typography.fontSize.xs,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.accent,
    },
    sectionHeader: {
        marginBottom: Spacing.base,
        marginTop: Spacing.base,
    },
    sectionTitle: {
        fontSize: Typography.fontSize['2xl'],
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
        marginBottom: Spacing.xs / 2,
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    sectionSubtitle: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
        textAlign: 'right',
    },
    searchSection: {
        marginVertical: Spacing.sm,
    },
    searchBar: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.md,
        height: 50,
        ...Shadows.sm,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    searchInput: {
        flex: 1,
        fontFamily: Typography.fontFamily.amiriRegular,
        fontSize: 16,
        color: Colors.text.primary,
        textAlign: 'right',
        marginRight: Spacing.sm,
    },
});

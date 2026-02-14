import SurahCard from '@/components/SurahCard';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { fetchSurahList, getDailyAyah } from '@/services/api';
import { getLastRead, getReadingProgress, setLastRead } from '@/utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpenCheck, Sparkles, TrendingUp } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
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
    const [dailyAyah, setDailyAyah] = useState<DailyAyah | null>(null);

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
            setDailyAyah(ayah);

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

    const handleSurahPress = (surahNumber: number) => {
        router.push(`/(reading)/${surahNumber}`);
    };

    const handleContinueReading = () => {
        if (lastRead) {
            router.push(`/(reading)/${lastRead.surahNumber}`);
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            {/* Daily Ayah Card */}
            {dailyAyah && (
                <MotiView
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        type: 'timing',
                        duration: 500,
                    }}
                >
                    <View style={styles.dailyAyahCard}>
                        <LinearGradient
                            colors={['#D4AF37', '#C5A028']}
                            style={styles.dailyGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.dailyHeader}>
                                <Sparkles size={24} color={Colors.primary} strokeWidth={2} />
                                <Text style={styles.dailyLabel}>آية اليوم</Text>
                            </View>
                            <Text style={styles.dailyAyahText} numberOfLines={3}>
                                {dailyAyah.text}
                            </Text>
                            <Text style={styles.dailyReference}>
                                {dailyAyah.surah.name} - {dailyAyah.numberInSurah}
                            </Text>
                        </LinearGradient>
                    </View>
                </MotiView>
            )}

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

            {/* Section Title */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>جميع السور</Text>
                <Text style={styles.sectionSubtitle}>114 سورة</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>جاري تحميل السور...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={surahs}
                renderItem={({ item, index }) => (
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
                )}
                keyExtractor={(item) => item.number.toString()}
                ListHeaderComponent={renderHeader}
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
            />
        </View>
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    dailyLabel: {
        fontSize: Typography.fontSize.lg,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
    },
    dailyAyahText: {
        fontSize: Typography.fontSize.xl,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.primary,
        textAlign: 'right',
        writingDirection: 'rtl',
        lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xl,
        marginBottom: Spacing.md,
    },
    dailyReference: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.primary,
        textAlign: 'right',
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
        padding: Spacing.xl,
    },
    glassOverlay: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        padding: Spacing.lg,
    },
    heroIcon: {
        width: 56,
        height: 56,
        borderRadius: BorderRadius.xl,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.base,
    },
    heroContent: {
        gap: Spacing.xs,
    },
    heroLabel: {
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    heroSurah: {
        fontSize: Typography.fontSize['2xl'],
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.inverse,
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    heroSubtext: {
        fontSize: Typography.fontSize.lg,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: 'rgba(255, 255, 255, 0.75)',
        marginBottom: Spacing.sm,
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    heroPage: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.accent,
        textAlign: 'right',
        marginBottom: Spacing.sm,
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
});

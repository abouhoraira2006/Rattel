import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { RECITERS } from '@/services/api';
import {
    calculateGlobalAyahNumber,
    calculateProgress,
    getNextAyah,
    isWithinRange,
} from '@/services/continuousPlayer';
import { SURAHS } from '@/services/quranData';
import {
    PlaybackRange,
    clearPlaybackProgress,
    getPlaybackProgress,
    getPlaybackRange,
    savePlaybackProgress,
    savePlaybackRange
} from '@/utils/playbackStorage';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pause, Play, RotateCcw, Settings, SkipForward } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ListenScreen() {
    const router = useRouter();
    const [reciterId, setReciterId] = useState('ar.alafasy');
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(false);

    // Gapless Players (Double-buffering)
    const playerA = useAudioPlayer();
    const playerB = useAudioPlayer();
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);

    const currentPlayer = activePlayerIndex === 0 ? playerA : playerB;
    const nextPlayer = activePlayerIndex === 0 ? playerB : playerA;

    // Playback state
    const [currentSurah, setCurrentSurah] = useState(1);
    const [currentAyah, setCurrentAyah] = useState(1);
    const [progress, setProgress] = useState(0);

    // Refs for playback logic (to avoid stale closures in callbacks)
    const currentSurahRef = useRef(1);
    const currentAyahRef = useRef(1);
    const reciterIdRef = useRef('ar.alafasy');
    const playbackRangeRef = useRef<PlaybackRange>({
        startSurah: 1,
        startAyah: 1,
        endSurah: 114,
        endAyah: 6,
    });
    const lastFinishedAyahRef = useRef<string>(''); // Format: "surah-ayah"
    const lastTransitionTimeRef = useRef<number>(0);
    const playerAPlayingKeyRef = useRef<string>('');
    const playerBPlayingKeyRef = useRef<string>('');
    const playerAHandledKeyRef = useRef<string>('');
    const playerBHandledKeyRef = useRef<string>('');
    const isTransitioningRef = useRef<boolean>(false);

    
    // Range selection state
    const [showRangeModal, setShowRangeModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');
    const [playbackRange, setPlaybackRange] = useState<PlaybackRange>(playbackRangeRef.current);

    // Track playback status for auto-next 
    const statusA = useAudioPlayerStatus(playerA);
    const statusB = useAudioPlayerStatus(playerB);
    const currentStatus = activePlayerIndex === 0 ? statusA : statusB;

    useEffect(() => {
        const currentKey = `${currentSurahRef.current}-${currentAyahRef.current}`;
        const activeKeyRef = activePlayerIndex === 0 ? playerAPlayingKeyRef : playerBPlayingKeyRef;
        const handledKeyRef = activePlayerIndex === 0 ? playerAHandledKeyRef : playerBHandledKeyRef;

        if (currentStatus.didJustFinish && isPlaying &&
            activeKeyRef.current === currentKey &&
            handledKeyRef.current !== currentKey) {

            console.log(`Transitioning: Player ${activePlayerIndex} finished ${currentKey}`);
            handledKeyRef.current = currentKey; // Mark this specific player/key pair as handled
            handleAyahFinished();
        }
    }, [currentStatus.didJustFinish, activePlayerIndex, isPlaying]);

    const handleAyahFinished = async () => {
        if (isTransitioningRef.current) {
            console.log('Transition already in progress, ignoring.');
            return;
        }
        isTransitioningRef.current = true;

        try {
            const now = Date.now();
            const currentKey = `${currentSurahRef.current}-${currentAyahRef.current}`;
            console.log(`Processing finish for: ${currentKey}`);

            // 1. Explicitly stop the player that just finished
            const finishedPlayer = activePlayerIndex === 0 ? playerA : playerB;
            finishedPlayer.pause();
            finishedPlayer.seekTo(0);

            const next = getNextAyah(currentSurahRef.current, currentAyahRef.current);

            if (!next || !isWithinRange(next.surah, next.ayah, playbackRangeRef.current)) {
                console.log('End of range reached.');
                setIsPlaying(false);
                return;
            }

            console.log(`Moving to: ${next.surah}:${next.ayah}`);
            lastTransitionTimeRef.current = now;
            lastFinishedAyahRef.current = currentKey;

            // 2. Clear current player key to prevent re-triggering
            if (activePlayerIndex === 0) playerAPlayingKeyRef.current = 'IDLE';
            else playerBPlayingKeyRef.current = 'IDLE';

            // 3. Prepare new state
            const newIndex = 1 - activePlayerIndex;
            const newAyahKey = `${next.surah}-${next.ayah}`;

            // Update refs BEFORE starting next player
            currentSurahRef.current = next.surah;
            currentAyahRef.current = next.ayah;

            if (newIndex === 0) playerAPlayingKeyRef.current = newAyahKey;
            else playerBPlayingKeyRef.current = newAyahKey;

            // 4. Switch and Play
            setActivePlayerIndex(newIndex);
            const playerToStart = newIndex === 0 ? playerA : playerB;
            playerToStart.play();

            // 5. Update UI
            setCurrentSurah(next.surah);
            setCurrentAyah(next.ayah);

            // 6. Persistence
            await savePlaybackProgress({
                currentSurah: next.surah,
                currentAyah: next.ayah,
                globalAyahNumber: calculateGlobalAyahNumber(next.surah, next.ayah),
            });

            // 7. Pre-load next
            prepareNextAyah(next.surah, next.ayah, newIndex);

        } finally {
            // Short delay to allow audio state pulses to clear
            setTimeout(() => {
                isTransitioningRef.current = false;
            }, 300);
        }
    };

    // Update progress periodically
    useEffect(() => {
        if (isPlaying && currentPlayer.duration > 0) {
            const interval = setInterval(() => {
                const prog = calculateProgress(currentSurahRef.current, currentAyahRef.current, playbackRangeRef.current);
                setProgress(prog);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isPlaying, activePlayerIndex]);

    // Load saved progress on mount
    useEffect(() => {
        loadSavedProgress();
        return () => {
            playerA.remove();
            playerB.remove();
        };
    }, []);

    const loadSavedProgress = async () => {
        const savedProgress = await getPlaybackProgress();
        const savedRange = await getPlaybackRange();

        if (savedRange) {
            setPlaybackRange(savedRange);
            playbackRangeRef.current = savedRange;
        }

        if (savedProgress) {
            const s = savedProgress.currentSurah;
            const a = savedProgress.currentAyah;
            setCurrentSurah(s);
            setCurrentAyah(a);
            currentSurahRef.current = s;
            currentAyahRef.current = a;
        }
    };

    const playAyah = async (surahNumber?: number, ayahNumber?: number) => {
        const sNum = surahNumber ?? currentSurahRef.current;
        const aNum = ayahNumber ?? currentAyahRef.current;

        try {
            setLoading(true);

            const audioUrl = `https://cdn.islamic.network/quran/audio/128/${reciterIdRef.current}/${calculateGlobalAyahNumber(sNum, aNum)}.mp3`;
            const ayahKey = `${sNum}-${aNum}`;

            // Replace current player source and mark what it's playing
            if (activePlayerIndex === 0) {
                playerAPlayingKeyRef.current = ayahKey;
                playerAHandledKeyRef.current = ''; // Reset handled status for this player to allow finish event
            } else {
                playerBPlayingKeyRef.current = ayahKey;
                playerBHandledKeyRef.current = '';
            }

            currentPlayer.replace(audioUrl);
            currentPlayer.play();

            // Update state for UI
            setCurrentSurah(sNum);
            setCurrentAyah(aNum);

            // Update refs for logic
            currentSurahRef.current = sNum;
            currentAyahRef.current = aNum;
            lastTransitionTimeRef.current = 0; // Reset guard for manual actions

            setIsPlaying(true);

            // Save progress
            await savePlaybackProgress({
                currentSurah: sNum,
                currentAyah: aNum,
                globalAyahNumber: calculateGlobalAyahNumber(sNum, aNum),
            });

            // Update progress percentage
            const progressPercent = calculateProgress(sNum, aNum, playbackRangeRef.current);
            setProgress(progressPercent);

            // Pre-load next ayah into nextPlayer
            prepareNextAyah(sNum, aNum);

        } catch (error) {
            console.error('Error playing ayah:', error);
        } finally {
            setLoading(false);
        }
    };

    const prepareNextAyah = (sNum: number, aNum: number, overrideActiveIndex?: number) => {
        const next = getNextAyah(sNum, aNum);
        const activeIdx = overrideActiveIndex ?? activePlayerIndex;

        if (next && isWithinRange(next.surah, next.ayah, playbackRangeRef.current)) {
            const nextUrl = `https://cdn.islamic.network/quran/audio/128/${reciterIdRef.current}/${calculateGlobalAyahNumber(next.surah, next.ayah)}.mp3`;
            const nextKey = `${next.surah}-${next.ayah}`;
            console.log(`Pre-loading: ${nextUrl} for player ${1 - activeIdx}`);

            // Mark what the next player will be responsible for
            if (activeIdx === 0) {
                playerBPlayingKeyRef.current = nextKey;
                playerBHandledKeyRef.current = '';
                playerB.replace(nextUrl);
            } else {
                playerAPlayingKeyRef.current = nextKey;
                playerAHandledKeyRef.current = '';
                playerA.replace(nextUrl);
            }
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.error) {
            console.error(`Playback error: ${status.error}`);
        }
    };

    const playNextAyah = async () => {
        await handleAyahFinished();
    };

    const handlePlayPause = async () => {
        if (isPlaying) {
            currentPlayer.pause();
            setIsPlaying(false);
        } else {
            // If not playing, we check if we should trigger playAyah or just resume
            const isFirstPlay = !currentPlayer.playing && !loading;
            if (isFirstPlay) {
                await playAyah(currentSurah, currentAyah);
            } else {
                currentPlayer.play();
                setIsPlaying(true);
            }
        }
    };

    const handleSkip = async () => {
        await playNextAyah();
    };

    const handleReset = async () => {
        await clearPlaybackProgress();
        const startS = playbackRangeRef.current.startSurah;
        const startA = playbackRangeRef.current.startAyah;

        setCurrentSurah(startS);
        setCurrentAyah(startA);
        currentSurahRef.current = startS;
        currentAyahRef.current = startA;

        setProgress(0);
        playerA.pause();
        playerB.pause();
        playerA.seekTo(0);
        playerB.seekTo(0);
        setIsPlaying(false);
    };

    const getCurrentSurahName = () => {
        const surah = SURAHS.find((s: any) => s.number === currentSurah);
        return surah?.arabicName || '';
    };

    const getReciterName = () => {
        const reciter = RECITERS.find(r => r.id === reciterId);
        return reciter?.name || '';
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>الاستماع المتواصل</Text>
                    <Text style={styles.subtitle}>استمع للقرآن الكريم كاملاً</Text>
                </View>

                {/* Current Playback Info */}
                <View style={styles.playbackCard}>
                    <View style={styles.playbackInfo}>
                        <Text style={styles.surahName}>{getCurrentSurahName()}</Text>
                        <Text style={styles.ayahNumber}>الآية {currentAyah}</Text>
                    </View>

                    <View style={styles.reciterInfo}>
                        <Text style={styles.reciterLabel}>القارئ:</Text>
                        <Text style={styles.reciterName}>{getReciterName()}</Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                    </View>
                </View>

                {/* Playback Controls */}
                <View style={styles.controlsCard}>
                    <Pressable
                        onPress={handleReset}
                        style={styles.controlButton}
                        disabled={loading}
                    >
                        <RotateCcw size={24} color={Colors.text.secondary} />
                        <Text style={styles.controlButtonText}>إعادة</Text>
                    </Pressable>

                    <Pressable
                        onPress={handlePlayPause}
                        style={[styles.controlButton, styles.playButton]}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={Colors.text.inverse} />
                        ) : isPlaying ? (
                            <Pause size={32} color={Colors.text.inverse} fill={Colors.text.inverse} />
                        ) : (
                            <Play size={32} color={Colors.text.inverse} fill={Colors.text.inverse} />
                        )}
                    </Pressable>

                    <Pressable
                        onPress={handleSkip}
                        style={styles.controlButton}
                        disabled={loading || !isPlaying}
                    >
                        <SkipForward size={24} color={Colors.text.secondary} />
                        <Text style={styles.controlButtonText}>التالي</Text>
                    </Pressable>
                </View>

                {/* Settings Section */}
                <View style={styles.settingsCard}>
                    <Text style={styles.sectionTitle}>الإعدادات</Text>

                    {/* Reciter Selection */}
                    <View style={styles.settingItem}>
                        <Text style={styles.settingLabel}>اختر القارئ</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recitersScroll}>
                            {RECITERS.map((r) => (
                                <Pressable
                                    key={r.id}
                                    onPress={() => {
                                        setReciterId(r.id);
                                        reciterIdRef.current = r.id;
                                    }}
                                    style={[
                                        styles.reciterChip,
                                        reciterId === r.id && styles.reciterChipActive
                                    ]}
                                >
                                    <Text style={[
                                        styles.reciterChipText,
                                        reciterId === r.id && styles.reciterChipTextActive
                                    ]}>
                                        {r.name}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Range Selection */}
                    <Pressable
                        onPress={() => setShowRangeModal(true)}
                        style={styles.settingItem}
                    >
                        <Text style={styles.settingLabel}>نطاق القراءة</Text>
                        <View style={styles.rangeDisplay}>
                            <Text style={styles.rangeText}>
                                من {SURAHS.find((s: any) => s.number === playbackRange.startSurah)?.arabicName} ({playbackRange.startAyah})
                            </Text>
                            <Text style={styles.rangeText}>
                                إلى {SURAHS.find((s: any) => s.number === playbackRange.endSurah)?.arabicName} ({playbackRange.endAyah})
                            </Text>
                        </View>
                        <Settings size={20} color={Colors.primary} />
                    </Pressable>
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoText}>
                        💡 سيتم حفظ تقدمك تلقائياً. يمكنك المتابعة من حيث توقفت في أي وقت.
                    </Text>
                </View>
            </ScrollView>

            {/* Range Selection Modal */}
            <Modal
                visible={showRangeModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowRangeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>تحديد النطاق</Text>
                            <Pressable onPress={() => setShowRangeModal(false)} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseText}>إغلاق</Text>
                            </Pressable>
                        </View>

                        {/* Top Tabs */}
                        <View style={styles.tabContainer}>
                            <Pressable
                                onPress={() => setActiveTab('start')}
                                style={[styles.tab, activeTab === 'start' && styles.tabActive]}
                            >
                                <Text style={[styles.tabText, activeTab === 'start' && styles.tabTextActive]}>البداية</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setActiveTab('end')}
                                style={[styles.tab, activeTab === 'end' && styles.tabActive]}
                            >
                                <Text style={[styles.tabText, activeTab === 'end' && styles.tabTextActive]}>النهاية</Text>
                            </Pressable>
                        </View>

                        <View style={styles.pickersWrapper}>
                            {/* Surah List */}
                            <View style={styles.pickerCol}>
                                <Text style={styles.pickerColTitle}>السورة</Text>
                                <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerList}>
                                    {SURAHS.map((s: any) => (
                                        <Pressable
                                            key={s.number}
                                            onPress={() => {
                                                const key = activeTab === 'start' ? 'startSurah' : 'endSurah';
                                                const ayahKey = activeTab === 'start' ? 'startAyah' : 'endAyah';
                                                setPlaybackRange(prev => ({ ...prev, [key]: s.number, [ayahKey]: 1 }));
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                            style={[
                                                styles.pickerChip,
                                                (activeTab === 'start' ? playbackRange.startSurah : playbackRange.endSurah) === s.number && styles.pickerChipActive
                                            ]}
                                        >
                                            <Text style={[
                                                styles.pickerChipText,
                                                (activeTab === 'start' ? playbackRange.startSurah : playbackRange.endSurah) === s.number && styles.pickerChipTextActive
                                            ]}>{s.arabicName}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Ayah List */}
                            <View style={[styles.pickerCol, { flex: 0.6 }]}>
                                <Text style={styles.pickerColTitle}>الآية</Text>
                                <ScrollView showsVerticalScrollIndicator={false} style={styles.pickerList}>
                                    {Array.from({
                                        length: (SURAHS.find((s: any) => s.number === (activeTab === 'start' ? playbackRange.startSurah : playbackRange.endSurah))?.numberOfAyahs || 7) + (([1, 9].includes(activeTab === 'start' ? playbackRange.startSurah : playbackRange.endSurah)) ? 0 : 1)
                                    }).map((_, i) => {
                                        const surahNum = activeTab === 'start' ? playbackRange.startSurah : playbackRange.endSurah;
                                        const hasBasmala = ![1, 9].includes(surahNum);
                                        const displayAyah = hasBasmala ? i : i + 1;

                                        return (
                                            <Pressable
                                                key={displayAyah}
                                                onPress={() => {
                                                    const key = activeTab === 'start' ? 'startAyah' : 'endAyah';
                                                    setPlaybackRange(prev => ({ ...prev, [key]: displayAyah }));
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                }}
                                                style={[
                                                    styles.pickerChip,
                                                    (activeTab === 'start' ? playbackRange.startAyah : playbackRange.endAyah) === displayAyah && styles.pickerChipActive
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.pickerChipText,
                                                    (activeTab === 'start' ? playbackRange.startAyah : playbackRange.endAyah) === displayAyah && styles.pickerChipTextActive
                                                ]}>
                                                    {displayAyah === 0 ? 'البسملة' : displayAyah}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </View>

                        <View style={styles.modalFooter}>
                            <View style={styles.summaryBox}>
                                <Text style={styles.summaryText}>
                                    نطاقك الحالي: من آية {playbackRange.startAyah} بسورة {SURAHS.find((s: any) => s.number === playbackRange.startSurah)?.arabicName} حتى آية {playbackRange.endAyah} بسورة {SURAHS.find((s: any) => s.number === playbackRange.endSurah)?.arabicName}
                                </Text>
                            </View>
                            <Pressable
                                onPress={async () => {
                                    await savePlaybackRange(playbackRange);
                                    playbackRangeRef.current = playbackRange;
                                    setShowRangeModal(false);
                                    // Automatically move to the new start point and play
                                    await playAyah(playbackRange.startSurah, playbackRange.startAyah);
                                }}
                                style={styles.saveBtn}
                            >
                                <Text style={styles.saveBtnText}>تطبيق النطاق الجديد</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
        gap: Spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: Typography.fontSize['2xl'],
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.primary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.tertiary,
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
    playbackCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        gap: Spacing.md,
    },
    playbackInfo: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    surahName: {
        fontSize: Typography.fontSize.xl,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
        textAlign: 'center',
    },
    ayahNumber: {
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
        textAlign: 'center',
    },
    reciterInfo: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    reciterLabel: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.tertiary,
    },
    reciterName: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.secondary,
    },
    progressContainer: {
        gap: Spacing.xs,
    },
    progressBar: {
        height: 8,
        backgroundColor: Colors.borderLight,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
    },
    progressText: {
        fontSize: Typography.fontSize.xs,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.tertiary,
        textAlign: 'center',
    },
    controlsCard: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.xl,
        padding: Spacing.lg,
    },
    controlButton: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    playButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlButtonText: {
        fontSize: Typography.fontSize.xs,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
    },
    settingsCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        gap: Spacing.md,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.lg,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.primary,
        textAlign: 'right',
    },
    settingItem: {
        gap: Spacing.sm,
    },
    settingLabel: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.secondary,
        textAlign: 'right',
    },
    recitersScroll: {
        flexDirection: 'row',
    },
    reciterChip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        marginRight: Spacing.sm,
    },
    reciterChipActive: {
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        borderColor: Colors.primary,
    },
    reciterChipText: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
    },
    reciterChipTextActive: {
        color: Colors.primary,
        fontFamily: Typography.fontFamily.amiriBold,
    },
    rangeDisplay: {
        gap: Spacing.xs,
    },
    rangeText: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.tertiary,
        textAlign: 'right',
    },
    infoCard: {
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.3)',
    },
    infoText: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
        textAlign: 'right',
        lineHeight: 22,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: BorderRadius['3xl'],
        borderTopRightRadius: BorderRadius['3xl'],
        height: '80%',
        padding: Spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalCloseText: {
        fontSize: 14,
        color: Colors.text.tertiary,
    },
    tabContainer: {
        flexDirection: 'row-reverse',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: 4,
        marginBottom: Spacing.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
    },
    tabActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.secondary,
    },
    tabTextActive: {
        color: '#fff',
    },
    pickersWrapper: {
        flex: 1,
        flexDirection: 'row-reverse',
        gap: Spacing.md,
    },
    pickerCol: {
        flex: 1,
        gap: Spacing.sm,
    },
    pickerColTitle: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.tertiary,
        textAlign: 'center',
    },
    pickerList: {
        flex: 1,
    },
    pickerChip: {
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        marginBottom: 8,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    pickerChipActive: {
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderColor: Colors.primary,
    },
    pickerChipText: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.secondary,
    },
    pickerChipTextActive: {
        color: Colors.primary,
    },
    modalFooter: {
        paddingTop: Spacing.xl,
        gap: Spacing.lg,
    },
    summaryBox: {
        backgroundColor: Colors.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    summaryText: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    saveBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        ...Shadows.md,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Typography.fontFamily.amiriBold,
    },
});

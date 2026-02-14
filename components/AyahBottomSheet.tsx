import AudioPlayer from '@/components/AudioPlayer';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { fetchTafsirMuyassar, getAyahAudioUrl } from '@/services/api';
import { shareAyahText } from '@/utils/share';
import { addBookmark, isBookmarked, removeBookmark } from '@/utils/storage';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Heart, Share2, Volume2, X } from 'lucide-react-native';
import { forwardRef, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface Ayah {
    number: number;
    numberInSurah: number;
    text: string;
}

interface AyahBottomSheetProps {
    ayah: Ayah;
    surahNumber: number;
    surahName: string;
    onClose: () => void;
}

const AyahBottomSheet = forwardRef<BottomSheet, AyahBottomSheetProps>(
    ({ ayah, surahNumber, surahName, onClose }, ref) => {
        const [tafsir, setTafsir] = useState<string>('');
        const [loadingTafsir, setLoadingTafsir] = useState(true);
        const [bookmarked, setBookmarked] = useState(false);
        const [showAudio, setShowAudio] = useState(false);

        const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);
        const audioUrl = useMemo(() => getAyahAudioUrl(ayah.number), [ayah.number]);

        useEffect(() => {
            loadTafsir();
            checkBookmarkStatus();
        }, [ayah.number]);

        const loadTafsir = async () => {
            try {
                setLoadingTafsir(true);
                const tafsirText = await fetchTafsirMuyassar(surahNumber, ayah.numberInSurah);
                setTafsir(tafsirText);
            } catch (error) {
                console.error('Error loading Tafsir:', error);
                setTafsir('التفسير غير متوفر لهذه الآية');
            } finally {
                setLoadingTafsir(false);
            }
        };

        const checkBookmarkStatus = async () => {
            const status = await isBookmarked(surahNumber, ayah.numberInSurah);
            setBookmarked(status);
        };

        const handleBookmarkToggle = async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            if (bookmarked) {
                await removeBookmark(surahNumber, ayah.numberInSurah);
                setBookmarked(false);
            } else {
                await addBookmark(surahNumber, ayah.numberInSurah, ayah.text, surahName);
                setBookmarked(true);
            }
        };

        const handleShare = async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await shareAyahText(ayah.text, surahName, surahNumber, ayah.numberInSurah);
        };

        const handleAudioToggle = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAudio(!showAudio);
        };

        const renderBackdrop = (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        );

        return (
            <BottomSheet
                ref={ref}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={styles.handleIndicator}
            >
                <BottomSheetView style={styles.contentContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={Colors.text.primary} strokeWidth={2} />
                        </Pressable>
                        <Text style={styles.headerTitle}>
                            {surahName} - {ayah.numberInSurah}
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                    >
                        {/* Ayah Number Display */}
                        <View style={styles.ayahNumberDisplay}>
                            <Text style={styles.ayahSymbolDecoration}>۞</Text>
                            <View style={styles.ayahNumberContainer}>
                                <Text style={styles.ayahNumberText}>
                                    {convertToArabicNumerals(ayah.numberInSurah)}
                                </Text>
                            </View>
                        </View>

                        {/* Ayah Text */}
                        <View style={styles.ayahSection}>
                            <Text style={styles.ayahText}>{ayah.text}</Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionsRow}>
                            <Pressable
                                onPress={handleBookmarkToggle}
                                style={({ pressed }) => [
                                    styles.actionButton,
                                    bookmarked && styles.actionButtonActive,
                                    pressed && styles.actionButtonPressed,
                                ]}
                            >
                                <Heart
                                    size={20}
                                    color={bookmarked ? Colors.text.inverse : Colors.primary}
                                    strokeWidth={2}
                                    fill={bookmarked ? Colors.primary : 'none'}
                                />
                                <Text
                                    style={[
                                        styles.actionButtonText,
                                        bookmarked && styles.actionButtonTextActive,
                                    ]}
                                >
                                    {bookmarked ? 'محفوظة' : 'حفظ'}
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={handleAudioToggle}
                                style={({ pressed }) => [
                                    styles.actionButton,
                                    showAudio && styles.actionButtonActive,
                                    pressed && styles.actionButtonPressed,
                                ]}
                            >
                                <Volume2
                                    size={20}
                                    color={showAudio ? Colors.text.inverse : Colors.primary}
                                    strokeWidth={2}
                                />
                                <Text
                                    style={[
                                        styles.actionButtonText,
                                        showAudio && styles.actionButtonTextActive,
                                    ]}
                                >
                                    استماع
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={handleShare}
                                style={({ pressed }) => [
                                    styles.actionButton,
                                    pressed && styles.actionButtonPressed,
                                ]}
                            >
                                <Share2 size={20} color={Colors.primary} strokeWidth={2} />
                                <Text style={styles.actionButtonText}>مشاركة</Text>
                            </Pressable>
                        </View>

                        {/* Audio Player */}
                        {showAudio && (
                            <View style={styles.audioSection}>
                                <AudioPlayer audioUrl={audioUrl} />
                            </View>
                        )}

                        {/* Tafsir Section */}
                        <View style={styles.tafsirSection}>
                            <Text style={styles.sectionTitle}>التفسير الميسّر</Text>
                            {loadingTafsir ? (
                                <View style={styles.tafsirLoading}>
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                    <Text style={styles.tafsirLoadingText}>جاري تحميل التفسير...</Text>
                                </View>
                            ) : (
                                <Text style={styles.tafsirText}>{tafsir}</Text>
                            )}
                        </View>
                    </ScrollView>
                </BottomSheetView>
            </BottomSheet>
        );
    }
);

const convertToArabicNumerals = (num: number): string => {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
};

AyahBottomSheet.displayName = 'AyahBottomSheet';

export default AyahBottomSheet;

const styles = StyleSheet.create({
    bottomSheetBackground: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: BorderRadius['2xl'],
        borderTopRightRadius: BorderRadius['2xl'],
    },
    handleIndicator: {
        backgroundColor: Colors.text.tertiary,
        width: 40,
        height: 4,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: Spacing.base,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    closeButton: {
        padding: Spacing.sm,
    },
    headerTitle: {
        fontSize: Typography.fontSize.lg,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Spacing['3xl'],
    },
    ayahNumberDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    ayahSymbolDecoration: {
        fontSize: 28,
        color: Colors.accent,
        fontFamily: Typography.fontFamily.amiriRegular,
    },
    ayahNumberContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: Colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FCFAF5',
    },
    ayahNumberText: {
        fontSize: Typography.fontSize.xl,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
        marginBottom: 4, // Visual adjustment for Amiri font
    },
    ayahSection: {
        paddingVertical: Spacing.lg,
    },
    ayahText: {
        fontSize: Typography.fontSize['2xl'],
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.primary,
        textAlign: 'right',
        writingDirection: 'rtl',
        lineHeight: Typography.lineHeight.loose * Typography.fontSize['2xl'],
    },
    actionsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary,
        ...Shadows.sm,
    },
    actionButtonActive: {
        backgroundColor: Colors.primary,
    },
    actionButtonPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.97 }],
    },
    actionButtonText: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
    },
    actionButtonTextActive: {
        color: Colors.text.inverse,
    },
    audioSection: {
        marginBottom: Spacing.lg,
    },
    tafsirSection: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    sectionTitle: {
        fontSize: Typography.fontSize.lg,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
        marginBottom: Spacing.md,
        textAlign: 'right',
    },
    tafsirLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.lg,
    },
    tafsirLoadingText: {
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
    },
    tafsirText: {
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.primary,
        textAlign: 'right',
        writingDirection: 'rtl',
        lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    },
});

import AyahBottomSheet from '@/components/AyahBottomSheet';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { fetchPageAyahs } from '@/services/api';
import { getLastRead, setLastRead } from '@/utils/storage';
import BottomSheet from '@gorhom/bottom-sheet';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    ViewToken,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_PAGES = 604;

interface Ayah {
    number: number;
    numberInSurah: number;
    text: string;
    surah: {
        number: number;
        name: string;
        englishName: string;
    };
    page: number;
}

interface PageData {
    pageNumber: number;
    ayahs: Ayah[];
}

export default function ReadingScreen() {
    const router = useRouter();
    const { surahId } = useLocalSearchParams<{ surahId: string }>();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const flatListRef = useRef<FlatList>(null);

    // Hide header
    useEffect(() => {
        router.setParams({});
    }, []);

    const [loading, setLoading] = useState(true);
    const [pages, setPages] = useState<PageData[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedAyah, setSelectedAyah] = useState<Ayah | null>(null);
    const [surahName, setSurahName] = useState('');

    useEffect(() => {
        initializeReading();
    }, [surahId]);

    const initializeReading = async () => {
        try {
            setLoading(true);

            const lastRead = await getLastRead();
            let startPage = 1;

            if (lastRead && lastRead.surahNumber === parseInt(surahId)) {
                startPage = lastRead.pageNumber || 1;
            } else {
                startPage = getStartPageForSurah(parseInt(surahId));
            }

            await loadPagesAround(startPage);
            setCurrentPage(startPage);

            setTimeout(() => {
                scrollToPage(startPage);
            }, 100);

        } catch (error) {
            console.error('Error initializing reading:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPagesAround = async (pageNum: number) => {
        try {
            const range = new Set([
                Math.max(1, pageNum - 1),
                pageNum,
                Math.min(TOTAL_PAGES, pageNum + 1),
            ]);
            const pagesToLoad = Array.from(range).sort((a, b) => a - b);

            const pagePromises = pagesToLoad.map(async (pNum) => {
                const data = await fetchPageAyahs(pNum);
                return {
                    pageNumber: pNum,
                    ayahs: data.ayahs || [],
                };
            });

            const loadedPages = await Promise.all(pagePromises);
            setPages(loadedPages);

            // Set surah name from first ayah
            if (loadedPages[0]?.ayahs?.[0]) {
                setSurahName(loadedPages[0].ayahs[0].surah.name);
            }
        } catch (error) {
            console.error('Error loading pages:', error);
        }
    };

    const getStartPageForSurah = (surahNumber: number): number => {
        const surahStartPages: { [key: number]: number } = {
            1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151,
        };
        return surahStartPages[surahNumber] || 1;
    };

    const scrollToPage = (pageNum: number) => {
        const index = pages.findIndex(p => p.pageNumber === pageNum);
        if (index !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index, animated: false });
        }
    };

    const handleAyahPress = async (ayah: Ayah) => {
        setSelectedAyah(ayah);
        bottomSheetRef.current?.expand();
        await setLastRead(ayah.surah.number, ayah.numberInSurah, ayah.page);
    };

    const handleClose = () => {
        bottomSheetRef.current?.close();
        setSelectedAyah(null);
    };

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const visiblePage = viewableItems[0].item as PageData;
            setCurrentPage(visiblePage.pageNumber);

            if (visiblePage.ayahs.length > 0) {
                const firstAyah = visiblePage.ayahs[0];
                setLastRead(
                    firstAyah.surah.number,
                    firstAyah.numberInSurah,
                    visiblePage.pageNumber
                );
            }
        }
    }, []);

    const convertToArabicNumerals = (num: number): string => {
        const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)]).join('');
    };

    const renderPage = ({ item }: { item: PageData }) => {
        const isFirstAyahOfSurah = item.ayahs[0]?.numberInSurah === 1;
        const surahNumber = item.ayahs[0]?.surah.number;
        const showBismillah = isFirstAyahOfSurah && surahNumber !== 1 && surahNumber !== 9;

        return (
            <View style={styles.pageContainer}>
                <View style={styles.mushafPage}>
                    {/* Top Ornamental Border */}
                    <View style={styles.topBorder}>
                        <View style={styles.ornamentPattern} />
                    </View>

                    {/* Surah Header (if first ayah) */}
                    {isFirstAyahOfSurah && (
                        <View style={styles.surahHeaderBox}>
                            <Text style={styles.surahHeaderText}>
                                سُورَةُ {item.ayahs[0].surah.name}
                            </Text>
                        </View>
                    )}

                    {/* Bismillah */}
                    {showBismillah && (
                        <Text style={styles.bismillahText}>
                            بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ
                        </Text>
                    )}


                    {/* Quranic Text */}
                    <ScrollView
                        style={styles.textContainer}
                        contentContainerStyle={styles.textContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.quranicText}>
                            {item.ayahs.map((ayah, index) => (
                                <Text key={`${item.pageNumber}-${ayah.number}-${index}`}>
                                    <Text
                                        onPress={() => handleAyahPress(ayah)}
                                        style={[
                                            styles.ayahText,
                                            selectedAyah?.number === ayah.number && styles.ayahHighlighted
                                        ]}
                                    >
                                        {ayah.text}
                                    </Text>
                                    <Text
                                        onPress={() => handleAyahPress(ayah)}
                                        style={styles.ayahNumber}
                                    >
                                        {' '}۝{convertToArabicNumerals(ayah.numberInSurah)}۝{' '}
                                    </Text>
                                </Text>
                            ))}
                        </Text>
                    </ScrollView>
                </View>

                {/* Bottom Ornamental Border */}
                <View style={styles.bottomBorder}>
                    <View style={styles.ornamentPattern} />
                </View>
            </View>
        );
    };


    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>جاري تحميل القرآن...</Text>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />

            {/* Pages FlatList */}
            <FlatList
                ref={flatListRef}
                data={pages}
                renderItem={renderPage}
                keyExtractor={(item) => item.pageNumber.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                getItemLayout={(_, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                })}
                removeClippedSubviews
                maxToRenderPerBatch={3}
                windowSize={3}
            />

            {/* Floating Back Button */}
            <Pressable
                onPress={() => router.back()}
                style={styles.floatingBackButton}
            >
                <ArrowRight size={24} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>

            {/* Bottom Sheet */}
            {selectedAyah && (
                <AyahBottomSheet
                    ref={bottomSheetRef}
                    ayah={selectedAyah}
                    surahNumber={selectedAyah.surah.number}
                    surahName={selectedAyah.surah.name}
                    onClose={handleClose}
                />
            )}
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F1E8',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F1E8',
    },
    loadingText: {
        marginTop: Spacing.base,
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
    },
    floatingBackButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    pageContainer: {
        width: SCREEN_WIDTH,
        padding: Spacing.md,
    },
    mushafPage: {
        flex: 1,
        backgroundColor: '#FFFEF9',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    topBorder: {
        height: 30,
        marginBottom: Spacing.md,
        overflow: 'hidden',
    },
    ornamentPattern: {
        height: '100%',
        backgroundColor: '#2D5F3F',
        borderRadius: BorderRadius.sm,
        opacity: 0.15,
    },
    surahHeaderBox: {
        backgroundColor: '#2D5F3F',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        marginHorizontal: -Spacing.sm,
        marginBottom: Spacing.lg,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    surahHeaderText: {
        fontSize: Typography.fontSize['2xl'],
        fontFamily: Typography.fontFamily.amiriBold,
        color: '#FFFFFF',
        textAlign: 'center',
    },
    bismillahText: {
        fontSize: Typography.fontSize['3xl'],
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        marginTop: Spacing.md,
    },
    textContainer: {
        flex: 1,
        paddingHorizontal: Spacing.sm,
    },
    textContent: {
        flexGrow: 1,
        paddingBottom: Spacing.xl,
    },

    quranicText: {
        fontSize: 22,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: '#000000',
        textAlign: 'justify',
        writingDirection: 'rtl',
        lineHeight: 42,
    },
    ayahText: {
        fontSize: 22,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: '#000000',
    },
    ayahHighlighted: {
        backgroundColor: '#D4AF3720',
    },
    ayahNumber: {
        fontSize: 20,
        fontFamily: Typography.fontFamily.amiriBold,
        color: '#2D5F3F',
    },
    bottomBorder: {
        height: 30,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
    },
    pageNavigationContainer: {
        height: 50,
        paddingVertical: Spacing.xs,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    pageNumberCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E8E4D8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageNumberActive: {
        backgroundColor: '#2D5F3F',
    },
    pageNumberText: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriBold,
        color: '#666',
    },
    pageNumberTextActive: {
        color: '#FFFFFF',
    },
});

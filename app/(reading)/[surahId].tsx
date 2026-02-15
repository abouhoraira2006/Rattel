import AyahBottomSheet from '@/components/AyahBottomSheet';
import AyahMarker from '@/components/AyahMarker';
import { Colors, Spacing } from '@/constants/theme';
import { fetchPageAyahs } from '@/services/api';
import { setLastRead } from '@/utils/storage';
import BottomSheet from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Info } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions
} from 'react-native';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView
} from 'react-native-gesture-handler';
import {
    runOnJS,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOTAL_PAGES = 604;

interface Ayah {
    number: number;
    numberInSurah: number;
    text: string;
    surah?: {
        name: string;
        number: number;
    };
    tafsir?: string;
    page: number;
}

interface PageData {
    pageNumber: number;
    ayahs: any[];
    imageUrl: string;
    mappings: any[];
}

export default function ReadingScreen() {
    const { surahId, page } = useLocalSearchParams();
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);

    const [pages, setPages] = useState<PageData[]>([]);
    const [currentPage, setCurrentPage] = useState(page ? parseInt(page as string) : 1);
    const [selectedAyah, setSelectedAyah] = useState<Ayah | null>(null);
    const [loading, setLoading] = useState(true);
    const [isInitialScrollDone, setIsInitialScrollDone] = useState(false);

    // Refs for stable access in listeners to avoid stale closures
    const isInitialScrollDoneRef = useRef(false);
    const initialPageRef = useRef(page ? parseInt(page as string) : 1);
    const processingPageRef = useRef<number | null>(null);
    const lastScrollTimeRef = useRef(0);
    const loadPagesAroundRef = useRef<any>(null);

    // RTL handling for pages
    const isRTL = true;

    useEffect(() => {
        const init = async () => {
            const initialPage = page ? parseInt(page as string) : 1;

            // Reset state for new navigation
            setPages([]);
            setLoading(true);
            setIsInitialScrollDone(false);
            isInitialScrollDoneRef.current = false;
            initialPageRef.current = initialPage;
            // Initialize processingPageRef to the target page to prevent 
            // the listener from treating the first render as a change.
            processingPageRef.current = initialPage;
            setCurrentPage(initialPage);

            await loadPagesAround(initialPage);
            setLoading(false);
        };
        init();
    }, [surahId, page]);

    // Separate effect for the initial scroll once pages are loaded
    useEffect(() => {
        if (!loading && pages.length > 0 && !isInitialScrollDoneRef.current) {
            const targetIndex = pages.findIndex(p => p.pageNumber === initialPageRef.current);
            if (targetIndex !== -1 && targetIndex < pages.length) {
                setTimeout(() => {
                    try {
                        lastScrollTimeRef.current = Date.now();
                        flatListRef.current?.scrollToIndex({
                            index: targetIndex,
                            animated: false,
                        });
                        setIsInitialScrollDone(true);
                        isInitialScrollDoneRef.current = true;
                    } catch (error) {
                        console.warn('Scroll failed, will retry via onScrollToIndexFailed:', error);
                        // onScrollToIndexFailed will handle the retry
                    }
                }, 300); // Slightly more delay to ensure layout is ready
            }
        }
    }, [loading, pages]);

    const loadPagesAround = async (pageNumber: number) => {
        try {
            const pagesToLoad = new Set([
                Math.max(1, pageNumber - 3),
                Math.max(1, pageNumber - 2),
                Math.max(1, pageNumber - 1),
                pageNumber,
                Math.min(TOTAL_PAGES, pageNumber + 1),
                Math.min(TOTAL_PAGES, pageNumber + 2),
                Math.min(TOTAL_PAGES, pageNumber + 3)
            ]);

            const loadedPages = await Promise.all(
                Array.from(pagesToLoad).map(async (p) => {
                    const ayahsData = await fetchPageAyahs(p);
                    const ayahs = Array.isArray(ayahsData) ? ayahsData : (ayahsData as any).ayahs || [];
                    return {
                        pageNumber: p,
                        ayahs: ayahs,
                        imageUrl: '',
                        mappings: [],
                    };
                })
            );

            setPages((current) => {
                const newPages = [...current];
                loadedPages.forEach((lp) => {
                    if (!newPages.find((p) => p.pageNumber === lp.pageNumber)) {
                        newPages.push(lp);
                    }
                });
                return newPages.sort((a, b) => a.pageNumber - b.pageNumber);
            });
        } catch (error) {
            console.error('Error loading pages:', error);
        }
    };

    // Update ref so listener always has the latest version
    loadPagesAroundRef.current = loadPagesAround;

    const handleAyahPress = (ayah: any) => {
        setSelectedAyah(ayah);
        bottomSheetRef.current?.snapToIndex(1);
    };

    const onViewableItemsChanged = useRef(({ viewableItems: vItems }: any) => {
        // Guard against rapid scroll events and initial mounting noise
        const now = Date.now();
        if (now - lastScrollTimeRef.current < 500) return;

        if (vItems && vItems.length > 0 && isInitialScrollDoneRef.current) {
            const item = vItems[0].item;
            const newPage = item.pageNumber;

            if (processingPageRef.current === newPage) return;
            processingPageRef.current = newPage;
            lastScrollTimeRef.current = now;

            // Important: Use direct state update for UI sync
            setCurrentPage(newPage);

            // Trigger preloading for next/prev pages
            loadPagesAroundRef.current?.(newPage);

            // Save progress
            if (item.ayahs && item.ayahs.length > 0) {
                const firstAyah = item.ayahs[0];
                setLastRead(
                    parseInt(surahId as string),
                    firstAyah.numberInSurah,
                    newPage
                );
            }
        }
    }).current;

    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const [zoomScale, setZoomScale] = useState(1);
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);

    const pinchGesture = useMemo(() => Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
            const finalScale = Math.max(0.8, Math.min(2.5, scale.value));
            scale.value = withSpring(finalScale);
            savedScale.value = finalScale;
            runOnJS(setZoomScale)(finalScale);
        }), [scale, savedScale]);

    const paperWidth = windowWidth * 0.98;
    const finalPaperHeight = windowHeight * 0.92;
    const baseHeight = 844;
    const scaleFactor = (finalPaperHeight / 0.88) / baseHeight;
    const dynamicFontSize = Math.max(14, Math.min(40, 19 * scaleFactor * zoomScale));
    const dynamicLineHeight = dynamicFontSize * 2.3;

    const renderPage = ({ item }: { item: PageData }) => {
        return (
            <GestureDetector gesture={pinchGesture}>
                <View style={[styles.pageContainer, { width: windowWidth }]}>
                    <View style={[styles.mushafPaper, { width: paperWidth, height: finalPaperHeight }]}>
                        <View style={styles.borderOuter}>
                            <View style={styles.borderInner}>
                                <View style={styles.cornerTopLeft} />
                                <View style={styles.cornerTopRight} />
                                <View style={styles.cornerBottomLeft} />
                                <View style={styles.cornerBottomRight} />
                            </View>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.mushafScrollContent}
                            bounces={true}
                        >
                            <View style={styles.mushafTextContainer}>
                                {(() => {
                                    const sections: any[] = [];
                                    let currentSection: any = null;

                                    item.ayahs.forEach((ayah, index) => {
                                        const isNewSurah = index === 0 || ayah.surah?.number !== item.ayahs[index - 1]?.surah?.number;
                                        if (isNewSurah) {
                                            currentSection = {
                                                surah: ayah.surah,
                                                showBismillah: ayah.surah?.number !== 9 && ayah.numberInSurah === 1,
                                                ayahs: []
                                            };
                                            sections.push(currentSection);
                                        }
                                        currentSection.ayahs.push(ayah);
                                    });

                                    return sections.map((section, sIndex) => (
                                        <View key={`section-${section.surah?.number}-${sIndex}`} style={{ width: '100%' }}>
                                            <View style={styles.surahHeader}>
                                                <View style={styles.surahHeaderDecorative}>
                                                    <Text style={styles.surahHeaderText}>{section.surah?.name}</Text>
                                                </View>
                                            </View>

                                            {section.showBismillah && (
                                                <Text style={[styles.bismillahText, { fontSize: dynamicFontSize * 1.2 }]}>
                                                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                                                </Text>
                                            )}

                                            <Text
                                                style={[
                                                    styles.ayahText,
                                                    {
                                                        fontSize: dynamicFontSize,
                                                        lineHeight: dynamicLineHeight
                                                    }
                                                ]}
                                                textBreakStrategy="balanced"
                                            >
                                                {section.ayahs.map((ayah: any) => {
                                                    const isSelected = selectedAyah?.number === ayah.number;
                                                    let ayahContent = ayah.text || ayah.text_uthmani || ayah.text_warsh || '';

                                                    if (section.showBismillah && ayah.numberInSurah === 1 && section.surah?.number !== 1) {
                                                        const bismillahPattern = /^بِسْمِ [^ ]+ [^ ]+ [^ ]+/;
                                                        ayahContent = ayahContent.replace(bismillahPattern, '').trim();
                                                        if (ayahContent.startsWith('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ')) {
                                                            ayahContent = ayahContent.replace('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', '').trim();
                                                        }
                                                    }

                                                    return (
                                                        <Text
                                                            key={ayah.number}
                                                            onPress={() => handleAyahPress(ayah)}
                                                            style={[isSelected && styles.selectedAyahText]}
                                                        >
                                                            {ayahContent}
                                                            <View style={[styles.markerInlineContainer, { width: dynamicFontSize * 1.5, height: dynamicFontSize * 1.5 }]}>
                                                                <AyahMarker number={ayah.numberInSurah} scale={zoomScale} />
                                                            </View>
                                                        </Text>
                                                    );
                                                })}
                                            </Text>
                                        </View>
                                    ));
                                })()}
                            </View>
                        </ScrollView>

                        <View style={styles.pageNumberContainer}>
                            <View style={styles.pageNumberOrnamentLeft} />
                            <View style={styles.pageNumberBadge}>
                                <Text style={styles.pageNumberText}>{item.pageNumber}</Text>
                            </View>
                            <View style={styles.pageNumberOrnamentRight} />
                        </View>
                    </View>
                </View>
            </GestureDetector>
        );
    };

    if (loading && pages.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>جاري تحميل المصحف...</Text>
            </View>
        );
    }

    const currentPageData = pages.find(p => p.pageNumber === currentPage);
    const currentSurahName = currentPageData?.ayahs[0]?.surah?.name || 'سورة';

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="dark" />
            <Stack.Screen options={{ headerShown: false }} />

            <BlurView intensity={80} tint="light" style={styles.header}>
                <View style={styles.headerContent}>
                    <Pressable onPress={() => router.back()} style={styles.headerButton}>
                        <ArrowRight size={24} color={Colors.text.primary} />
                    </Pressable>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerSurahName}>{currentSurahName}</Text>
                        <Text style={styles.headerPageInfo}>صفحة {currentPage}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <Pressable style={styles.headerButton} onPress={() => {/* Show Info */ }}>
                            <Info size={20} color={Colors.text.primary} />
                        </Pressable>
                    </View>
                </View>
            </BlurView>

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
                onScrollToIndexFailed={(info) => {
                    const wait = new Promise(resolve => setTimeout(resolve, 500));
                    wait.then(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
                    });
                }}
                inverted={isRTL}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={5}
            />

            <AyahBottomSheet
                ref={bottomSheetRef}
                ayah={selectedAyah as any}
                surahNumber={selectedAyah?.surah?.number || 1}
                surahName={selectedAyah?.surah?.name || ''}
                onClose={() => setSelectedAyah(null)}
            />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    pageContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mushafPaper: {
        backgroundColor: '#FFFBF0',
        borderRadius: 8,
        shadowColor: '#2D1E12',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#D4C6A9',
        padding: 4,
        marginTop: 40,
    },
    borderOuter: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1.5,
        borderColor: '#D4AF37',
        margin: 6,
        borderRadius: 4,
    },
    borderInner: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 0.8,
        borderColor: '#8A6E1D',
        margin: 3,
        borderRadius: 2,
    },
    cornerTopLeft: {
        position: 'absolute',
        top: -4,
        left: -4,
        width: 12,
        height: 12,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderColor: '#8A6E1D',
    },
    cornerTopRight: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 12,
        height: 12,
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderColor: '#8A6E1D',
    },
    cornerBottomLeft: {
        position: 'absolute',
        bottom: -4,
        left: -4,
        width: 12,
        height: 12,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
        borderColor: '#8A6E1D',
    },
    cornerBottomRight: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 12,
        height: 12,
        borderBottomWidth: 2,
        borderRightWidth: 2,
        borderColor: '#8A6E1D',
    },
    mushafScrollContent: {
        flexGrow: 1,
    },
    mushafTextContainer: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 40,
        paddingBottom: 40,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    ayahText: {
        fontFamily: 'Amiri-Regular',
        textAlign: 'justify',
        color: '#1A1A1A',
        writingDirection: 'rtl',
        width: '100%',
        letterSpacing: -0.2,
    },
    markerInlineContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedAyahText: {
        backgroundColor: 'rgba(212, 175, 55, 0.25)',
    },
    surahHeader: {
        marginVertical: 15,
        alignItems: 'center',
        width: '100%',
    },
    surahHeaderDecorative: {
        backgroundColor: '#F7F1E1',
        borderWidth: 1.5,
        borderColor: '#D4AF37',
        paddingVertical: 8,
        paddingHorizontal: 25,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    surahHeaderText: {
        fontFamily: 'Amiri-Bold',
        fontSize: 19,
        color: '#2E5A27',
    },
    bismillahText: {
        fontFamily: 'Amiri-Bold',
        textAlign: 'center',
        marginVertical: 12,
        color: '#1A1A1A',
    },
    pageNumberContainer: {
        position: 'absolute',
        bottom: 35,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
    },
    pageNumberBadge: {
        backgroundColor: '#FDF8E8',
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#D4AF37',
        zIndex: 5,
    },
    pageNumberOrnamentLeft: {
        width: 20,
        height: 1,
        backgroundColor: '#D4AF37',
        marginRight: -5,
    },
    pageNumberOrnamentRight: {
        width: 20,
        height: 1,
        backgroundColor: '#D4AF37',
        marginLeft: -5,
    },
    pageNumberText: {
        fontFamily: 'Amiri-Bold',
        fontSize: 15,
        color: '#8A6E1D',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        paddingTop: 50,
        zIndex: 100,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        justifyContent: 'space-between',
    },
    headerTitleContainer: {
        alignItems: 'center',
        flex: 1,
    },
    headerSurahName: {
        fontFamily: 'Amiri-Bold',
        fontSize: 20,
        color: Colors.text.primary,
    },
    headerPageInfo: {
        fontFamily: 'Amiri-Regular',
        fontSize: 14,
        color: Colors.text.secondary,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F1EA',
    },
    loadingText: {
        marginTop: Spacing.md,
        fontFamily: 'Amiri-Regular',
        fontSize: 18,
        color: Colors.text.secondary,
    },
});

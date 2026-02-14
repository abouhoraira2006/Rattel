import AyahBottomSheet from '@/components/AyahBottomSheet';
import { Colors, Spacing } from '@/constants/theme';
import { fetchPageAyahs, fetchPageMapping, getPageImageUrl } from '@/services/api';
import { setLastRead } from '@/utils/storage';
import BottomSheet from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Info, Share2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
    ViewToken
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
    page: number; // Keep page for setLastRead
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
    const [paperHeight, setPaperHeight] = useState(SCREEN_HEIGHT * 0.86); // Default fallback
    const [tapCoord, setTapCoord] = useState<{ x: number, y: number } | null>(null);

    // RTL handling for pages
    const isRTL = true;

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const initialPage = page ? parseInt(page as string) : 1;
            setCurrentPage(initialPage);
            await loadPagesAround(initialPage);
            setLoading(false);

            // Scroll to initial page
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: initialPage - 1,
                    animated: false,
                });
            }, 100);
        };
        init();
    }, [surahId, page]);

    const loadPagesAround = async (pageNumber: number) => {
        const pagesToLoad = new Set([
            Math.max(1, pageNumber - 1),
            pageNumber,
            Math.min(TOTAL_PAGES, pageNumber + 1)
        ]);

        const loadedPages = await Promise.all(
            Array.from(pagesToLoad).map(async (p) => {
                const [ayahsData, mappingData] = await Promise.all([
                    fetchPageAyahs(p),
                    fetchPageMapping(p)
                ]);

                const ayahs = (ayahsData as any).ayahs || ayahsData || [];
                const mappings = (mappingData as any)?.verses || [];

                return {
                    pageNumber: p,
                    ayahs: ayahs,
                    imageUrl: getPageImageUrl(p),
                    mappings: mappings,
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
    };

    const handleAyahPress = (ayah: any, event?: any) => {
        setSelectedAyah(ayah);
        if (event) {
            setTapCoord({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY });
        } else {
            setTapCoord(null);
        }
        bottomSheetRef.current?.snapToIndex(1);
    };

    const handlePageImagePress = (event: any, item: PageData) => {
        const { locationY } = event.nativeEvent;
        const pageAyahs = item.ayahs;
        const mappings = item.mappings;

        if (!mappings || mappings.length === 0) {
            // Fallback to simple heuristic if mapping is missing
            const index = Math.floor((locationY / paperHeight) * pageAyahs.length);
            const ayah = pageAyahs[Math.min(index, pageAyahs.length - 1)];
            if (ayah) handleAyahPress(ayah, event);
            return;
        }

        // Precise Mapping Logic:
        // A Mushaf page usually has 15 lines. 
        // Calibration: Mushaf images have margins (approx 7% top/bottom).
        const TOP_MARGIN = 0.07;
        const BOTTOM_MARGIN = 0.07;
        const usableHeight = paperHeight * (1 - TOP_MARGIN - BOTTOM_MARGIN);
        const relativeY = locationY - (paperHeight * TOP_MARGIN);

        // Map relativeY to line index (1-15)
        let lineIndex = Math.floor((relativeY / usableHeight) * 15) + 1;
        lineIndex = Math.max(1, Math.min(15, lineIndex)); // Clamp to 1-15 

        // Find the verse that exists on this line
        const verseOnLine = mappings.find(v =>
            v?.words?.some((w: any) => w.line_number === lineIndex)
        );

        if (verseOnLine) {
            // Match mapping verse to our local ayah data
            // Note: v.verse_number is the ayah number in the surah
            const ayah = pageAyahs.find(a =>
                a.numberInSurah === verseOnLine.verse_number &&
                a.surah?.number === parseInt(verseOnLine.verse_key.split(':')[0])
            );
            if (ayah) {
                handleAyahPress(ayah, event);
            } else {
                // Try finding the closest ayah on this line or neighboring lines
                const fallbackAyah = pageAyahs.find(a =>
                    a.numberInSurah === verseOnLine.verse_number ||
                    a.number === verseOnLine.id
                );
                if (fallbackAyah) handleAyahPress(fallbackAyah, event);
            }
        } else {
            // Very close nearest line fallback
            const nearestVerse = mappings.reduce((prev, curr) => {
                const prevWords = prev?.words || [];
                const currWords = curr?.words || [];
                const prevDist = prevWords.length > 0
                    ? Math.min(...prevWords.map((w: any) => Math.abs(w.line_number - lineIndex)))
                    : 999;
                const currDist = currWords.length > 0
                    ? Math.min(...currWords.map((w: any) => Math.abs(w.line_number - lineIndex)))
                    : 999;
                return currDist < prevDist ? curr : prev;
            });

            const ayah = pageAyahs.find(a => a.numberInSurah === nearestVerse.verse_number);
            if (ayah) handleAyahPress(ayah, event);
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const newPage = viewableItems[0].item.pageNumber;
            setCurrentPage(newPage);
            loadPagesAround(newPage);

            // Save progress
            const firstAyah = viewableItems[0].item.ayahs?.[0];
            if (firstAyah) {
                setLastRead(
                    firstAyah.surah?.number || 1,
                    firstAyah.numberInSurah || 1,
                    newPage
                );
            }
        }
    }).current;

    const renderPage = ({ item }: { item: PageData }) => (
        <View style={styles.pageContainer}>
            <View
                style={styles.mushafPaper}
                onLayout={(e) => setPaperHeight(e.nativeEvent.layout.height)}
            >
                {/* Islamic Border */}
                <View style={styles.borderContainer}>
                    <View style={styles.topOrnament} />
                    <View style={styles.leftOrnament} />
                    <View style={styles.rightOrnament} />
                    <View style={styles.bottomOrnament} />
                </View>

                {/* Page Image */}
                <Pressable
                    onPress={(e) => handlePageImagePress(e, item)}
                    style={styles.imageContainer}
                >
                    <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.pageImage}
                        contentFit="contain"
                        transition={300}
                    />

                    {/* Ayah Highlighting Layer */}
                    {selectedAyah && item.ayahs.find((a: any) => a.number === selectedAyah.number) && tapCoord && (
                        <View style={[
                            styles.selectionHighlight,
                            { top: tapCoord.y - 20, left: 10, width: SCREEN_WIDTH * 0.94 - 20 }
                        ]} />
                    )}
                </Pressable>

                {/* Floating Page Number */}
                <View style={styles.pageNumberBadge}>
                    <Text style={styles.pageNumberText}>{item.pageNumber}</Text>
                </View>
            </View>
        </View>
    );

    if (loading && pages.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>جاري تحميل المصحف...</Text>
            </View>
        );
    }

    const currentSurahName = pages.find(p => p.pageNumber === currentPage)?.ayahs[0]?.surah?.name || 'سورة';

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="dark" />
            <Stack.Screen options={{ headerShown: false }} />

            {/* iOS Style Blurred Header */}
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
                        <Pressable style={styles.headerButton}>
                            <Share2 size={20} color={Colors.text.primary} />
                        </Pressable>
                        <Pressable style={styles.headerButton}>
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
                inverted={isRTL}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={5}
            />

            {/* Ayah Interaction Bottom Sheet */}
            <AyahBottomSheet
                ref={bottomSheetRef}
                ayah={selectedAyah}
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
        backgroundColor: '#F4F1EA', // Mushaf Paper Color
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 110, // Optimized to start right after header
    },
    mushafPaper: {
        width: SCREEN_WIDTH * 0.94,
        height: (SCREEN_WIDTH * 0.94) * 1.52, // Fixed Aspect Ratio (~Mushaf Standard)
        backgroundColor: '#FCF9F2',
        borderRadius: 4,
        padding: 4,
        // Stronger, more elegant depth
        shadowColor: '#3E2723',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#D7CCC8',
    },
    imageContainer: {
        flex: 1,
        position: 'relative',
    },
    pageImage: {
        flex: 1,
        width: '100%',
        contentFit: 'fill', // Ensure it fills the AR-compliant container
    },
    borderContainer: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 6,
        borderColor: '#E8E1D0',
        borderRadius: 2,
        margin: 4,
    },
    topOrnament: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#8d6e63',
        opacity: 0.3,
    },
    bottomOrnament: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: '#8d6e63',
        opacity: 0.3,
    },
    leftOrnament: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 1,
        backgroundColor: '#8d6e63',
        opacity: 0.1,
    },
    rightOrnament: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        width: 1,
        backgroundColor: '#8d6e63',
        opacity: 0.1,
    },
    selectionHighlight: {
        position: 'absolute',
        top: '20%', // Placeholder
        left: '10%',
        right: '10%',
        height: 40,
        backgroundColor: 'rgba(212, 175, 55, 0.3)', // Golden Overlay
        borderRadius: 4,
    },
    pageNumberBadge: {
        position: 'absolute',
        bottom: 15,
        alignSelf: 'center',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#D4AF37',
    },
    pageNumberText: {
        fontFamily: 'Amiri-Bold',
        fontSize: 16,
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
        paddingHorizontal: Spacing.m,
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
        marginTop: Spacing.m,
        fontFamily: 'Amiri-Regular',
        fontSize: 18,
        color: Colors.text.secondary,
    },
});

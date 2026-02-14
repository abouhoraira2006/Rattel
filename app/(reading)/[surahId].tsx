import AyahBottomSheet from '@/components/AyahBottomSheet';
import AyahMarker from '@/components/AyahMarker';
import { Colors, Spacing } from '@/constants/theme';
import { fetchPageAyahs } from '@/services/api';
import { setLastRead } from '@/utils/storage';
import BottomSheet from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
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
    ViewToken,
    useWindowDimensions
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
            Math.max(1, pageNumber - 2),
            Math.max(1, pageNumber - 1),
            pageNumber,
            Math.min(TOTAL_PAGES, pageNumber + 1),
            Math.min(TOTAL_PAGES, pageNumber + 2)
        ]);

        const loadedPages = await Promise.all(
            Array.from(pagesToLoad).map(async (p) => {
                const ayahsData = await fetchPageAyahs(p);
                // Ensure we get an array of ayahs
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
    };

    const handleAyahPress = (ayah: any) => {
        setSelectedAyah(ayah);
        bottomSheetRef.current?.snapToIndex(1);
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const item = viewableItems[0].item;
            const newPage = item.pageNumber;
            setCurrentPage(newPage);
            loadPagesAround(newPage);

            // Save progress
            if (item.ayahs && item.ayahs.length > 0) {
                const firstAyah = item.ayahs[0];
                setLastRead(
                    firstAyah.surah?.number || 1,
                    firstAyah.numberInSurah || 1,
                    newPage
                );
            }
        }
    }).current;

    const { width: windowWidth, height: windowHeight } = useWindowDimensions();

    // Dynamic styles calculations
    const paperWidth = windowWidth * 0.94;
    const paperHeight = windowHeight * 0.82; // Adjust to fit between header and bottom

    // Heuristic for font size: base 20 for average height (800)
    const baseHeight = 844;
    const scaleFactor = windowHeight / baseHeight;
    const dynamicFontSize = Math.max(16, Math.min(22, 19 * scaleFactor));
    const dynamicLineHeight = dynamicFontSize * 1.85;

    const renderPage = ({ item }: { item: PageData }) => {
        return (
            <View style={[styles.pageContainer, { width: windowWidth }]}>
                <View style={[styles.mushafPaper, { width: paperWidth, height: paperHeight }]}>
                    {/* Islamic Border Decor */}
                    <View style={styles.borderContainer}>
                        <View style={styles.topOrnament} />
                        <View style={styles.bottomOrnament} />
                        <View style={styles.leftOrnament} />
                        <View style={styles.rightOrnament} />
                    </View>

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
                                        <Text style={styles.surahHeaderText}>{section.surah?.name}</Text>
                                    </View>

                                    {section.showBismillah && (
                                        <Text style={styles.bismillahText}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
                                    )}

                                    <Text
                                        style={[
                                            styles.ayahText,
                                            {
                                                fontSize: dynamicFontSize,
                                                lineHeight: dynamicLineHeight
                                            }
                                        ]}
                                        textBreakStrategy="highQuality"
                                    >
                                        {section.ayahs.map((ayah: any) => {
                                            const isSelected = selectedAyah?.number === ayah.number;
                                            const ayahContent = ayah.text || ayah.text_uthmani || ayah.text_warsh || '';
                                            return (
                                                <Text
                                                    key={ayah.number}
                                                    onPress={() => handleAyahPress(ayah)}
                                                    style={[isSelected && styles.selectedAyahText]}
                                                >
                                                    {ayahContent}{' '}
                                                    <View style={styles.markerInlineContainer}>
                                                        <AyahMarker number={ayah.numberInSurah} />
                                                    </View>{' '}
                                                </Text>
                                            );
                                        })}
                                    </Text>
                                </View>
                            ));
                        })()}
                    </View>

                    {/* Page Number */}
                    <View style={styles.pageNumberBadge}>
                        <Text style={styles.pageNumberText}>{item.pageNumber}</Text>
                    </View>
                </View>
            </View>
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
        backgroundColor: '#F9F7F2',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 8,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E8E1D0',
        padding: 5,
        marginTop: 40, // Space for header
    },
    imageContainer: {
        flex: 1,
        position: 'relative',
    },
    pageImage: {
        flex: 1,
        width: '100%',
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
    mushafTextContainer: {
        flex: 1,
        paddingHorizontal: 15,
        paddingBottom: 40,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    ayahText: {
        fontFamily: 'Amiri-Regular',
        textAlign: 'justify',
        color: '#2D2D2D',
        writingDirection: 'rtl',
    },
    markerInlineContainer: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedAyahText: {
        backgroundColor: 'rgba(212, 175, 55, 0.25)',
    },
    ayahMarker: {
        fontFamily: 'Amiri-Bold',
        fontSize: 16,
        color: '#8A6E1D',
    },
    surahHeader: {
        backgroundColor: '#F1EBDC',
        borderWidth: 1,
        borderColor: '#D4AF37',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginVertical: 10,
        alignItems: 'center',
        alignSelf: 'center',
    },
    surahHeaderText: {
        fontFamily: 'Amiri-Bold',
        fontSize: 18,
        color: '#1B5E20',
    },
    bismillahText: {
        fontFamily: 'Amiri-Bold',
        fontSize: 22,
        textAlign: 'center',
        marginVertical: 5,
        color: '#2D2D2D',
    },
});

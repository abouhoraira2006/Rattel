import { Colors, Spacing, Typography } from '@/constants/theme';
import { fetchTafsirMuyassar, searchQuran } from '@/services/api';
import { useRouter } from 'expo-router';
import { Book, ChevronDown, ChevronUp, ExternalLink, Search as SearchIcon } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

interface SearchResult {
    text: string;
    ayahNumber: number;
    surah: {
        number: number;
        name: string;
        englishName: string;
    };
    page: number;
    tafsir?: string;
    verseKey?: string;
}

export default function SearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [tafsirLoading, setTafsirLoading] = useState<string | null>(null);

    const handleSearch = useCallback(async (text: string) => {
        if (text.length < 1) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const searchResults = await searchQuran(text);
            setResults(searchResults as SearchResult[]);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(query);
        }, 500);

        return () => clearTimeout(timer);
    }, [query, handleSearch]);

    const toggleTafsir = async (item: SearchResult, id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }

        if (item.tafsir) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpandedId(id);
            return;
        }

        setTafsirLoading(id);
        try {
            const tafsir = await fetchTafsirMuyassar(item.surah.number, item.ayahNumber);
            const updatedResults = results.map(r => {
                const rId = `${r.surah.number}:${r.ayahNumber}`;
                if (rId === id) return { ...r, tafsir };
                return r;
            });
            setResults(updatedResults);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpandedId(id);
        } catch (error) {
            console.error('Tafsir fetch error:', error);
        } finally {
            setTafsirLoading(null);
        }
    };

    const navigateToMushaf = (page: number, surahNumber: number) => {
        router.push({
            pathname: "/(reading)/[surahId]" as any,
            params: { surahId: surahNumber.toString(), page: page.toString() }
        });
    };

    const renderItem = ({ item }: { item: SearchResult }) => {
        const id = `${item.surah.number}:${item.ayahNumber}`;
        const isExpanded = expandedId === id;
        const isLoadingTafsir = tafsirLoading === id;

        return (
            <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                    <View style={styles.surahInfo}>
                        <Text style={styles.surahName}>{item.surah.name}</Text>
                        <Text style={styles.ayahInfo}>الآية {item.ayahNumber} • صفحة {item.page}</Text>
                    </View>
                    <Pressable
                        onPress={() => navigateToMushaf(item.page, item.surah.number)}
                        style={styles.openButton}
                    >
                        <ExternalLink size={18} color={Colors.primary} />
                        <Text style={styles.openButtonText}>فتح في المصحف</Text>
                    </Pressable>
                </View>

                <Text style={styles.ayahText}>{item.text}</Text>

                <Pressable
                    onPress={() => toggleTafsir(item, id)}
                    style={styles.tafsirToggle}
                >
                    <Text style={styles.tafsirToggleText}>
                        {isExpanded ? 'إخفاء التفسير' : 'عرض التفسير الميسر'}
                    </Text>
                    {isLoadingTafsir ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                        isExpanded ? <ChevronUp size={18} color={Colors.primary} /> : <ChevronDown size={18} color={Colors.primary} />
                    )}
                </Pressable>

                {isExpanded && item.tafsir && (
                    <View style={styles.tafsirContainer}>
                        <Text style={styles.tafsirTitle}>التفسير الميسر:</Text>
                        <ScrollView
                            style={styles.tafsirScroll}
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                        >
                            <Text style={styles.tafsirText}>{item.tafsir}</Text>
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>البحث في القرآن</Text>
                    <View style={styles.searchContainer}>
                        <SearchIcon size={20} color={Colors.text.tertiary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="ابحث عن كلمة، آية، أو سورة..."
                            placeholderTextColor={Colors.text.tertiary}
                            value={query}
                            onChangeText={setQuery}
                            returnKeyType="search"
                        />
                        {query.length > 0 && (
                            <Pressable onPress={() => setQuery('')}>
                                <Text style={styles.clearText}>مسح</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.infoText}>جاري البحث...</Text>
                    </View>
                ) : query.length > 0 && results.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.infoText}>لا توجد نتائج مطابقة لبحثك</Text>
                    </View>
                ) : query.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Book size={48} color={Colors.primary} opacity={0.2} />
                        <Text style={styles.infoText}>ابدأ البحث عن أي كلمة أو آية</Text>
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        renderItem={renderItem}
                        keyExtractor={item => `${item.surah.number}:${item.ayahNumber}`}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onScrollBeginDrag={Keyboard.dismiss}
                    />
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        paddingTop: Platform.OS === 'android' ? 40 : Spacing.lg,
    },
    title: {
        fontFamily: Typography.fontFamily.amiriBold,
        fontSize: Typography.fontSize['2xl'],
        color: Colors.primary,
        textAlign: 'right',
        marginBottom: Spacing.md,
    },
    searchContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: 12,
        paddingHorizontal: Spacing.md,
        height: 50,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    searchIcon: {
        marginLeft: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontFamily: Typography.fontFamily.amiriRegular,
        fontSize: 16,
        color: Colors.text.primary,
        textAlign: 'right',
    },
    clearText: {
        color: Colors.text.tertiary,
        fontFamily: Typography.fontFamily.amiriRegular,
        marginRight: Spacing.sm,
    },
    listContent: {
        padding: Spacing.md,
        paddingBottom: 100,
    },
    resultCard: {
        backgroundColor: Colors.surface,
        borderRadius: 15,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    resultHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    surahInfo: {
        alignItems: 'flex-end',
    },
    surahName: {
        fontFamily: Typography.fontFamily.amiriBold,
        fontSize: 18,
        color: Colors.primary,
    },
    ayahInfo: {
        fontFamily: Typography.fontFamily.amiriRegular,
        fontSize: 12,
        color: Colors.text.tertiary,
    },
    openButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    openButtonText: {
        fontFamily: Typography.fontFamily.amiriRegular,
        fontSize: 12,
        color: Colors.primary,
    },
    ayahText: {
        fontFamily: Typography.fontFamily.amiriRegular,
        fontSize: 18,
        color: Colors.text.primary,
        textAlign: 'justify',
        lineHeight: 32,
        writingDirection: 'rtl',
    },
    tafsirToggle: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.borderLight,
        gap: 8,
    },
    tafsirToggleText: {
        fontFamily: Typography.fontFamily.amiriRegular,
        fontSize: 14,
        color: Colors.primary,
    },
    tafsirContainer: {
        marginTop: Spacing.md,
        backgroundColor: '#FDF8E8',
        padding: Spacing.md,
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
        maxHeight: 250, // Limit height and enable scrolling
    },
    tafsirScroll: {
        flexGrow: 0,
    },
    tafsirTitle: {
        fontFamily: Typography.fontFamily.amiriBold,
        fontSize: 14,
        color: '#8A6E1D',
        marginBottom: 8,
        textAlign: 'right',
    },
    tafsirText: {
        fontFamily: Typography.fontFamily.amiriRegular,
        fontSize: 15, // Slightly larger
        color: '#5D4037',
        lineHeight: 24,
        textAlign: 'justify',
        writingDirection: 'rtl',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    infoText: {
        fontFamily: Typography.fontFamily.amiriRegular,
        fontSize: 16,
        color: Colors.text.tertiary,
        marginTop: Spacing.md,
        textAlign: 'center',
    },
});

import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { getBookmarks, removeBookmark } from '@/utils/storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { Book, BookmarkX } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface Bookmark {
    surahNumber: number;
    ayahNumber: number;
    text: string;
    surahName: string;
    timestamp: number;
}

export default function BookmarksScreen() {
    const router = useRouter();
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [loading, setLoading] = useState(true);

    const loadBookmarks = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getBookmarks();
            // Sort by most recent first
            const sorted = data.sort((a, b) => b.timestamp - a.timestamp);
            setBookmarks(sorted);
        } catch (error) {
            console.error('Error loading bookmarks:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadBookmarks();
        }, [loadBookmarks])
    );

    const handleRemoveBookmark = async (surahNumber: number, ayahNumber: number) => {
        await removeBookmark(surahNumber, ayahNumber);
        await loadBookmarks();
    };

    const handleBookmarkPress = (bookmark: Bookmark) => {
        router.push(`/(reading)/${bookmark.surahNumber}`);
    };

    const renderBookmark = ({ item, index }: { item: Bookmark; index: number }) => (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
                type: 'timing',
                duration: 400,
                delay: index * 50,
            }}
        >
            <Pressable
                onPress={() => handleBookmarkPress(item)}
                style={({ pressed }) => [
                    styles.bookmarkCard,
                    pressed && styles.bookmarkCardPressed,
                ]}
            >
                <View style={styles.bookmarkHeader}>
                    <View style={styles.bookmarkInfo}>
                        <Text style={styles.surahName}>{item.surahName}</Text>
                        <Text style={styles.ayahNumber}>الآية {item.ayahNumber}</Text>
                    </View>
                    <Pressable
                        onPress={() => handleRemoveBookmark(item.surahNumber, item.ayahNumber)}
                        style={({ pressed }) => [
                            styles.removeButton,
                            pressed && styles.removeButtonPressed,
                        ]}
                    >
                        <BookmarkX size={20} color={Colors.text.secondary} strokeWidth={2} />
                    </Pressable>
                </View>

                <Text style={styles.ayahText} numberOfLines={3}>
                    {item.text}
                </Text>

                <Text style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </Text>
            </Pressable>
        </MotiView>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Book size={64} color={Colors.text.tertiary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>لا توجد آيات محفوظة</Text>
            <Text style={styles.emptySubtitle}>
                اضغط على أي آية أثناء القراءة لحفظها هنا
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>جاري تحميل المحفوظات...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>المحفوظات</Text>
                <Text style={styles.headerSubtitle}>
                    {bookmarks.length} {bookmarks.length === 1 ? 'آية' : 'آيات'}
                </Text>
            </View>

            <FlatList
                data={bookmarks}
                renderItem={renderBookmark}
                keyExtractor={(item) => `${item.surahNumber}-${item.ayahNumber}`}
                contentContainerStyle={bookmarks.length === 0 ? styles.emptyList : styles.listContent}
                ListEmptyComponent={renderEmptyState}
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
    header: {
        padding: Spacing.base,
        paddingTop: Spacing.lg,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    headerTitle: {
        fontSize: Typography.fontSize['3xl'],
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
        textAlign: 'right',
        marginBottom: Spacing.xs,
    },
    headerSubtitle: {
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
        textAlign: 'right',
    },
    listContent: {
        padding: Spacing.base,
        paddingBottom: Spacing['3xl'],
    },
    emptyList: {
        flex: 1,
    },
    bookmarkCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.base,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadows.sm,
    },
    bookmarkCardPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    bookmarkHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    bookmarkInfo: {
        flex: 1,
        alignItems: 'flex-end',
    },
    surahName: {
        fontSize: Typography.fontSize.lg,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
        textAlign: 'right',
    },
    ayahNumber: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
        textAlign: 'right',
        marginTop: Spacing.xs / 2,
    },
    removeButton: {
        padding: Spacing.sm,
    },
    removeButtonPressed: {
        opacity: 0.5,
    },
    ayahText: {
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.primary,
        textAlign: 'right',
        writingDirection: 'rtl',
        lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
        marginBottom: Spacing.md,
    },
    timestamp: {
        fontSize: Typography.fontSize.xs,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.tertiary,
        textAlign: 'right',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing['2xl'],
    },
    emptyIcon: {
        marginBottom: Spacing.xl,
        opacity: 0.5,
    },
    emptyTitle: {
        fontSize: Typography.fontSize['2xl'],
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.primary,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    emptySubtitle: {
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
        textAlign: 'center',
        lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    },
});

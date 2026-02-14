import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { setOnboardingComplete } from '@/utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen, Heart, Sparkles } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
    ViewToken,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface OnboardingPage {
    id: string;
    title: string;
    titleArabic: string;
    description: string;
    icon: typeof BookOpen;
    gradient: string[];
}

const ONBOARDING_PAGES: OnboardingPage[] = [
    {
        id: '1',
        title: 'Welcome to Rattel',
        titleArabic: 'رتّل',
        description: 'Experience the Holy Quran in the authentic Warsh recitation with beautiful, modern design.',
        icon: BookOpen,
        gradient: ['#1B4332', '#2D6A4F'],
    },
    {
        id: '2',
        title: 'Read with Ease',
        titleArabic: 'اقرأ بسهولة',
        description: 'Elegant interface designed for comfortable reading with iOS modern aesthetics.',
        icon: Sparkles,
        gradient: ['#2D6A4F', '#40916C'],
    },
    {
        id: '3',
        title: 'Stay Connected',
        titleArabic: 'ابق متصلاً',
        description: 'Track your progress and continue your journey through the Quran seamlessly.',
        icon: Heart,
        gradient: ['#40916C', '#52B788'],
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index || 0);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    const handleGetStarted = async () => {
        try {
            await setOnboardingComplete();
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Error completing onboarding:', error);
        }
    };

    const renderPage = ({ item }: { item: OnboardingPage }) => {
        const Icon = item.icon;

        return (
            <View style={styles.page}>
                <LinearGradient
                    colors={item.gradient}
                    style={styles.gradientContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {/* Lottie Animation Placeholder */}
                    <MotiView
                        from={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            type: 'timing',
                            duration: 800,
                            delay: 200,
                        }}
                        style={styles.animationContainer}
                    >
                        <View style={styles.iconCircle}>
                            <Icon size={80} color={Colors.accent} strokeWidth={1.5} />
                        </View>
                    </MotiView>

                    {/* Arabic Title */}
                    <MotiView
                        from={{ translateY: 20, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{
                            type: 'timing',
                            duration: 600,
                            delay: 400,
                        }}
                    >
                        <Text style={styles.titleArabic}>{item.titleArabic}</Text>
                    </MotiView>

                    {/* English Title */}
                    <MotiView
                        from={{ translateY: 20, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{
                            type: 'timing',
                            duration: 600,
                            delay: 500,
                        }}
                    >
                        <Text style={styles.title}>{item.title}</Text>
                    </MotiView>

                    {/* Description */}
                    <MotiView
                        from={{ translateY: 20, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{
                            type: 'timing',
                            duration: 600,
                            delay: 600,
                        }}
                    >
                        <Text style={styles.description}>{item.description}</Text>
                    </MotiView>
                </LinearGradient>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={ONBOARDING_PAGES}
                renderItem={renderPage}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                bounces={false}
            />

            {/* Bottom Container */}
            <View style={styles.bottomContainer}>
                {/* Pagination Dots */}
                <View style={styles.dotsContainer}>
                    {ONBOARDING_PAGES.map((_, index) => (
                        <MotiView
                            key={index}
                            animate={{
                                width: currentIndex === index ? 32 : 8,
                                backgroundColor: currentIndex === index ? Colors.accent : Colors.text.tertiary,
                            }}
                            transition={{
                                type: 'timing',
                                duration: 300,
                            }}
                            style={styles.dot}
                        />
                    ))}
                </View>

                {/* Get Started Button */}
                {currentIndex === ONBOARDING_PAGES.length - 1 && (
                    <MotiView
                        from={{ translateY: 50, opacity: 0 }}
                        animate={{ translateY: 0, opacity: 1 }}
                        transition={{
                            type: 'spring',
                            delay: 300,
                        }}
                    >
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                pressed && styles.buttonPressed,
                            ]}
                            onPress={handleGetStarted}
                        >
                            <LinearGradient
                                colors={[Colors.accent, '#C5A028']}
                                style={styles.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.buttonText}>Get Started</Text>
                                <Text style={styles.buttonTextArabic}>ابدأ</Text>
                            </LinearGradient>
                        </Pressable>
                    </MotiView>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.primary,
    },
    page: {
        width,
        height,
    },
    gradientContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing['2xl'],
    },
    animationContainer: {
        marginBottom: Spacing['4xl'],
    },
    iconCircle: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleArabic: {
        fontSize: Typography.fontSize['5xl'],
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.accent,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: Typography.fontSize['3xl'],
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.inverse,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    description: {
        fontSize: Typography.fontSize.lg,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: 'rgba(255, 255, 255, 0.85)',
        textAlign: 'center',
        lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.lg,
        paddingHorizontal: Spacing.base,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? Spacing['5xl'] : Spacing['3xl'],
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: Spacing['2xl'],
    },
    dotsContainer: {
        flexDirection: 'row',
        marginBottom: Spacing.xl,
        gap: Spacing.sm,
    },
    dot: {
        height: 8,
        borderRadius: BorderRadius.full,
    },
    button: {
        width: width - Spacing['2xl'] * 2,
        borderRadius: BorderRadius['2xl'],
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: Colors.accent,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    buttonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    buttonGradient: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: Typography.fontSize.xl,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.primary,
        marginBottom: Spacing.xs,
    },
    buttonTextArabic: {
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.primary,
    },
});

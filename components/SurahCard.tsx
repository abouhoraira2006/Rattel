import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { ChevronRight } from 'lucide-react-native';
import { MotiView } from 'moti';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface SurahCardProps {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    numberOfAyahs: number;
    revelationType: string;
    onPress: () => void;
    index: number;
}

export default function SurahCard({
    number,
    name,
    englishName,
    englishNameTranslation,
    numberOfAyahs,
    revelationType,
    onPress,
    index,
}: SurahCardProps) {
    return (
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
                onPress={onPress}
                style={({ pressed }) => [
                    styles.container,
                    pressed && styles.pressed,
                ]}
            >
                {/* Number Badge */}
                <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>{number}</Text>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Arabic Name */}
                    <Text style={styles.arabicName}>{name}</Text>

                    {/* English Name and Translation */}
                    <Text style={styles.englishName}>{englishName}</Text>
                    <Text style={styles.translation}>{englishNameTranslation}</Text>

                    {/* Metadata */}
                    <View style={styles.metadata}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>
                                {revelationType === 'Meccan' ? 'Meccan' : 'Medinan'}
                            </Text>
                        </View>
                        <Text style={styles.ayahCount}>{numberOfAyahs} Ayahs</Text>
                    </View>
                </View>

                {/* Chevron Icon */}
                <ChevronRight size={24} color={Colors.text.tertiary} strokeWidth={2} />
            </Pressable>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius['2xl'],
        padding: Spacing.base,
        marginBottom: Spacing.md,
        ...Shadows.md,
    },
    pressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    numberBadge: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.base,
    },
    numberText: {
        fontSize: Typography.fontSize.lg,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.accent,
    },
    content: {
        flex: 1,
    },
    arabicName: {
        fontSize: Typography.fontSize.xl,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
        marginBottom: Spacing.xs,
        textAlign: 'right',
        writingDirection: 'rtl',
    },
    englishName: {
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.primary,
        marginBottom: 2,
    },
    translation: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
        marginBottom: Spacing.sm,
    },
    metadata: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    tag: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        backgroundColor: `${Colors.accent}20`,
        borderRadius: BorderRadius.sm,
    },
    tagText: {
        fontSize: Typography.fontSize.xs,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.accent,
    },
    ayahCount: {
        fontSize: Typography.fontSize.xs,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.tertiary,
    },
});

import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { Settings as SettingsIcon } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.section}>
                <SettingsIcon size={64} color={Colors.text.tertiary} strokeWidth={1.5} />
                <Text style={styles.title}>Settings Coming Soon</Text>
                <Text style={styles.subtitle}>
                    Customize your reading experience with font size, theme, and more
                </Text>
            </View>

            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Rattel · رتّل</Text>
                <Text style={styles.infoText}>Version 1.0.0</Text>
                <Text style={styles.infoText}>Warsh Edition</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flexGrow: 1,
        padding: Spacing.base,
    },
    section: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing['2xl'],
    },
    title: {
        fontSize: Typography.fontSize['2xl'],
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.primary,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: Typography.fontSize.base,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
        textAlign: 'center',
        lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    },
    infoCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius['2xl'],
        padding: Spacing.lg,
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    infoTitle: {
        fontSize: Typography.fontSize.xl,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.primary,
        marginBottom: Spacing.sm,
    },
    infoText: {
        fontSize: Typography.fontSize.sm,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
        marginBottom: Spacing.xs / 2,
    },
});

/**
 * Design System for Rattel App
 * iOS Modern Design with Islamic Aesthetics
 */

export const Colors = {
    // Primary Colors
    primary: '#1B4332',        // Deep Marble Green
    accent: '#D4AF37',         // Muted Gold
    background: '#F9F6F0',     // Off-white/Bone

    // Semantic Colors
    surface: '#FFFFFF',
    surfaceSecondary: '#F5F5F5',
    text: {
        primary: '#1A1A1A',
        secondary: '#666666',
        tertiary: '#999999',
        inverse: '#FFFFFF',
    },

    // UI States
    border: 'rgba(0, 0, 0, 0.08)',
    borderLight: 'rgba(0, 0, 0, 0.04)',
    shadow: 'rgba(27, 67, 50, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.4)',

    // Glassmorphism
    glass: 'rgba(255, 255, 255, 0.9)',
    glassBorder: 'rgba(255, 255, 255, 0.18)',
};

export const Typography = {
    // Font Families
    fontFamily: {
        amiriRegular: 'Amiri-Regular',
        amiriBold: 'Amiri-Bold',
        uthmanicWarsh: 'UthmanicWarsh', // Fallback to Amiri if not available
        system: 'System',
    },

    // Font Sizes
    fontSize: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        '3xl': 28,
        '4xl': 32,
        '5xl': 40,
    },

    // Font Weights
    fontWeight: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
    },

    // Line Heights
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
        loose: 2,
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    full: 9999,
};

export const Shadows = {
    // iOS-style shadows
    sm: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    xl: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
};

export const Layout = {
    // Safe margins
    screenPadding: Spacing.base,
    cardPadding: Spacing.base,
    sectionSpacing: Spacing.xl,

    // Card styles
    card: {
        borderRadius: BorderRadius['2xl'],
        padding: Spacing.base,
        backgroundColor: Colors.surface,
        ...Shadows.md,
    },

    // Hero card (Continue Reading)
    heroCard: {
        borderRadius: BorderRadius['2xl'],
        padding: Spacing.xl,
        backgroundColor: Colors.glass,
        borderWidth: 1,
        borderColor: Colors.glassBorder,
        ...Shadows.lg,
    },
};

// Animation durations in ms
export const Animation = {
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
};

export default {
    Colors,
    Typography,
    Spacing,
    BorderRadius,
    Shadows,
    Layout,
    Animation,
};

import { Colors, Typography } from '@/constants/theme';
import { Tabs } from 'expo-router';
import { BookOpen, Bookmark, Settings } from 'lucide-react-native';
import { Platform } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.text.tertiary,
                tabBarStyle: {
                    backgroundColor: Colors.surface,
                    borderTopColor: Colors.borderLight,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                    paddingTop: 8,
                    ...Platform.select({
                        ios: {
                            shadowColor: Colors.shadow,
                            shadowOffset: { width: 0, height: -2 },
                            shadowOpacity: 0.08,
                            shadowRadius: 8,
                        },
                        android: {
                            elevation: 8,
                        },
                    }),
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontFamily: Typography.fontFamily.amiriRegular,
                    marginTop: 4,
                },
                headerStyle: {
                    backgroundColor: Colors.background,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                headerTitleStyle: {
                    fontFamily: Typography.fontFamily.amiriBold,
                    fontSize: Typography.fontSize['2xl'],
                    color: Colors.primary,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Quran',
                    headerTitle: 'Rattel · رتّل',
                    tabBarIcon: ({ color, size }) => (
                        <BookOpen size={size} color={color} strokeWidth={2} />
                    ),
                }}
            />
            <Tabs.Screen
                name="bookmarks"
                options={{
                    title: 'Bookmarks',
                    headerTitle: 'Bookmarks · المرجعيات',
                    tabBarIcon: ({ color, size }) => (
                        <Bookmark size={size} color={color} strokeWidth={2} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    headerTitle: 'Settings · الإعدادات',
                    tabBarIcon: ({ color, size }) => (
                        <Settings size={size} color={color} strokeWidth={2} />
                    ),
                }}
            />
        </Tabs>
    );
}

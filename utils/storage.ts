/**
 * AsyncStorage wrapper utilities for persistent data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage Keys
export const STORAGE_KEYS = {
    ONBOARDING_COMPLETE: '@rattel:onboarding_complete',
    LAST_READ_SURAH: '@rattel:last_read_surah',
    LAST_READ_AYAH: '@rattel:last_read_ayah',
    LAST_READ_PAGE: '@rattel:last_read_page',
    READING_PROGRESS: '@rattel:reading_progress',
    BOOKMARKS: '@rattel:bookmarks',
    SELECTED_RECITER: '@rattel:selected_reciter',
    SELECTED_TAFSIR: '@rattel:selected_tafsir',
};

const isStorageAvailable = () => {
    if (!AsyncStorage) {
        console.warn('AsyncStorage native module is null');
        return false;
    }
    return true;
};

// Bookmark interface
interface Bookmark {
    surahNumber: number;
    ayahNumber: number;
    text: string;
    surahName: string;
    timestamp: number;
}

/**
 * Check if user has completed onboarding
 * @returns {Promise<boolean>}
 */
export const hasCompletedOnboarding = async (): Promise<boolean> => {
    if (!isStorageAvailable()) return false;
    try {
        const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
        return value === 'true';
    } catch (error) {
        console.error('Error checking onboarding status:', error);
        return false;
    }
};

/**
 * Mark onboarding as complete
 * @returns {Promise<void>}
 */
export const setOnboardingComplete = async (): Promise<void> => {
    if (!isStorageAvailable()) return;
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    } catch (error) {
        console.error('Error setting onboarding complete:', error);
    }
};

/**
 * Interface for last read position
 */
interface LastRead {
    surahNumber: number;
    ayahNumber: number;
    pageNumber: number;
}

/**
 * Get last reading position
 * @returns {Promise<LastRead | null>}
 */
export const getLastRead = async (): Promise<LastRead | null> => {
    if (!isStorageAvailable()) return null;
    try {
        const surah = await AsyncStorage.getItem(STORAGE_KEYS.LAST_READ_SURAH);
        const ayah = await AsyncStorage.getItem(STORAGE_KEYS.LAST_READ_AYAH);
        const page = await AsyncStorage.getItem(STORAGE_KEYS.LAST_READ_PAGE);

        if (surah && ayah && page) {
            return {
                surahNumber: parseInt(surah, 10),
                ayahNumber: parseInt(ayah, 10),
                pageNumber: parseInt(page, 10),
            };
        }

        return null;
    } catch (error) {
        console.error('Error getting last read position:', error);
        return null;
    }
};

/**
 * Set last read position
 * @param {number} surahNumber - Surah number
 * @param {number} ayahNumber - Ayah number
 * @param {number} pageNumber - Page number (1-604)
 * @returns {Promise<void>}
 */
export const setLastRead = async (
    surahNumber: number,
    ayahNumber: number,
    pageNumber: number = 1
): Promise<void> => {
    if (!isStorageAvailable()) return;
    try {
        const progress = Math.min(100, Math.max(0, (pageNumber / 604) * 100));

        await AsyncStorage.multiSet([
            [STORAGE_KEYS.LAST_READ_SURAH, surahNumber.toString()],
            [STORAGE_KEYS.LAST_READ_AYAH, ayahNumber.toString()],
            [STORAGE_KEYS.LAST_READ_PAGE, pageNumber.toString()],
            [STORAGE_KEYS.READING_PROGRESS, progress.toFixed(2)],
        ]);
    } catch (error) {
        console.error('Error setting last read position:', error);
    }
};

/**
 * Get reading progress (percentage completed)
 * @returns {Promise<number>} Progress percentage (0-100)
 */
export const getReadingProgress = async (): Promise<number> => {
    if (!isStorageAvailable()) return 0;
    try {
        const value = await AsyncStorage.getItem(STORAGE_KEYS.READING_PROGRESS);
        return value ? parseFloat(value) : 0;
    } catch (error) {
        console.error('Error getting reading progress:', error);
        return 0;
    }
};

/**
 * Update reading progress
 * @param {number} percentage - Progress percentage (0-100)
 * @returns {Promise<void>}
 */
export const setReadingProgress = async (percentage: number): Promise<void> => {
    if (!isStorageAvailable()) return;
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.READING_PROGRESS, percentage.toString());
    } catch (error) {
        console.error('Error setting reading progress:', error);
    }
};

/**
 * Clear all stored data (for testing)
 * @returns {Promise<void>}
 */
export const clearAllData = async (): Promise<void> => {
    if (!isStorageAvailable()) return;
    try {
        await AsyncStorage.clear();
    } catch (error) {
        console.error('Error clearing storage:', error);
    }
};

/**
 * Get all bookmarks
 * @returns {Promise<Bookmark[]>} Array of bookmarked Ayahs
 */
export const getBookmarks = async (): Promise<Bookmark[]> => {
    if (!isStorageAvailable()) return [];
    try {
        const bookmarksJson = await AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKS);
        return bookmarksJson ? JSON.parse(bookmarksJson) : [];
    } catch (error) {
        console.error('Error getting bookmarks:', error);
        return [];
    }
};

/**
 * Add a bookmark
 * @param {number} surahNumber - Surah number
 * @param {number} ayahNumber - Ayah number
 * @param {string} text - Ayah text
 * @param {string} surahName - Surah name
 * @returns {Promise<void>}
 */
export const addBookmark = async (
    surahNumber: number,
    ayahNumber: number,
    text: string,
    surahName: string
): Promise<void> => {
    if (!isStorageAvailable()) return;
    try {
        const bookmarks = await getBookmarks();

        // Check if already bookmarked
        const exists = bookmarks.some(
            (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
        );

        if (!exists) {
            const newBookmark: Bookmark = {
                surahNumber,
                ayahNumber,
                text,
                surahName,
                timestamp: Date.now(),
            };

            bookmarks.push(newBookmark);
            await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
        }
    } catch (error) {
        console.error('Error adding bookmark:', error);
    }
};

/**
 * Remove a bookmark
 * @param {number} surahNumber - Surah number
 * @param {number} ayahNumber - Ayah number
 * @returns {Promise<void>}
 */
export const removeBookmark = async (
    surahNumber: number,
    ayahNumber: number
): Promise<void> => {
    if (!isStorageAvailable()) return;
    try {
        const bookmarks = await getBookmarks();
        const filtered = bookmarks.filter(
            (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber)
        );
        await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(filtered));
    } catch (error) {
        console.error('Error removing bookmark:', error);
    }
};

/**
 * Check if an Ayah is bookmarked
 * @param {number} surahNumber - Surah number
 * @param {number} ayahNumber - Ayah number
 * @returns {Promise<boolean>}
 */
export const isBookmarked = async (
    surahNumber: number,
    ayahNumber: number
): Promise<boolean> => {
    if (!isStorageAvailable()) return false;
    try {
        const bookmarks = await getBookmarks();
        return bookmarks.some(
            (b) => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber
        );
    } catch (error) {
        console.error('Error checking bookmark:', error);
        return false;
    }
};

/**
 * Get a user preference
 * @param {string} key - The key from STORAGE_KEYS
 * @param {string} defaultValue - Default value if not found
 * @returns {Promise<string>}
 */
export const getPreference = async (key: string, defaultValue: string): Promise<string> => {
    if (!isStorageAvailable()) return defaultValue;
    try {
        const value = await AsyncStorage.getItem(key);
        return value || defaultValue;
    } catch (error) {
        console.error(`Error getting preference ${key}:`, error);
        return defaultValue;
    }
};

/**
 * Set a user preference
 * @param {string} key - The key from STORAGE_KEYS
 * @param {string} value - The value to store
 * @returns {Promise<void>}
 */
export const setPreference = async (key: string, value: string): Promise<void> => {
    if (!isStorageAvailable()) return;
    try {
        await AsyncStorage.setItem(key, value);
    } catch (error) {
        console.error(`Error setting preference ${key}:`, error);
    }
};

export default {
    hasCompletedOnboarding,
    setOnboardingComplete,
    getLastRead,
    setLastRead,
    getReadingProgress,
    setReadingProgress,
    clearAllData,
    getBookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked,
    getPreference,
    setPreference,
    STORAGE_KEYS,
};

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for playback progress
export const PLAYBACK_KEYS = {
    CURRENT_AYAH: 'playback_current_ayah',
    CURRENT_SURAH: 'playback_current_surah',
    PLAYBACK_RANGE: 'playback_range',
    SELECTED_RECITER: 'playback_reciter',
};

export interface PlaybackRange {
    startSurah: number;
    startAyah: number;
    endSurah: number;
    endAyah: number;
}

export interface PlaybackProgress {
    currentSurah: number;
    currentAyah: number;
    globalAyahNumber: number;
}

/**
 * Save current playback progress
 */
export const savePlaybackProgress = async (progress: PlaybackProgress): Promise<void> => {
    try {
        await AsyncStorage.setItem(PLAYBACK_KEYS.CURRENT_AYAH, progress.globalAyahNumber.toString());
        await AsyncStorage.setItem(PLAYBACK_KEYS.CURRENT_SURAH, progress.currentSurah.toString());
    } catch (error) {
        console.error('Error saving playback progress:', error);
    }
};

/**
 * Get saved playback progress
 */
export const getPlaybackProgress = async (): Promise<PlaybackProgress | null> => {
    try {
        const ayahStr = await AsyncStorage.getItem(PLAYBACK_KEYS.CURRENT_AYAH);
        const surahStr = await AsyncStorage.getItem(PLAYBACK_KEYS.CURRENT_SURAH);

        if (ayahStr && surahStr) {
            return {
                globalAyahNumber: parseInt(ayahStr),
                currentSurah: parseInt(surahStr),
                currentAyah: 0, // Will be calculated
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting playback progress:', error);
        return null;
    }
};

/**
 * Save playback range
 */
export const savePlaybackRange = async (range: PlaybackRange): Promise<void> => {
    try {
        await AsyncStorage.setItem(PLAYBACK_KEYS.PLAYBACK_RANGE, JSON.stringify(range));
    } catch (error) {
        console.error('Error saving playback range:', error);
    }
};

/**
 * Get saved playback range
 */
export const getPlaybackRange = async (): Promise<PlaybackRange | null> => {
    try {
        const rangeStr = await AsyncStorage.getItem(PLAYBACK_KEYS.PLAYBACK_RANGE);
        if (rangeStr) {
            return JSON.parse(rangeStr);
        }
        return null;
    } catch (error) {
        console.error('Error getting playback range:', error);
        return null;
    }
};

/**
 * Clear playback progress
 */
export const clearPlaybackProgress = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(PLAYBACK_KEYS.CURRENT_AYAH);
        await AsyncStorage.removeItem(PLAYBACK_KEYS.CURRENT_SURAH);
    } catch (error) {
        console.error('Error clearing playback progress:', error);
    }
};

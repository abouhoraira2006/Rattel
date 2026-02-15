import { PlaybackRange } from '@/utils/playbackStorage';
import { SURAHS } from './quranData';

/**
 * Calculate global ayah number from surah and ayah number
 */
export const calculateGlobalAyahNumber = (surahNumber: number, ayahNumber: number): number => {
    // Treat Ayah 0 as the Basmala (Global Ayah 1) for any Surah
    if (ayahNumber === 0) return 1;

    let globalNumber = 0;

    // Add all ayahs from previous surahs
    for (let i = 1; i < surahNumber; i++) {
        const surah = SURAHS.find((s: any) => s.number === i);
        if (surah) {
            globalNumber += surah.numberOfAyahs;
        }
    }

    // Add current ayah number
    globalNumber += ayahNumber;

    return globalNumber;
};

/**
 * Calculate surah and ayah from global ayah number
 */
export const calculateSurahAndAyah = (globalAyahNumber: number): { surah: number; ayah: number } => {
    let remaining = globalAyahNumber;

    for (const surah of SURAHS) {
        if (remaining <= surah.numberOfAyahs) {
            return {
                surah: surah.number,
                ayah: remaining,
            };
        }
        remaining -= surah.numberOfAyahs;
    }

    // Default to last ayah of last surah
    const lastSurah = SURAHS[SURAHS.length - 1];
    return {
        surah: lastSurah.number,
        ayah: lastSurah.numberOfAyahs,
    };
};

/**
 * Get next ayah in sequence
 */
export const getNextAyah = (currentSurah: number, currentAyah: number): { surah: number; ayah: number } | null => {
    const surah = SURAHS.find((s: any) => s.number === currentSurah);
    if (!surah) return null;

    // If we just finished Bismillah (Ayah 0), move to Ayah 1 of the same Surah
    if (currentAyah === 0) {
        return { surah: currentSurah, ayah: 1 };
    }

    // If not the last ayah in surah, return next ayah
    if (currentAyah < surah.numberOfAyahs) {
        return {
            surah: currentSurah,
            ayah: currentAyah + 1,
        };
    }

    // Move to next surah
    if (currentSurah < 114) {
        const nextSurahNum = currentSurah + 1;
        // Check if next surah needs a Basmala (all except Surah 9)
        // Surah 1 (Al-Fatiha) already includes Basmala as Ayah 1 in the API text, 
        // but for audio we might want consistent 0 handling. 
        // However, user said "in the beginning Basmala is Ayah 1 [for Fatiha]".
        if (nextSurahNum !== 9 && nextSurahNum !== 1) {
            return { surah: nextSurahNum, ayah: 0 };
        }
        return {
            surah: nextSurahNum,
            ayah: 1,
        };
    }

    // End of Quran
    return null;
};

/**
 * Check if current position is within playback range
 */
export const isWithinRange = (
    currentSurah: number,
    currentAyah: number,
    range: PlaybackRange
): boolean => {
    const currentGlobal = calculateGlobalAyahNumber(currentSurah, currentAyah);
    const startGlobal = calculateGlobalAyahNumber(range.startSurah, range.startAyah);
    const endGlobal = calculateGlobalAyahNumber(range.endSurah, range.endAyah);

    return currentGlobal >= startGlobal && currentGlobal <= endGlobal;
};

/**
 * Calculate progress percentage
 */
export const calculateProgress = (
    currentSurah: number,
    currentAyah: number,
    range: PlaybackRange
): number => {
    const currentGlobal = calculateGlobalAyahNumber(currentSurah, currentAyah);
    const startGlobal = calculateGlobalAyahNumber(range.startSurah, range.startAyah);
    const endGlobal = calculateGlobalAyahNumber(range.endSurah, range.endAyah);

    const total = endGlobal - startGlobal + 1;
    const completed = currentGlobal - startGlobal + 1;

    return Math.min(100, Math.max(0, (completed / total) * 100));
};

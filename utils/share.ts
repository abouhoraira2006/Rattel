/**
 * Share utilities for Ayahs
 */

import { Share } from 'react-native';

/**
 * Share Ayah text with reference
 * @param {string} ayahText - The Ayah text in Arabic
 * @param {string} surahName - Name of the Surah
 * @param {number} surahNumber - Surah number
 * @param {number} ayahNumber - Ayah number
 * @returns {Promise<void>}
 */
export const shareAyahText = async (
    ayahText: string,
    surahName: string,
    surahNumber: number,
    ayahNumber: number
): Promise<void> => {
    try {
        const formattedText = `قال الله تعالى:\n\n${ayahText}\n\n[${surahName}: ${ayahNumber}]`;

        const result = await Share.share(
            {
                message: formattedText,
                title: `آية من ${surahName}`,
            },
            {
                // iOS specific
                subject: `آية من ${surahName}`,
                dialogTitle: 'مشاركة الآية',
            }
        );

        if (result.action === Share.sharedAction) {
            if (result.activityType) {
                console.log('Shared with activity type:', result.activityType);
            } else {
                console.log('Shared successfully');
            }
        } else if (result.action === Share.dismissedAction) {
            console.log('Share dismissed');
        }
    } catch (error) {
        console.error('Error sharing Ayah:', error);
    }
};

export default {
    shareAyahText,
};

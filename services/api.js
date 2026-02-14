/**
 * API Service Layer for Alquran.cloud
 * Provides serverless access to Quranic data
 */

import axios from 'axios';

// Base configuration
const API_BASE_URL = 'https://api.alquran.cloud/v1';
const WARSH_EDITION = 'quran-warsh'; // Warsh edition identifier
const TAFSIR_MUYASSAR = 'ar.muyassar'; // Al-Tafsir Al-Muyassar edition
const AUDIO_BASE_URL = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy';

// Create Axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
    }
);

/**
 * Fetch list of all 114 Surahs with metadata
 * @returns {Promise<Array>} Array of Surah objects with name, translation, verses count
 */
export const fetchSurahList = async () => {
    try {
        const response = await apiClient.get('/surah');
        return response.data.map((surah) => ({
            number: surah.number,
            name: surah.name,
            englishName: surah.englishName,
            englishNameTranslation: surah.englishNameTranslation,
            revelationType: surah.revelationType,
            numberOfAyahs: surah.numberOfAyahs,
        }));
    } catch (error) {
        console.error('Error fetching Surah list:', error);
        throw new Error('Failed to load Surah list. Please check your connection.');
    }
};

/**
 * Fetch specific Surah content in Warsh edition
 * @param {number} surahNumber - Surah number (1-114)
 * @returns {Promise<Object>} Surah data with ayahs in Warsh recitation
 */
export const fetchSurahWarsh = async (surahNumber) => {
    try {
        const response = await apiClient.get(`/surah/${surahNumber}/${WARSH_EDITION}`);
        return {
            number: response.data.number,
            name: response.data.name,
            englishName: response.data.englishName,
            englishNameTranslation: response.data.englishNameTranslation,
            revelationType: response.data.revelationType,
            numberOfAyahs: response.data.numberOfAyahs,
            ayahs: response.data.ayahs.map((ayah) => ({
                number: ayah.number,
                numberInSurah: ayah.numberInSurah,
                text: ayah.text,
                juz: ayah.juz,
                manzil: ayah.manzil,
                page: ayah.page,
                ruku: ayah.ruku,
                hizbQuarter: ayah.hizbQuarter,
                sajda: ayah.sajda,
            })),
        };
    } catch (error) {
        console.error(`Error fetching Surah ${surahNumber}:`, error);
        throw new Error(`Failed to load Surah ${surahNumber}. Please try again.`);
    }
};

/**
 * Fetch detailed information for a specific Ayah
 * @param {string} ayahKey - Ayah reference (e.g., "1:1" for Surah 1, Ayah 1)
 * @returns {Promise<Object>} Ayah data with text, Tafsir, and audio URL
 */
export const fetchAyahDetail = async (ayahKey) => {
    try {
        const [surahNumber, ayahNumber] = ayahKey.split(':').map(Number);

        // Fetch Ayah text in Warsh edition
        const ayahResponse = await apiClient.get(`/ayah/${surahNumber}:${ayahNumber}/${WARSH_EDITION}`);

        // Fetch Tafsir (using Ibn Kathir as default)
        let tafsir = null;
        try {
            const tafsirResponse = await apiClient.get(`/ayah/${surahNumber}:${ayahNumber}/en.asad`);
            tafsir = tafsirResponse.data.text;
        } catch (tafsirError) {
            console.warn('Tafsir not available for this ayah');
        }

        // Construct audio URL (using Alafasy recitation as default)
        const audioUrl = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayahResponse.data.number}.mp3`;

        return {
            number: ayahResponse.data.number,
            numberInSurah: ayahResponse.data.numberInSurah,
            text: ayahResponse.data.text,
            surah: {
                number: ayahResponse.data.surah.number,
                name: ayahResponse.data.surah.name,
                englishName: ayahResponse.data.surah.englishName,
            },
            tafsir,
            audioUrl,
            juz: ayahResponse.data.juz,
            page: ayahResponse.data.page,
        };
    } catch (error) {
        console.error(`Error fetching Ayah ${ayahKey}:`, error);
        throw new Error(`Failed to load Ayah ${ayahKey}. Please try again.`);
    }
};

/**
 * Fetch Tafsir Al-Muyassar for a specific Ayah
 * @param {number} surahNumber - Surah number (1-114)
 * @param {number} ayahNumber - Ayah number within the Surah
 * @returns {Promise<string>} Tafsir text in Arabic
 */
export const fetchTafsirMuyassar = async (surahNumber, ayahNumber) => {
    try {
        const response = await apiClient.get(`/ayah/${surahNumber}:${ayahNumber}/${TAFSIR_MUYASSAR}`);
        return response.data.text || 'التفسير غير متوفر لهذه الآية';
    } catch (error) {
        console.warn(`Tafsir not available for ${surahNumber}:${ayahNumber}`);
        return 'التفسير غير متوفر لهذه الآية';
    }
};

/**
 * Get audio URL for a specific Ayah
 * @param {number} ayahNumber - Global Ayah number (1-6236)
 * @returns {string} Audio URL
 */
export const getAyahAudioUrl = (ayahNumber) => {
    return `${AUDIO_BASE_URL}/${ayahNumber}.mp3`;
};

/**
 * Fetch Ayahs for a specific Mushaf page
 * @param {number} pageNumber - Page number (1-604)
 * @returns {Promise<Array>} Array of Ayahs on that page
 */
export const fetchPageAyahs = async (pageNumber) => {
    try {
        const response = await apiClient.get(`/page/${pageNumber}/${WARSH_EDITION}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching page ${pageNumber}:`, error);
        throw error;
    }
};

/**
 * Get a random daily Ayah
 * @returns {Promise<Object>} Random Ayah with text and metadata
 */
export const getDailyAyah = async () => {
    try {
        // Use a famous Ayah or random selection
        // For now, using Ayat Al-Kursi (2:255) as featured
        const response = await apiClient.get(`/ayah/2:255/${WARSH_EDITION}`);
        return {
            number: response.data.number,
            text: response.data.text,
            surah: {
                number: response.data.surah.number,
                name: response.data.surah.name,
                englishName: response.data.surah.englishName,
            },
            numberInSurah: response.data.numberInSurah,
        };
    } catch (error) {
        console.error('Error fetching daily Ayah:', error);
        return null;
    }
};

export default {
    fetchSurahList,
    fetchSurahWarsh,
    fetchAyahDetail,
    fetchTafsirMuyassar,
    getAyahAudioUrl,
    getDailyAyah,
    fetchPageAyahs,
};

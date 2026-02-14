/**
 * API Service Layer for Alquran.cloud
 * Provides serverless access to Quranic data
 */

import axios from 'axios';

// Base configuration
const API_BASE_URL = 'https://api.alquran.cloud/v1';
const WARSH_EDITION = 'ar.warsh'; // Correct Alquran.cloud identifier for Warsh
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

/**
 * Normalizes Arabic text by removing diacritics (tashkeel) and standardizing characters
 * @param {string} text 
 * @returns {string} Normalized text
 */
export const normalizeArabic = (text) => {
    if (!text) return '';
    return text
        // Remove diacritics (tashkeel)
        .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
        // Normalize Alifs
        .replace(/[أإآٱ]/g, 'ا')
        // Normalize Teh Marbuta
        .replace(/ة/g, 'ه')
        // Normalize Alif Maksura
        .replace(/ى/g, 'ي')
        // Normalize different types of Hamzas to a simple Alif where appropriate, 
        // or just leave them if they are part of a word's radical.
        // For search purposes, mapping them to Alif is often most helpful.
        .replace(/[ؤئ]/g, 'ء')
        .trim();
};

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
 * Fetch the starting page number for a given Surah
 * @param {number} surahNumber 
 * @returns {number} Page number
 */
export const fetchSurahPage = async (surahNumber) => {
    try {
        const response = await apiClient.get(`/surah/${surahNumber}`);
        if (response.data && response.data.ayahs && response.data.ayahs.length > 0) {
            return response.data.ayahs[0].page;
        }
        return 1;
    } catch (error) {
        console.error('Error fetching surah page:', error);
        return 1;
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
        return response.data?.ayahs || []; // Return the array of ayahs directly
    } catch (error) {
        console.warn(`Warsh edition not found for page ${pageNumber}, falling back to Uthmani`);
        try {
            const response = await apiClient.get(`/page/${pageNumber}/quran-uthmani`);
            return response.data?.ayahs || [];
        } catch (innerError) {
            console.error(`Error fetching page ${pageNumber}:`, innerError);
            throw innerError;
        }
    }
};



/**
 * Get the URL for a Mushaf page image
 * @param {number} pageNumber - Page number (1-604)
 * @param {string} type - Mushaf type (default: 'uthmani')
 * @returns {string} Image URL
 */
export const getPageImageUrl = (pageNumber) => {
    // High-quality Mushaf page images from IslamDB
    const paddedPage = pageNumber.toString().padStart(3, '0');
    return `https://quran.islam-db.com/public/data/pages/quranpages_1024/images/page${paddedPage}.png`;
};

/**
 * Fetch verse mapping/bounding boxes for a specific page
 * @param {number} pageNumber - Page number (1-604)
 * @returns {Promise<Object>} Mapping data
 */
export const fetchPageMapping = async (pageNumber) => {
    // This endpoint provides coordinates for ayah highlighting
    try {
        const response = await axios.get(`https://api.quran.com/api/v4/verses/by_page/${pageNumber}?words=true&fields=line_number&word_fields=v2_page,line_number,location`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching mapping for page ${pageNumber}:`, error);
        return null;
    }
};

/**
 * Search the Quran for a keyword using Quran.com API (v4)
 * Much more robust for Arabic text search
 * @param {string} keyword - The text to search for
 * @returns {Promise<Array>} Search results with Surah and Ayah info
 */
export const searchQuran = async (keyword) => {
    try {
        const normalizedKeyword = normalizeArabic(keyword);
        const response = await axios.get(`https://api.quran.com/api/v4/search?q=${encodeURIComponent(normalizedKeyword)}&language=ar&size=20`);

        if (!response.data || !response.data.search || !response.data.search.results) return [];

        // Fetch the full surah list once to get English names efficiently
        const surahList = await fetchSurahList();

        const searchResults = await Promise.all(response.data.search.results.map(async (result) => {
            let page = 1;
            let surahEnglishName = '';
            const surahNumber = parseInt(result.verse_key.split(':')[0]);

            // Find the English name from the pre-fetched list
            const surahDetail = surahList.find(s => s.number === surahNumber);
            if (surahDetail) {
                surahEnglishName = surahDetail.englishName;
            }

            try {
                // Fetch verse detail to get the page number for precise navigation
                const detailResponse = await axios.get(`https://api.quran.com/api/v4/verses/by_key/${result.verse_key}?fields=page_number`);
                page = detailResponse.data.verse.page_number;
            } catch (pError) {
                console.warn(`Could not fetch page for ${result.verse_key}`);
            }

            return {
                text: result.text.replace(/<(?:.|\n)*?>/gm, ''), // Strip any HTML tags
                ayahNumber: parseInt(result.verse_key.split(':')[1]),
                surah: {
                    number: parseInt(result.verse_key.split(':')[0]),
                    name: result.surah_name || `سورة ${result.verse_key.split(':')[0]}`,
                    englishName: '',
                },
                page: page,
                verseKey: result.verse_key
            };
        }));

        return searchResults;
    } catch (error) {
        console.error('Search Error:', error);
        return [];
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
    fetchTafsirMuyassar,
    getAyahAudioUrl,
    getDailyAyah,
    fetchPageAyahs,
    fetchPageMapping,
    fetchSurahPage,
    searchQuran,
};

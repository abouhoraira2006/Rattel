import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { RECITERS } from '@/services/api';
import { STORAGE_KEYS, getPreference, setPreference } from '@/utils/storage';
import { useAudioPlayer } from 'expo-audio';
import { ChevronDown, Pause, Play, UserCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface AudioPlayerProps {
    ayahNumber: number; // Use global ayah number for more robust URL construction
    initialSpeed?: number;
    reciterId?: string;
}

export default function AudioPlayer({ ayahNumber, initialSpeed = 1.0, reciterId: propReciterId }: AudioPlayerProps) {
    const [reciterId, setReciterId] = useState(propReciterId || 'ar.alafasy');
    const [showReciters, setShowReciters] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Construct dynamic audio URL
    const audioUrl = `https://cdn.islamic.network/quran/audio/128/${reciterId}/${ayahNumber}.mp3`;

    let player: any = null;
    try {
        player = useAudioPlayer(audioUrl);
    } catch (e) {
        console.warn('ExpoAudio module not found or failed to initialize', e);
    }

    // Sync playback speed
    useEffect(() => {
        if (player) {
            player.playbackSpeed = initialSpeed;
        }
    }, [player, initialSpeed]);

    // Sync reciter if prop changes
    useEffect(() => {
        if (propReciterId) {
            setReciterId(propReciterId);
        }
    }, [propReciterId]);

    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Initial load of preferences
    useEffect(() => {
        const loadPrefs = async () => {
            const savedReciter = await getPreference(STORAGE_KEYS.SELECTED_RECITER, 'ar.alafasy');
            setReciterId(savedReciter);
            setIsLoading(false);
        };
        loadPrefs();
    }, []);

    useEffect(() => {
        // Sync duration when available
        if (player?.duration && player.duration !== duration) {
            setDuration(player.duration);
        }

        let interval: any;

        if (player?.playing) {
            interval = setInterval(() => {
                if (player) {
                    setCurrentTime(player.currentTime);
                }
            }, 100);
        } else {
            setCurrentTime(player?.currentTime || 0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [player?.playing, player?.duration]);

    const handlePlayPause = () => {
        if (!player) return;
        if (player.playing) {
            player.pause();
        } else {
            player.play();
        }
    };

    const handleReciterChange = async (id: string) => {
        setReciterId(id);
        setShowReciters(false);
        await setPreference(STORAGE_KEYS.SELECTED_RECITER, id);
        // player will automatically update because useAudioPlayer is called with the dynamic URL
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const currentReciter = RECITERS.find(r => r.id === reciterId) || RECITERS[0];

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    if (!player) {
        return (
            <View style={[styles.container, { opacity: 0.6 }]}>
                <Text style={styles.timeText}>مشغل الصوت غير متاح حالياً</Text>
            </View>
        );
    }

    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <Pressable
                    onPress={handlePlayPause}
                    disabled={!player}
                    style={({ pressed }) => [
                        styles.playButton,
                        pressed && styles.playButtonPressed,
                    ]}
                >
                    {player.playing ? (
                        <Pause size={24} color={Colors.text.inverse} fill={Colors.text.inverse} />
                    ) : (
                        <Play size={24} color={Colors.text.inverse} fill={Colors.text.inverse} />
                    )}
                </Pressable>

                <View style={styles.progressContainer}>
                    <View style={styles.timeContainer}>
                        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>

                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                </View>

                <Pressable
                    onPress={() => setShowReciters(!showReciters)}
                    style={styles.reciterSelector}
                >
                    <UserCircle size={20} color={Colors.primary} />
                    <ChevronDown size={14} color={Colors.text.tertiary} />
                </Pressable>
            </View>

            {showReciters && (
                <View style={styles.recitersListWrapper}>
                    <Text style={styles.recitersTitle}>اختر القارئ</Text>
                    {RECITERS.map((r) => (
                        <Pressable
                            key={r.id}
                            onPress={() => handleReciterChange(r.id)}
                            style={[
                                styles.reciterItem,
                                reciterId === r.id && styles.reciterItemActive
                            ]}
                        >
                            <View>
                                <Text style={[
                                    styles.reciterName,
                                    reciterId === r.id && styles.reciterNameActive
                                ]}>
                                    {r.name}
                                </Text>
                                <Text style={styles.reciterSubtext}>{r.subtext}</Text>
                            </View>
                            {reciterId === r.id && (
                                <View style={styles.checkmark}>
                                    <Text style={styles.checkmarkText}>✓</Text>
                                </View>
                            )}
                        </Pressable>
                    ))}
                </View>
            )}

            <Text style={styles.currentReciterName}>بصوت: {currentReciter.name}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        gap: Spacing.sm,
    },
    container: {
        flexDirection: 'row-reverse', // RTL alignment for the main controls
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButtonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.95 }],
    },
    progressContainer: {
        flex: 1,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xs,
    },
    timeText: {
        fontSize: Typography.fontSize.xs,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.secondary,
    },
    progressBar: {
        height: 4,
        backgroundColor: Colors.borderLight,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.full,
    },
    reciterSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        padding: 4,
    },
    recitersListWrapper: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        marginTop: -4,
        gap: Spacing.xs,
    },
    recitersTitle: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.primary,
        textAlign: 'right',
        marginBottom: Spacing.xs,
    },
    recitersScrollView: {
        paddingHorizontal: 4,
    },
    reciterItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    reciterItemActive: {
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        borderColor: Colors.primary,
    },
    reciterName: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.amiriBold,
        color: Colors.text.secondary,
        textAlign: 'right',
    },
    reciterNameActive: {
        color: Colors.primary,
    },
    reciterSubtext: {
        fontSize: 11,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.tertiary,
        textAlign: 'right',
        marginTop: 2,
    },
    checkmark: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkText: {
        color: Colors.text.inverse,
        fontSize: 12,
        fontWeight: 'bold',
    },
    currentReciterName: {
        fontSize: 11,
        fontFamily: Typography.fontFamily.amiriRegular,
        color: Colors.text.tertiary,
        textAlign: 'right',
        marginRight: 8,
    }
});

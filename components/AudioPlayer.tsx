import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useAudioPlayer } from 'expo-audio';
import { Pause, Play } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface AudioPlayerProps {
    audioUrl: string;
}

export default function AudioPlayer({ audioUrl }: AudioPlayerProps) {
    let player: any = null;
    try {
        player = useAudioPlayer(audioUrl);
    } catch (e) {
        console.warn('ExpoAudio module not found or failed to initialize', e);
    }

    const [duration, setDuration] = useState(0);

    useEffect(() => {
        // Get duration when loaded
        if (player?.duration) {
            setDuration(player.duration);
        }
    }, [player?.duration]);

    const handlePlayPause = () => {
        if (!player) return;
        if (player.playing) {
            player.pause();
        } else {
            player.play();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const currentTime = player?.currentTime || 0;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (!player) {
        return (
            <View style={[styles.container, { opacity: 0.6 }]}>
                <Text style={styles.timeText}>مشغل الصوت غير متاح حالياً</Text>
            </View>
        );
    }

    return (
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
                    <Text style={styles.timeText}>{formatTime(player.currentTime)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>

                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    playButton: {
        width: 48,
        height: 48,
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
});

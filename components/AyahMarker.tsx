import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

interface AyahMarkerProps {
    number: number;
}

const AyahMarker: React.FC<AyahMarkerProps> = ({ number }) => {
    return (
        <View style={styles.container}>
            <Svg width="32" height="32" viewBox="0 0 36 36">
                <G transform="translate(18, 18)">
                    {/* Main Outer Decorative Shape (8-pointed star/circle) */}
                    <Path
                        d="M 0 -16 L 4 -12 L 11 -11 L 12 -4 L 16 0 L 12 4 L 11 11 L 4 12 L 0 16 L -4 12 L -11 11 L -12 4 L -16 0 L -12 -4 L -11 -11 L -4 -12 Z"
                        fill="none"
                        stroke="#D4AF37"
                        strokeWidth="1.2"
                    />

                    {/* Inner Circle */}
                    <Circle cx="0" cy="0" r="10" fill="none" stroke="#8A6E1D" strokeWidth="0.8" />

                    {/* Accent Dots */}
                    {[0, 90, 180, 270].map((angle) => (
                        <Circle key={angle} cx={14 * Math.cos(angle * Math.PI / 180)} cy={14 * Math.sin(angle * Math.PI / 180)} r="1.5" fill="#D4AF37" />
                    ))}
                </G>
            </Svg>
            <View style={styles.numberContainer}>
                <Text style={styles.numberText}>{number}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
        // Ensure it sits well inside the text line
        top: 6,
    },
    numberContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    numberText: {
        fontFamily: 'Amiri-Bold',
        fontSize: 10,
        color: '#8A6E1D',
        textAlign: 'center',
        // Small adjustment to center visually for Arabic fonts
        marginTop: -2,
    },
});

export default AyahMarker;

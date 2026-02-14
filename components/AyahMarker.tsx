import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

interface AyahMarkerProps {
    number: number;
    scale?: number;
}

const AyahMarker: React.FC<AyahMarkerProps> = ({ number, scale = 1 }) => {
    const size = 28 * scale;
    const svgSize = 24 * scale;
    const fontSize = 8 * scale;
    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Svg width={svgSize} height={svgSize} viewBox="0 0 36 36">
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
                <Text style={[styles.numberText, { fontSize: fontSize }]}>{number}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 3,
        // Centered vertically within text line
    },
    numberContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    numberText: {
        fontFamily: 'Amiri-Bold',
        color: '#8A6E1D',
        textAlign: 'center',
        marginTop: -1,
    },
});

export default AyahMarker;

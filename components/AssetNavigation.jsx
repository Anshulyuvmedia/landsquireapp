import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { useRouter } from 'expo-router';

const AssetNavigation = ({ path }) => {
    const router = useRouter();
    const [activeButton, setActiveButton] = useState(path);

    const navigateTo = (screen) => {
        setActiveButton(screen);
        router.push(`./${screen}`);
    };

    return (
        <View style={styles.buttonContainer}>
            <TouchableOpacity
                style={[styles.button, activeButton === 'AssetBuying' && styles.activeButton]}
                onPress={() => navigateTo('AssetBuying')}
            >
                <Text style={[styles.buttonText, activeButton === 'AssetBuying' && styles.activeButtonText]}>
                    Buying
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, activeButton === 'AssetSelling' && styles.activeButton]}
                onPress={() => navigateTo('AssetSelling')}
            >
                <Text style={[styles.buttonText, activeButton === 'AssetSelling' && styles.activeButtonText]}>
                    Selling
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default AssetNavigation;

const styles = StyleSheet.create({
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        backgroundColor: '#f4f2f7',
        borderRadius: 12,
        padding: 5,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    activeButton: {
        backgroundColor: '#8bc83f',
    },
    buttonText: {
        color: '#000',
        fontFamily: 'Sora-Bold',
        fontSize: 14,
        textAlign: 'center',
    },
    activeButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
});
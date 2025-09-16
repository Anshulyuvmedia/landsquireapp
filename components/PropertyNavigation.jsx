import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

const PropertyNavigation = ({ path }) => {
    const router = useRouter();
    const [activeButton, setActiveButton] = useState(path); // No default value

    const navigateTo = (screen) => {
        setActiveButton(screen);
        // console.log('path:', screen);
        router.push(`./${screen}`); // Use relative path within the layout
    };

    return (
        <View style={styles.buttonContainer}>
            <TouchableOpacity
                style={[styles.button, activeButton === 'myproperties' && styles.activeButton]}
                onPress={() => navigateTo('myproperties')}
            >
                <Text style={[styles.buttonText, activeButton === 'myproperties' && styles.activeButtonText]}>
                    Properties
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, activeButton === 'auction' && styles.activeButton]}
                onPress={() => navigateTo('auction')}
            >
                <Text style={[styles.buttonText, activeButton === 'auction' && styles.activeButtonText]}>
                    Auction
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.button, activeButton === 'myleads' && styles.activeButton]}
                onPress={() => navigateTo('myleads')}
            >
                <Text style={[styles.buttonText, activeButton === 'myleads' && styles.activeButtonText]}>
                    Leads
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default PropertyNavigation;

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
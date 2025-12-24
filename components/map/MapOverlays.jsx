// components/map/MapOverlays.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MapOverlays = ({
    currentLocationName,
    filteredDataLength,
    propertyMode,
    onNearbyPress,
    onFilterOpen,
    onPropertyModeChange,
}) => {
    return (
        <>
            {/* Location Label - Top Left */}
            <TouchableOpacity onPress={onFilterOpen} style={styles.locationContainer}>
                <Ionicons name="location-outline" size={16} color="#fff" />
                <Text style={styles.locationText}>{currentLocationName}</Text>
            </TouchableOpacity>

            {/* Top Right Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.nearbyButton} onPress={onNearbyPress}>
                    <View style={styles.propertyCount}>
                        <Text style={styles.propertyCountText}>{filteredDataLength}</Text>
                    </View>
                    <Text style={styles.nearbyButtonText}>Nearby You</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onFilterOpen} style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#1F2937" />
                </TouchableOpacity>
            </View>

            {/* Bottom Sell/Rent Toggle Bar */}
            <View style={styles.bottomToggleBar}>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        propertyMode === 'sell' && styles.toggleButtonActive,
                    ]}
                    onPress={() => onPropertyModeChange('sell')}
                >
                    <Text
                        style={[
                            styles.toggleText,
                            propertyMode === 'sell' && styles.toggleTextActive,
                        ]}
                    >
                        For Sell
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        propertyMode === 'rent' && styles.toggleButtonActive,
                    ]}
                    onPress={() => onPropertyModeChange('rent')}
                >
                    <Text
                        style={[
                            styles.toggleText,
                            propertyMode === 'rent' && styles.toggleTextActive,
                        ]}
                    >
                        For Rent
                    </Text>
                </TouchableOpacity>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    locationContainer: {
        position: 'absolute',
        top: 10,
        left: 16,
        zIndex: 10,
        backgroundColor: '#234F68',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        color: '#fff',
        fontSize: 14,
        marginLeft: 5,
    },
    buttonContainer: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    nearbyButton: {
        backgroundColor: '#234F68',
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    propertyCount: {
        backgroundColor: 'lightgreen',
        borderRadius: 10,
        paddingHorizontal: 7,
        marginRight: 7,
    },
    propertyCountText: {
        color: '#000',
        fontSize: 14,
        fontWeight: 'bold',
    },
    nearbyButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    searchContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        shadowColor: 'green',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    bottomToggleBar: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 30,
        flexDirection: 'row',
        padding: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 5,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
    },
    toggleButtonActive: {
        backgroundColor: '#234F68',
    },
    toggleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    toggleTextActive: {
        color: '#fff',
    },
});

export default MapOverlays;
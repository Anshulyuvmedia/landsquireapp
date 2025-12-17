// components/map/MapContainer.jsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import MarkersRenderer from './MarkersRenderer';

const MapContainer = ({
    mapRef,
    region,
    mapType,
    visibleItems,
    onMarkerPress,
    onRegionChangeComplete,
}) => {
    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFillObject}
                region={region}
                onRegionChangeComplete={onRegionChangeComplete}
                mapType={mapType}
                compassEnabled
            >
                <MarkersRenderer items={visibleItems} onPress={onMarkerPress} />
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
});

export default MapContainer;
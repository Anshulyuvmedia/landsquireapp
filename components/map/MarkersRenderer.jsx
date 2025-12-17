// components/map/MarkersRenderer.jsx
import React from 'react';
import { Marker, Polygon } from 'react-native-maps';
import { View, Text } from 'react-native';
import { parseCoordinates, parseProjectCoordinates, calculateCentroid, formatINR } from './utils/mapUtils';

const MarkersRenderer = ({ items, onPress }) => {
    return (
        <>
            {items.map((item) => {
                if (item.type === 'property') {
                    const coords = parseCoordinates(item.maplocations);
                    const price = formatINR(item.price || 0);
                    return (
                        <Marker
                            key={`property-${item.id}`}
                            coordinate={coords}
                            onPress={() => onPress(item)}
                            tracksViewChanges={false}
                        >
                            <View style={styles.markerContainer}>
                                <Text style={styles.markerText}>{price}</Text>
                            </View>
                        </Marker>
                    );
                } else {
                    const polyCoords = parseProjectCoordinates(item.coordinates);
                    if (polyCoords.length < 3) return null;
                    const centroid = calculateCentroid(polyCoords);
                    return (
                        <React.Fragment key={`project-${item.id}`}>
                            <Polygon
                                coordinates={polyCoords}
                                fillColor="rgba(0, 200, 0, 0.3)"
                                strokeColor="green"
                                strokeWidth={2}
                            />
                            <Marker
                                coordinate={centroid}
                                onPress={() => onPress(item)}
                                pinColor="green"
                            />
                        </React.Fragment>
                    );
                }
            })}
        </>
    );
};

const styles = {
    markerContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 4,
    },
    markerText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
};

export default React.memo(MarkersRenderer);
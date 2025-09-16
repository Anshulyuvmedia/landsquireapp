import { View, Text, TouchableOpacity } from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import * as Location from "expo-location";

// Helper function to parse project coordinates and calculate centroid
const parseProjectCoordinates = (coordinates) => {
    try {
        // Handle project coordinates (JSON string array)
        if (typeof coordinates === "string" && coordinates.trim()) {
            const coords = JSON.parse(coordinates);
            if (!Array.isArray(coords) || coords.length === 0) {
                return { centroid: null, polygon: [] };
            }
            const polygon = coords.map(c => ({
                latitude: parseFloat(c.lat), // Changed to c.lat
                longitude: parseFloat(c.lng), // Changed to c.lng
            })).filter(c => !isNaN(c.latitude) && !isNaN(c.longitude));
            if (polygon.length === 0) {
                return { centroid: null, polygon: [] };
            }
            let latSum = 0, lngSum = 0;
            polygon.forEach(c => {
                latSum += c.latitude;
                lngSum += c.longitude;
            });
            const centroid = {
                latitude: latSum / polygon.length,
                longitude: lngSum / polygon.length,
            };
            return { centroid, polygon };
        }
        // Handle property coordinates (single {latitude, longitude} object)
        else if (typeof coordinates === "object" && coordinates.latitude && coordinates.longitude) {
            const centroid = {
                latitude: parseFloat(coordinates.latitude),
                longitude: parseFloat(coordinates.longitude),
            };
            return { centroid: isNaN(centroid.latitude) || isNaN(centroid.longitude) ? null : centroid, polygon: [] };
        }
        return { centroid: null, polygon: [] };
    } catch (error) {
        console.error('Error parsing coordinates:', error);
        return { centroid: null, polygon: [] };
    }
};

const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            console.log("Permission to access location was denied");
            return null;
        }

        const results = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
        });

        if (results.length > 0) {
            const addressObj = results[0];
            return `${addressObj.city || ""}, ${addressObj.region || ""}, ${addressObj.country || ""}`;
        }
        return null;
    } catch (error) {
        console.error("Error in reverse geocoding:", error);
        return null;
    }
};

const PropertyMap = ({ coordinates, region, address, isProject = false }) => {
    // Parse coordinates based on type
    const { centroid, polygon } = parseProjectCoordinates(coordinates);
    const [resolvedAddress, setResolvedAddress] = useState(address);
    // Use provided region or fallback to centroid if available
    const mapRegion = region || (centroid ? {
        latitude: centroid.latitude,
        longitude: centroid.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
    } : {
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
    });

    useEffect(() => {
        if (centroid) {
            getAddressFromCoordinates(centroid.latitude, centroid.longitude)
                .then(loc => {
                    if (loc) setResolvedAddress(loc);
                });
        }
    }, [centroid]);
    return (
        <View className="px-5 mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">Location</Text>
            <View className="flex flex-row items-center justify-start my-4 gap-2 mr-3">
                <Ionicons name="location-outline" size={22} color="#234F68" />
                <Text className="text-black-200 text-sm font-rubik-medium flex-1">{resolvedAddress}</Text>
            </View>
            <View>
                <MapView
                    style={{ height: 350, borderRadius: 10 }}
                    region={mapRegion}
                    initialRegion={mapRegion}
                    mapType="hybrid"
                >
                    {centroid && (
                        <Marker
                            coordinate={{
                                latitude: centroid.latitude,
                                longitude: centroid.longitude,
                            }}
                            pinColor={isProject ? "green" : "red"} // Green for projects, red for properties
                        />
                    )}
                    {isProject && polygon.length >= 3 && (
                        <Polygon
                            coordinates={polygon}
                            fillColor="rgba(0, 200, 0, 0.5)" // Increased opacity
                            strokeColor="green"
                            strokeWidth={2}
                        />
                    )}
                </MapView>
                <TouchableOpacity
                    onPress={() =>
                        centroid && Linking.openURL(
                            `https://www.google.com/maps/search/?api=1&query=${centroid.latitude},${centroid.longitude}`
                        )
                    }
                    disabled={!centroid}
                >
                    <Text
                        className={`text-black-300 text-center font-rubik-medium mt-2 bg-blue-100 flex-grow p-2 rounded-full ${!centroid ? "opacity-50" : ""}`}
                    >
                        View Location
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default PropertyMap;
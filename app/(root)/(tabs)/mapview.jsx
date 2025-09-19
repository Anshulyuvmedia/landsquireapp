import { StyleSheet, View, FlatList, TextInput, TouchableOpacity, Text, ActivityIndicator, Pressable, Platform } from 'react-native';
import React, { useRef, useState, useEffect, memo } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE, Polygon } from 'react-native-maps';
import axios from 'axios';
import { MapCard } from '@/components/Cards';
import Constants from 'expo-constants';
import debounce from 'lodash.debounce';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

// Make Buffer global if needed
global.Buffer = Buffer;

// Parse coordinates
const parseCoordinates = (maplocations) => {
    try {
        const location = JSON.parse(maplocations);
        const latitude = parseFloat(location.Latitude);
        const longitude = parseFloat(location.Longitude);
        if (isNaN(latitude) || isNaN(longitude)) {
            throw new Error('Invalid coordinates');
        }
        return { latitude, longitude };
    } catch (error) {
        console.error('Error parsing maplocations:', error);
        return { latitude: 26.4499, longitude: 74.6399 }; // Default coordinates (Ajmer)
    }
};

// Parse project coordinates
const parseProjectCoordinates = (coordinatesStr) => {
    try {
        const coords = JSON.parse(coordinatesStr);
        return coords.map(c => ({
            latitude: parseFloat(c.lat),
            longitude: parseFloat(c.lng),
        }));
    } catch (error) {
        console.error('Error parsing project coordinates:', error);
        return [];
    }
};

// Calculate centroid for project polygon
const calculateCentroid = (coords) => {
    if (coords.length === 0) return { latitude: 26.4499, longitude: 74.6399 };
    let latSum = 0, lngSum = 0;
    coords.forEach(c => {
        latSum += c.latitude;
        lngSum += c.longitude;
    });
    return {
        latitude: latSum / coords.length,
        longitude: lngSum / coords.length,
    };
};

const Mapview = () => {
    const GOOGLE_MAPS_API_KEY = Constants.expoConfig.extra.GOOGLE_MAPS_API_KEY;
    const mapRef = useRef(null);
    const router = useRouter();
    const flatListRef = useRef(null);
    const [propertiesData, setPropertiesData] = useState([]);
    const [projectsData, setProjectsData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [visibleItems, setVisibleItems] = useState([]);
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [region, setRegion] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [citySuggestions, setCitySuggestions] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null);
    const [currentLocationName, setCurrentLocationName] = useState('Ajmer');
    const [page, setPage] = useState(1);
    const [itemsPerPage] = useState(8);
    const [markersPerPage] = useState(10);
    const [hasMore, setHasMore] = useState(true);
    const [mapType, setMapType] = useState('hybrid');
    const [displayMode, setDisplayMode] = useState('properties');
    const [propertyMode, setPropertyMode] = useState('sell');

    const viewItem = (item) => {
        const route = item.type === 'project' ? `/projects/${item.id}` : `/properties/${item.id}`;
        router.push(route);
    };

    const toggleMapType = () => {
        setMapType((prevType) => {
            if (prevType === 'hybrid') return 'standard';
            if (prevType === 'standard') return 'satellite';
            return 'hybrid';
        });
    };

    const toggleDisplayMode = () => {
        setDisplayMode((prev) => prev === 'properties' ? 'projects' : 'properties');
        setPage(1); // Reset page on mode change
    };

    const togglePropertyMode = () => {
        setPropertyMode((prev) => prev === 'sell' ? 'rent' : 'sell');
        setPage(1); // Reset page on mode change
    };

    const fetchFilterData = async (city) => {
        setLoading(true);
        setPropertiesData([]);
        setProjectsData([]);
        setFilteredData([]);
        setVisibleItems([]);
        setError(null);
        setPage(1);
        setHasMore(true);

        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
            setError('Please log in to access properties.');
            router.push('/signin');
            setLoading(false);
            return;
        }

        try {
            // Fetch properties with city filter
            const queryParams = new URLSearchParams();
            if (city) queryParams.append("filtercity", city);

            const apiUrl = `https://landsquire.in/api/filterlistings?${queryParams.toString()}`;
            const response = await axios.get(apiUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });

            const properties = response.data?.data || [];
            setPropertiesData(properties);

            // Fetch projects with city filter
            const projectsResponse = await axios.get('https://landsquire.in/api/upcomingproject', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
                params: {
                    city: city || undefined,
                    latitude: region?.latitude || 26.4499,
                    longitude: region?.longitude || 74.6399,
                    latitudeDelta: region?.latitudeDelta || 5.0,
                    longitudeDelta: region?.longitudeDelta || 5.0,
                },
            });

            const projects = projectsResponse.data?.projects || [];
            setProjectsData(projects);

            if (properties.length === 0 && projects.length === 0) {
                setError(`No ${displayMode} found for ${city || 'the selected area'}.`);
            } else {
                setError(null);
            }
        } catch (error) {
            console.error("Error fetching filtered data:", error.response?.data || error.message);
            setError(error.response?.status === 404
                ? `No ${displayMode} found for ${city || 'the selected area'}.`
                : error.message.includes("Network Error")
                    ? "Network error. Please check your internet connection."
                    : "An unexpected error occurred. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const fetchListingData = async (mapRegion) => {
        setLoading(true);
        setError(null);

        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
            setError('Please log in to access data.');
            router.push('/signin');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get('https://landsquire.in/api/property-listings', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
                params: {
                    latitude: mapRegion?.latitude || 26.4499,
                    longitude: mapRegion?.longitude || 74.6399,
                    latitudeDelta: mapRegion?.latitudeDelta || 5.0,
                    longitudeDelta: mapRegion?.longitudeDelta || 5.0,
                },
            });

            const projectsResponse = await axios.get('https://landsquire.in/api/upcomingproject', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
                params: {
                    latitude: mapRegion?.latitude || 26.4499,
                    longitude: mapRegion?.longitude || 74.6399,
                    latitudeDelta: mapRegion?.latitudeDelta || 5.0,
                    longitudeDelta: mapRegion?.longitudeDelta || 5.0,
                },
            });

            setPropertiesData(response.data?.data || []);
            setProjectsData(projectsResponse.data?.projects || []);

            if (!region && (response.data?.data?.length > 0 || projectsResponse.data?.projects?.length > 0)) {
                let firstCoords;
                if (response.data?.data?.length > 0) {
                    firstCoords = parseCoordinates(response.data.data[0].maplocations);
                } else if (projectsResponse.data?.projects?.length > 0) {
                    const polyCoords = parseProjectCoordinates(projectsResponse.data.projects[0].coordinates);
                    firstCoords = calculateCentroid(polyCoords);
                }
                if (firstCoords) {
                    setRegion({
                        latitude: firstCoords.latitude,
                        longitude: firstCoords.longitude,
                        latitudeDelta: 5.0,
                        longitudeDelta: 5.0,
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setPropertiesData([]);
            setProjectsData([]);
            setFilteredData([]);
            setVisibleItems([]);
            if (error.response?.status === 401) {
                await AsyncStorage.removeItem('userToken');
                await AsyncStorage.removeItem('userData');
                router.push('/signin');
            }
            setError(error.message.includes("Network Error")
                ? "Network error. Please check your internet connection."
                : "An unexpected error occurred. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let data = [];
        if (displayMode === 'properties') {
            let props = propertiesData.map(p => ({
                ...p,
                type: 'property',
                propertyfor: p.propertyfor || 'sell',
            }));
            props = props.filter(p => p.propertyfor.toLowerCase() === propertyMode.toLowerCase());
            if (selectedCity) {
                props = props.filter(p => p.city?.toLowerCase() === selectedCity.toLowerCase());
            }
            data = [...data, ...props];
        } else {
            let projs = projectsData.map(p => ({ ...p, type: 'project' }));
            if (selectedCity) {
                projs = projs.filter(p => p.city?.toLowerCase() === selectedCity.toLowerCase());
            }
            data = [...data, ...projs];
        }

        const paginatedData = data.slice(0, page * itemsPerPage);
        setFilteredData(paginatedData);
        setHasMore(data.length > paginatedData.length);
    }, [propertiesData, projectsData, displayMode, propertyMode, selectedCity, page]);

    const loadMoreData = () => {
        if (loading || !hasMore) return;
        setLoading(true);
        setPage(prev => prev + 1);
        setLoading(false);
    };

    useEffect(() => {
        const rajasthanRegion = {
            latitude: 26.4499,
            longitude: 74.6399,
            latitudeDelta: 5.0,
            longitudeDelta: 5.0,
        };
        setRegion(rajasthanRegion);
        fetchListingData(rajasthanRegion);
    }, []);

    const getCurrentLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('Location permission denied. Please enable location access.');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 5.0,
                longitudeDelta: 5.0,
            };
            setRegion(newRegion);
            setSelectedCity(null);
            mapRef.current?.animateToRegion(newRegion, 500);

            const geocode = await axios.get(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
            );
            if (geocode.data.status === 'OK') {
                const addressComponents = geocode.data.results[0].address_components;
                const cityComponent = addressComponents.find(comp => comp.types.includes('locality'));
                const city = cityComponent ? cityComponent.long_name : 'Unknown Location';
                setCurrentLocationName(city);
                setSelectedCity(city);
                fetchFilterData(city);
            } else {
                setCurrentLocationName('Unknown Location');
            }
        } catch (error) {
            console.error('Error getting location:', error);
            setError("Unable to get your location. Please try again.");
        }
    };

    const fetchCitySuggestions = async (query) => {
        if (!query || query.trim() === '') {
            setCitySuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const response = await axios.get(
                'https://maps.googleapis.com/maps/api/place/autocomplete/json',
                {
                    params: {
                        input: query,
                        types: '(cities)',
                        key: GOOGLE_MAPS_API_KEY,
                    },
                }
            );

            if (response.data.status === 'OK') {
                const suggestions = await Promise.all(
                    response.data.predictions.map(async (prediction) => {
                        try {
                            const detailsResponse = await axios.get(
                                'https://maps.googleapis.com/maps/api/place/details/json',
                                {
                                    params: {
                                        place_id: prediction.place_id,
                                        fields: 'address_components',
                                        key: GOOGLE_MAPS_API_KEY,
                                    },
                                }
                            );
                            if (detailsResponse.data.status === 'OK') {
                                const addressComponents = detailsResponse.data.result.address_components;
                                const cityComponent = addressComponents.find(comp => comp.types.includes('locality'));
                                const city = cityComponent ? cityComponent.long_name : prediction.description.split(',')[0];
                                return {
                                    description: city,
                                    place_id: prediction.place_id,
                                };
                            }
                            return { description: prediction.description.split(',')[0], place_id: prediction.place_id };
                        } catch (error) {
                            console.error('Error fetching place details:', error);
                            return { description: prediction.description.split(',')[0], place_id: prediction.place_id };
                        }
                    })
                );
                setCitySuggestions(suggestions);
                setShowSuggestions(true);
            } else {
                setCitySuggestions([]);
                setShowSuggestions(false);
                setError("Unable to fetch city suggestions. Please try again.");
            }
        } catch (error) {
            console.error('Error fetching city suggestions:', error);
            setCitySuggestions([]);
            setShowSuggestions(false);
            setError("Unable to fetch city suggestions. Please try again.");
        }
    };

    const debouncedFetchCitySuggestions = debounce(fetchCitySuggestions, 300);

    const getCityDetails = async (placeId) => {
        try {
            const response = await axios.get(
                'https://maps.googleapis.com/maps/api/place/details/json',
                {
                    params: {
                        place_id: placeId,
                        fields: 'geometry,address_components',
                        key: GOOGLE_MAPS_API_KEY,
                    },
                }
            );

            if (response.data.status === 'OK') {
                const { lat, lng } = response.data.result.geometry.location;
                const addressComponents = response.data.result.address_components;
                const cityComponent = addressComponents.find(comp => comp.types.includes('locality'));
                const city = cityComponent ? cityComponent.long_name : 'Unknown City';
                const newRegion = {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 5.0,
                    longitudeDelta: 5.0,
                };
                setSelectedCity(city);
                setCurrentLocationName(city);
                setRegion(newRegion);
                mapRef.current?.animateToRegion(newRegion, 500);
                fetchFilterData(city);
            } else {
                setError("Unable to fetch city details. Please try again.");
            }
        } catch (error) {
            console.error('Error fetching city coordinates:', error);
            setError("Unable to fetch city details. Please try again.");
        }
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        debouncedFetchCitySuggestions(query);

        if (query.trim() === '') {
            setSelectedCity(null);
            setCurrentLocationName('Ajmer');
            setShowSuggestions(false);
            setError(null);
            const ajmerRegion = {
                latitude: 26.4499,
                longitude: 74.6399,
                latitudeDelta: 5.0,
                longitudeDelta: 5.0,
            };
            setRegion(ajmerRegion);
            fetchListingData(ajmerRegion);
        } else {
            setShowSuggestions(true);
        }
    };

    const handleSuggestionPress = (suggestion) => {
        setSearchQuery(suggestion.description);
        setShowSuggestions(false);
        getCityDetails(suggestion.place_id);
    };

    const handleMarkerPress = (item) => {
        setSelectedItemId(item.id);
        let coords;
        if (item.type === 'property') {
            coords = parseCoordinates(item.maplocations);
        } else {
            const polyCoords = parseProjectCoordinates(item.coordinates);
            coords = calculateCentroid(polyCoords);
        }

        mapRef.current?.animateToRegion(
            {
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            },
            500
        );

        const index = filteredData.findIndex((p) => p.id === item.id && p.type === item.type);
        if (index !== -1) {
            try {
                flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
            } catch (error) {
                console.warn('Failed to scroll to index:', error);
                setTimeout(() => {
                    flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
                }, 100);
            }
        } else {
            setError('Selected item is not in the current list. Try searching or loading more.');
        }
    };

    const handleCardPress = debounce(async (item) => {
        setSelectedItemId(item.id);
        let coords;
        if (item.type === 'property') {
            coords = parseCoordinates(item.maplocations);
        } else {
            const polyCoords = parseProjectCoordinates(item.coordinates);
            coords = calculateCentroid(polyCoords);
        }

        try {
            const geocode = await axios.get(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=${GOOGLE_MAPS_API_KEY}`
            );
            if (geocode.data.status === 'OK') {
                const addressComponents = geocode.data.results[0].address_components;
                const cityComponent = addressComponents.find(comp => comp.types.includes('locality'));
                const city = cityComponent ? cityComponent.long_name : 'Unknown Location';
                setCurrentLocationName(city);
            } else {
                setCurrentLocationName('Unknown Location');
            }
        } catch (error) {
            console.error('Error reverse geocoding item location:', error);
            setCurrentLocationName('Unknown Location');
        }

        mapRef.current?.animateToRegion(
            {
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
            },
            500
        );
    }, 300);

    const handleRegionChange = (newRegion) => {
        setRegion(newRegion);
    };

    const updateVisibleItems = () => {
        if (!filteredData || !region) {
            setVisibleItems([]);
            return;
        }

        const latDelta = region.latitudeDelta / 2;
        const lngDelta = region.longitudeDelta / 2;

        const itemsInRegion = filteredData.filter((item) => {
            let coords;
            if (item.type === 'property') {
                coords = parseCoordinates(item.maplocations);
            } else {
                const polyCoords = parseProjectCoordinates(item.coordinates);
                coords = calculateCentroid(polyCoords);
            }
            return (
                coords.latitude >= region.latitude - latDelta &&
                coords.latitude <= region.latitude + latDelta &&
                coords.longitude >= region.longitude - lngDelta &&
                coords.longitude <= region.longitude + lngDelta
            );
        });

        setVisibleItems(itemsInRegion.slice(0, page * markersPerPage));
    };

    useEffect(() => {
        updateVisibleItems();
    }, [filteredData, region, page]);

    const formatINR = (amount) => {
        if (!amount) return '₹0';
        const cleaned = String(amount).replace(/[₹,]/g, '').trim();
        const num = Number(cleaned);
        if (isNaN(num) || num <= 0) return '₹0';
        if (num >= 1e7) {
            return '₹' + (num / 1e7).toFixed(2).replace(/\.00$/, '') + ' Cr';
        } else if (num >= 1e5) {
            return '₹' + (num / 1e5).toFixed(1).replace(/\.0$/, '') + ' Lakh';
        }
        return '₹' + num.toLocaleString('en-IN');
    };

    return (
        <Pressable style={styles.container} onPress={() => setShowSuggestions(false)}>
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>Loading data...</Text>
                </View>
            )}

            <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={16} color="#fff" />
                <Text style={styles.locationText}>{currentLocationName}</Text>
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.nearbyButton} onPress={getCurrentLocation}>
                    <View style={styles.propertyCount}>
                        <Text style={styles.propertyCountText}>{filteredData.length}</Text>
                    </View>
                    <Text style={styles.nearbyButtonText}>Nearby You</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapTypeButton} onPress={toggleMapType}>
                    <Text style={styles.mapTypeButtonText}>
                        {mapType.charAt(0).toUpperCase() + mapType.slice(1)}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by city..."
                    placeholderTextColor="#888"
                    value={searchQuery}
                    onChangeText={handleSearch}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                <TouchableOpacity style={styles.searchIcon}>
                    <Ionicons name="search-outline" size={20} color="#1F2937" />
                </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
                <TouchableOpacity style={styles.mapTypeButton} onPress={toggleDisplayMode}>
                    <Text style={styles.mapTypeButtonText}>
                        {displayMode.charAt(0).toUpperCase() + displayMode.slice(1)}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapTypeButton} onPress={togglePropertyMode}>
                    <Text style={styles.mapTypeButtonText}>
                        {propertyMode.charAt(0).toUpperCase() + propertyMode.slice(1)}
                    </Text>
                </TouchableOpacity>
            </View>

            {showSuggestions && citySuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                    <Text style={styles.suggestionsTitle}>Cities</Text>
                    {citySuggestions.map((suggestion, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.suggestionItem}
                            onPress={() => handleSuggestionPress(suggestion)}
                        >
                            <Text style={styles.suggestionText}>{suggestion.description}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {showSuggestions && (
                <View style={styles.overlay} />
            )}

            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    latitude: 26.4499,
                    longitude: 74.6399,
                    latitudeDelta: 5.0,
                    longitudeDelta: 5.0,
                }}
                region={region}
                onRegionChangeComplete={handleRegionChange}
                compassEnabled={true}
                mapType={mapType}
            >
                {visibleItems.map((item) => {
                    if (item.type === 'property') {
                        const coords = parseCoordinates(item.maplocations);
                        const proptype = item.category || 'Unknown';
                        const price = item.price || 0;
                        const formatted = formatINR(price);

                        return (
                            <Marker
                                key={`property-${item.id}`}
                                coordinate={coords}
                                onPress={() => handleMarkerPress(item)}
                                tracksViewChanges={false}
                            >
                                <View style={styles.markerContainer}>
                                    {proptype === 'Agriculture' ? (
                                        <MaterialIcons name="house-siding" size={18} color="#234F68" style={{ marginRight: 4 }} />
                                    ) : (
                                        <Ionicons name="home-outline" size={18} color="#234F68" style={{ marginRight: 4 }} />
                                    )}
                                    <Text style={styles.markerText}>{formatted}</Text>
                                </View>
                                <View style={styles.trianglePointer} />
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
                                    tracksViewChanges={false}
                                />
                                <Marker
                                    coordinate={centroid}
                                    pinColor="green"
                                    onPress={() => handleMarkerPress(item)}
                                    tracksViewChanges={false}
                                />
                            </React.Fragment>
                        );
                    }
                })}
            </MapView>

            {error && !loading && (
                <View style={styles.errorContainer}>
                    <View style={styles.noResultsContainer}>
                        <Text style={styles.noResultsText}>{error}</Text>
                    </View>
                </View>
            )}
            {!error && !loading && visibleItems.length === 0 && filteredData.length === 0 && (
                <View style={styles.errorContainer}>
                    <View style={styles.noResultsContainer}>
                        <Text style={styles.noResultsText}>No real estate found for {selectedCity || 'the selected area'}</Text>
                    </View>
                </View>
            )}

            <FlatList
                ref={flatListRef}
                data={filteredData}
                renderItem={({ item }) => (
                    <MapCard
                        item={{
                            ...item,
                            property_name: item.property_name || item.projecttitle,
                            description: item.description || item.discription,
                        }}
                        map={'true'}
                        onPress={() => handleCardPress(item)}
                        onView={() => viewItem(item)}
                    />
                )}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                horizontal
                bounces={false}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 20, paddingHorizontal: 16 }}
                style={styles.cardList}
                initialNumToRender={itemsPerPage}
                maxToRenderPerBatch={itemsPerPage}
                windowSize={itemsPerPage}
                ListFooterComponent={() => hasMore && !loading ? (
                    <TouchableOpacity style={styles.viewMoreButton} onPress={loadMoreData}>
                        <Text style={styles.viewMoreText}>Load More</Text>
                    </TouchableOpacity>
                ) : null}
                onScrollToIndexFailed={(info) => {
                    setTimeout(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
                    }, 500);
                }}
            />
        </Pressable>
    );
};

export default Mapview;

// Styles remain the same as provided
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    map: {
        flex: 1,
    },
    searchContainer: {
        position: 'absolute',
        top: 60,
        left: 15,
        right: 15,
        zIndex: 2,
        flexDirection: 'row',
        alignItems: 'center',
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
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    searchIcon: {
        marginLeft: 10,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: 130,
        left: 16,
        right: 16,
        zIndex: 2,
        backgroundColor: '#e0e6e9',
        borderRadius: 25,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    suggestionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    suggestionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e6e9',
    },
    suggestionText: {
        fontSize: 16,
        color: '#333',
    },
    buttonContainer: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterContainer: {
        position: 'absolute',
        top: 130,
        right: 10,
        zIndex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    propertyCount: {
        backgroundColor: 'lightgreen',
        borderRadius: 10,
        paddingInline: 7,
        marginRight: 7,
    },
    propertyCountText: {
        color: '#000',
        fontSize: 14,
    },
    errorContainer: {
        position: 'absolute',
        bottom: 100,
        left: 10,
        right: 10,
        zIndex: 1,
        alignItems: 'center',
    },
    nearbyButton: {
        backgroundColor: '#234F68',
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    nearbyButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    mapTypeButton: {
        backgroundColor: '#234F68',
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    mapTypeButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    noResultsContainer: {
        backgroundColor: '#234F68',
        borderRadius: 25,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    noResultsText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
    cardList: {
        position: 'absolute',
        bottom: 90,
        left: 0,
        right: 0,
    },
    loadingContainer: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        zIndex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#fff',
    },
    locationContainer: {
        position: 'absolute',
        top: 10,
        left: 16,
        zIndex: 1,
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
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1,
    },
    viewMoreButton: {
        backgroundColor: '#234F68',
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 10,
    },
    viewMoreText: {
        color: '#fff',
        fontSize: 14,
    },
    markerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
        marginLeft: 6,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    trianglePointer: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#fff',
        marginTop: -1,
    },
});
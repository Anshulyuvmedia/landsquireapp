import { StyleSheet, View, TextInput, TouchableOpacity, Text, ActivityIndicator, Pressable, Dimensions, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE, Polygon } from 'react-native-maps';
import axios from 'axios';
import { MapCard } from '@/components/Cards';
import Constants from 'expo-constants';
import debounce from 'lodash.debounce';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import RBSheet from 'react-native-raw-bottom-sheet';
import { useTranslation } from 'react-i18next';

// Make Buffer global if needed
global.Buffer = Buffer;

const parseCoordinates = (maplocations) => {
    try {
        if (!maplocations) throw new Error('maplocations is missing');
        const location = JSON.parse(maplocations);
        const latitude = parseFloat(location.Latitude);
        const longitude = parseFloat(location.Longitude);
        if (isNaN(latitude) || isNaN(longitude)) {
            throw new Error('Invalid coordinates');
        }
        return { latitude, longitude };
    } catch (error) {
        console.error('Error parsing maplocations:', error, maplocations);
        return { latitude: 26.4499, longitude: 74.6399 }; // Default to Ajmer
    }
};

const parseProjectCoordinates = (coordinatesStr) => {
    try {
        if (!coordinatesStr) throw new Error('coordinates is missing');
        const coords = JSON.parse(coordinatesStr);
        if (!Array.isArray(coords)) throw new Error('Coordinates is not an array');
        return coords
            .filter((c) => c.lat && c.lng && !isNaN(parseFloat(c.lat)) && !isNaN(parseFloat(c.lng)))
            .map((c) => ({
                latitude: parseFloat(c.lat),
                longitude: parseFloat(c.lng),
            }));
    } catch (error) {
        console.error('Error parsing project coordinates:', error, coordinatesStr);
        return [];
    }
};

// Calculate centroid for project polygon
const calculateCentroid = (coords) => {
    if (coords.length === 0) return { latitude: 26.4499, longitude: 74.6399 };
    let latSum = 0,
        lngSum = 0;
    coords.forEach((c) => {
        latSum += c.latitude;
        lngSum += c.longitude;
    });
    return {
        latitude: latSum / coords.length,
        longitude: lngSum / coords.length,
    };
};

// Mock user context
const useUser = () => ({
    city: null, // Replace with actual user city from context
});

// Subcategory options
const subcategoryOptions = {
    Agriculture: [
        { label: 'Plot', value: 'Plot' },
        { label: 'House', value: 'House' },
    ],
    Approved: [
        { label: 'Plot', value: 'Plot' },
        { label: 'House', value: 'House' },
        { label: 'Apartment', value: 'Apartment' },
    ],
    Commercial: [
        { label: 'Plot', value: 'Plot' },
        { label: 'Land', value: 'Land' },
        { label: 'Shop', value: 'Shop' },
        { label: 'Office', value: 'Office' },
        { label: 'Other', value: 'Other' },
    ],
};

const Mapview = () => {
    const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY || '';
    const mapRef = useRef(null);
    const router = useRouter();
    const { t } = useTranslation();
    const filterSheetRef = useRef(null);
    const propertySheetRef = useRef(null);
    const [propertiesData, setPropertiesData] = useState([]);
    const [projectsData, setProjectsData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [visibleItems, setVisibleItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [region, setRegion] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [citySuggestions, setCitySuggestions] = useState([]);
    const [selectedCity, setSelectedCity] = useState(null);
    const [currentLocationName, setCurrentLocationName] = useState('Ajmer');
    const [page, setPage] = useState(1);
    const [markersPerPage] = useState(10);
    const [hasMore, setHasMore] = useState(true);
    const [mapType, setMapType] = useState('hybrid');
    const [displayMode, setDisplayMode] = useState('properties');
    const [propertyMode, setPropertyMode] = useState('sell');
    const [categoryData, setCategoryData] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState(null);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sqftFrom, setSqftFrom] = useState('');
    const [sqftTo, setSqftTo] = useState('');
    const { city: userCity } = useUser();
    const isInitialFetch = useRef(true); // Track initial fetch to prevent redundant calls

    const viewItem = useCallback((item) => {
        const route = item.type === 'project' ? `/projects/${item.id}` : `/properties/${item.id}`;
        router.push(route);
    }, [router]);

    const toggleMapType = useCallback(() => {
        setMapType((prevType) => {
            if (prevType === 'hybrid') return 'standard';
            if (prevType === 'standard') return 'satellite';
            return 'hybrid';
        });
    }, []);

    const handlePropertyForToggle = useCallback((option) => {
        setPropertyMode(option.toLowerCase());
    }, []);

    const handleCategoryToggle = useCallback((category) => {
        setSelectedCategory(category);
        setSelectedSubCategory(null);
    }, []);

    const handleReset = useCallback(() => {
        setSelectedCity(null);
        setPropertyMode('sell');
        setSelectedCategory(null);
        setSelectedSubCategory(null);
        setMinPrice('');
        setMaxPrice('');
        setSqftFrom('');
        setSqftTo('');
        setSearchQuery('');
        setShowSuggestions(false);
        initializeRegion();
    }, []);

    const handleSubmit = useCallback(async () => {
        setLoading(true);
        filterSheetRef.current?.close();
        await fetchFilterData(selectedCity);
        setLoading(false);
    }, [selectedCity]);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                setError('Please log in to access categories.');
                router.push('/signin');
                return;
            }
            const response = await axios.get('https://landsquire.in/api/get-categories', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });
            if (response.data?.categories) {
                setCategoryData(response.data.categories);
            } else {
                console.error('Unexpected API response format:', response.data);
                setCategoryData([]);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            setError('Failed to load categories. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [router]);

    const fetchFilterData = useCallback(
        async (city) => {
            setLoading(true);
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
                const queryParams = new URLSearchParams();
                if (city) queryParams.append('filtercity', city);
                if (selectedCategory) queryParams.append('category', selectedCategory);
                if (selectedSubCategory) queryParams.append('subcategory', selectedSubCategory);
                if (minPrice) queryParams.append('min_price', minPrice);
                if (maxPrice) queryParams.append('max_price', maxPrice);
                if (sqftFrom) queryParams.append('min_sqft', sqftFrom);
                if (sqftTo) queryParams.append('max_sqft', sqftTo);
                if (propertyMode) queryParams.append('type', propertyMode);

                const apiUrl = `https://landsquire.in/api/filterlistings?${queryParams.toString()}`;
                const response = await axios.get(apiUrl, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'User-Agent': 'LandSquireApp/1.0 (React Native)',
                    },
                });

                const properties = Array.isArray(response.data?.data) ? response.data.data : [];
                const projectsResponse = await axios.get('https://landsquire.in/api/upcomingproject', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'User-Agent': 'LandSquireApp/1.0 (React Native)',
                    },
                    params: { city: city || undefined },
                });

                const projects = Array.isArray(projectsResponse.data?.projects) ? projectsResponse.data.projects : [];
                const formattedProperties = properties
                    .filter((item) => item.maplocations) // Ensure maplocations exists
                    .map((item) => ({ ...item, type: 'property' }));
                const formattedProjects = projects
                    .filter((item) => item.coordinates) // Ensure coordinates exists
                    .map((item) => ({ ...item, type: 'project' }));

                setPropertiesData(formattedProperties);
                setProjectsData(formattedProjects);
                setFilteredData(displayMode === 'properties' ? formattedProperties : formattedProjects);

                if (formattedProperties.length === 0 && formattedProjects.length === 0) {
                    setError(`No ${displayMode} found for ${city || 'the selected area'}.`);
                } else if (!region && (formattedProperties.length > 0 || formattedProjects.length > 0)) {
                    let firstCoords;
                    if (formattedProperties.length > 0) {
                        firstCoords = parseCoordinates(formattedProperties[0].maplocations);
                    } else if (formattedProjects.length > 0) {
                        const polyCoords = parseProjectCoordinates(formattedProjects[0].coordinates);
                        firstCoords = calculateCentroid(polyCoords);
                    }
                    if (firstCoords && !isNaN(firstCoords.latitude) && !isNaN(firstCoords.longitude)) {
                        const newRegion = {
                            latitude: firstCoords.latitude,
                            longitude: firstCoords.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        };
                        setRegion(newRegion);
                        mapRef.current?.animateToRegion(newRegion, 500);
                    } else {
                        // Fallback to Ajmer if coordinates are invalid
                        const fallbackRegion = {
                            latitude: 26.4499,
                            longitude: 74.6399,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        };
                        setRegion(fallbackRegion);
                        mapRef.current?.animateToRegion(fallbackRegion, 500);
                    }
                }
                // Update visible items immediately after fetching
                updateVisibleItems();
            } catch (error) {
                console.error('Error fetching filtered data:', error.response?.data || error.message);
                setError(
                    error.response?.status === 404
                        ? `No ${displayMode} found for ${city || 'the selected area'}.`
                        : error.message.includes('Network Error')
                            ? 'Network error. Please check your internet connection.'
                            : 'An unexpected error occurred. Please try again.'
                );
            } finally {
                setLoading(false);
            }
        },
        [displayMode, selectedCategory, selectedSubCategory, minPrice, maxPrice, sqftFrom, sqftTo, propertyMode, router, updateVisibleItems]
    );

    const initializeRegion = useCallback(async () => {
        if (!isInitialFetch.current) return;
        isInitialFetch.current = false;

        setLoading(true);
        const initialCity = userCity || 'Ajmer';
        try {
            if (!GOOGLE_MAPS_API_KEY) {
                throw new Error('Google Maps API key is missing.');
            }
            const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: {
                    address: initialCity,
                    key: GOOGLE_MAPS_API_KEY,
                },
            });
            if (response.data.status === 'OK') {
                const { lat, lng } = response.data.results[0].geometry.location;
                const newRegion = {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.05, // Adjusted for a closer zoom level
                    longitudeDelta: 0.05,
                };
                setRegion(newRegion);
                setCurrentLocationName(initialCity);
                setSelectedCity(initialCity);
                await fetchFilterData(initialCity);
                mapRef.current?.animateToRegion(newRegion, 500);
            } else {
                throw new Error('Failed to geocode initial city.');
            }
        } catch (error) {
            console.error('Error initializing region:', error);
            // Fallback to Ajmer's coordinates
            const defaultRegion = {
                latitude: 26.4499,
                longitude: 74.6399,
                latitudeDelta: 0.05, // Adjusted for a closer zoom level
                longitudeDelta: 0.05,
            };
            setRegion(defaultRegion);
            setCurrentLocationName('Ajmer');
            setSelectedCity('Ajmer');
            await fetchFilterData('Ajmer');
            mapRef.current?.animateToRegion(defaultRegion, 500); // Ensure map updates
        } finally {
            setLoading(false);
        }
    }, [fetchFilterData, userCity, GOOGLE_MAPS_API_KEY]);

    const getCurrentLocation = useCallback(async () => {
        setLoading(true);
        try {
            const providerStatus = await Location.getProviderStatusAsync();
            if (!providerStatus.locationServicesEnabled) {
                setError('Location services are disabled. Please enable them in your device settings.');
                await fetchFilterData('Ajmer');
                return;
            }

            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('Location permission denied. Please enable location access in app settings.');
                await fetchFilterData('Ajmer');
                return;
            }

            const locationPromise = Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Location request timed out')), 10000)
            );

            const location = await Promise.race([locationPromise, timeoutPromise]);
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
                const cityComponent = addressComponents.find((comp) => comp.types.includes('locality'));
                const city = cityComponent ? cityComponent.long_name : 'Unknown Location';
                setCurrentLocationName(city);
                setSelectedCity(city);
                await fetchFilterData(city);
            } else {
                setCurrentLocationName('Unknown Location');
                await fetchFilterData('Ajmer');
            }
        } catch (error) {
            console.error('Error getting location:', error.message);
            let errorMessage = 'Unable to get your location. Please try again.';
            if (error.message.includes('Location services are disabled')) {
                errorMessage = 'Location services are disabled. Please enable them in your device settings.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Location request timed out. Please check your connection and try again.';
            }
            setError(errorMessage);
            await fetchFilterData('Ajmer');
        } finally {
            setLoading(false);
        }
    }, [fetchFilterData, GOOGLE_MAPS_API_KEY]);

    const fetchCitySuggestions = useCallback(async (query) => {
        if (!query || query.trim() === '') {
            setCitySuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            if (!GOOGLE_MAPS_API_KEY) {
                throw new Error('Google Maps API key is missing.');
            }
            const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
                params: {
                    input: query,
                    types: '(cities)',
                    key: GOOGLE_MAPS_API_KEY,
                },
            });

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
                                const cityComponent = addressComponents.find((comp) => comp.types.includes('locality'));
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
                setShowSuggestions(suggestions.length > 0);
            } else {
                setCitySuggestions([]);
                setShowSuggestions(false);
            }
        } catch (error) {
            console.error('Error fetching city suggestions:', error);
            setCitySuggestions([]);
            setShowSuggestions(false);
            setError('Unable to fetch city suggestions. Please try again.');
        }
    }, [GOOGLE_MAPS_API_KEY]);

    const debouncedFetchCitySuggestions = useCallback(debounce(fetchCitySuggestions, 300), [
        fetchCitySuggestions,
    ]);

    const getCityDetails = useCallback(
        async (placeId) => {
            try {
                if (!GOOGLE_MAPS_API_KEY) {
                    throw new Error('Google Maps API key is missing.');
                }
                const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
                    params: {
                        place_id: placeId,
                        fields: 'geometry,address_components',
                        key: GOOGLE_MAPS_API_KEY,
                    },
                });

                if (response.data.status === 'OK') {
                    const { lat, lng } = response.data.result.geometry.location;
                    const addressComponents = response.data.result.address_components;
                    const cityComponent = addressComponents.find((comp) => comp.types.includes('locality'));
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
                    await fetchFilterData(city);
                } else {
                    setError('Unable to fetch city details. Please try again.');
                }
            } catch (error) {
                console.error('Error fetching city coordinates:', error);
                setError('Unable to fetch city details. Please try again.');
            }
        },
        [fetchFilterData, GOOGLE_MAPS_API_KEY]
    );

    const handleSearch = useCallback(
        (query) => {
            setSearchQuery(query);
            debouncedFetchCitySuggestions(query);
            setShowSuggestions(query.trim() !== '');
        },
        [debouncedFetchCitySuggestions]
    );

    const handleSuggestionPress = useCallback(
        async (suggestion) => {
            setSearchQuery(suggestion.description);
            setShowSuggestions(false);
            setLoading(true);
            try {
                await getCityDetails(suggestion.place_id);
            } catch (error) {
                console.error('Error in suggestion press:', error);
                setError('Failed to load city data. Please try again.');
                setLoading(false);
            }
        },
        [getCityDetails]
    );

    const handleMarkerPress = useCallback(
        (item) => {
            setSelectedItem(item);
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

            if (item.type === 'property') {
                propertySheetRef.current?.open();
            }
        },
        []
    );

    const handleRegionChange = useCallback(
        debounce((newRegion) => {
            setRegion(newRegion);
        }, 100),
        []
    );

    const updateVisibleItems = useCallback(() => {
        if (!filteredData || !region) {
            setVisibleItems([]);
            console.log('No filteredData or region available');
            return;
        }

        const latDelta = region.latitudeDelta / 2;
        const lngDelta = region.longitudeDelta / 2;

        const itemsInRegion = filteredData.filter((item) => {
            try {
                let coords;
                if (item.type === 'property') {
                    coords = parseCoordinates(item.maplocations);
                } else {
                    const polyCoords = parseProjectCoordinates(item.coordinates);
                    coords = calculateCentroid(polyCoords);
                }
                if (isNaN(coords.latitude) || isNaN(coords.longitude)) {
                    console.warn(`Invalid coordinates for item ${item.id}:`, coords);
                    return false;
                }
                return (
                    coords.latitude >= region.latitude - latDelta &&
                    coords.latitude <= region.latitude + latDelta &&
                    coords.longitude >= region.longitude - lngDelta &&
                    coords.longitude <= region.longitude + lngDelta
                );
            } catch (error) {
                console.error('Error processing item coordinates:', error, item);
                return false;
            }
        });

        // console.log('Visible items:', itemsInRegion.length, 'out of', filteredData.length);
        setVisibleItems(itemsInRegion.slice(0, page * markersPerPage));
        setHasMore(itemsInRegion.length > page * markersPerPage);
    }, [filteredData, region, page, markersPerPage]);

    useEffect(() => {
        initializeRegion();
        fetchCategories();
    }, [initializeRegion, fetchCategories]);

    useEffect(() => {
        setFilteredData(displayMode === 'properties' ? propertiesData : projectsData);
    }, [displayMode, propertiesData, projectsData]);

    useEffect(() => {
        updateVisibleItems();
    }, [updateVisibleItems]);

    const formatINR = useCallback((amount) => {
        if (!amount) return '₹0';
        const cleaned = String(amount).replace(/[₹,]/g, '').trim();
        const num = Number(cleaned);
        if (isNaN(num) || num <= 0) return '₹0';
        if (num >= 1e7) {
            return '₹' + (num / 1e7).toFixed(2).replace(/\.00$/, '') + ' Cr';
        } else if (num >= 1e5) {
            return '₹' + (num / 1e5).toFixed(1).replace(/\.0$/, '') + ' L';
        }
        return '₹' + num.toLocaleString('en-IN');
    }, []);

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
                <TouchableOpacity
                    onPress={() => filterSheetRef.current?.open()}
                    style={styles.searchContainer}
                >
                    <View style={styles.searchInputContainer}>
                        <Ionicons name="search" size={20} color="#1F2937" />
                    </View>
                </TouchableOpacity>
            </View>

            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                    latitude: 26.4499,
                    longitude: 74.6399,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                region={region} // Ensure this controls the map view
                onRegionChangeComplete={handleRegionChange}
                compassEnabled={true}
                mapType={mapType}
            >
                {visibleItems.map((item) => {
                    if (item.type === 'property') {
                        const coords = parseCoordinates(item.maplocations);
                        const price = item.price || 0;
                        const formatted = formatINR(price);

                        return (
                            <Marker
                                key={`property-${item.id}`}
                                coordinate={coords}
                                onPress={() => handleMarkerPress(item)}
                                tracksViewChanges={false}
                            // opacity={0} // Hide default marker
                            >
                                <View style={styles.markerContainer}>
                                    <Text style={styles.markerText}>{formatted}</Text>
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
                                    tracksViewChanges={false}
                                />
                                <Marker
                                    coordinate={centroid}
                                    onPress={() => handleMarkerPress(item)}
                                    tracksViewChanges={false}
                                    pinColor='green'
                                    // opacity={0} // Hide default marker
                                >
                                    {/* <View style={styles.markerContainer}>
                                        <Text style={styles.markerText}>{item.projecttitle || 'Project'}</Text>
                                    </View> */}
                                </Marker>
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
                        <Text style={styles.noResultsText}>
                            No real estate found for {selectedCity || 'the selected area'}
                        </Text>
                    </View>
                </View>
            )}

            <RBSheet
                ref={filterSheetRef}
                closeOnDragDown={true}
                closeOnPressMask={true}
                height={Dimensions.get('window').height * 0.8}
                customStyles={{
                    wrapper: { backgroundColor: 'rgba(0,0,0,0.5)' },
                    container: {
                        borderTopLeftRadius: 35,
                        borderTopRightRadius: 35,
                        padding: 20,
                        backgroundColor: 'white',
                    },
                    draggableIcon: { backgroundColor: '#000', width: 40, height: 5, marginVertical: 10 },
                }}
            >
                <View style={styles.header}>
                    <Text style={styles.headerText}>{t('filter')}</Text>
                    <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                        <Text style={styles.resetText}>{t('reset')}</Text>
                    </TouchableOpacity>

                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
                    <Text style={styles.label}>{t('city')}</Text>
                    <View style={styles.pickerContainer}>
                        <Ionicons name="location-outline" size={20} color="#1F2937" style={styles.icon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by city..."
                            placeholderTextColor="#888"
                            value={searchQuery}
                            onChangeText={handleSearch}
                            onFocus={() => setShowSuggestions(true)}
                        />
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


                    <Text style={styles.label}>{t('display_mode')}</Text>
                    <View style={styles.propertyForContainer}>
                        {['Properties', 'Projects'].map((option) => {
                            const isSelected = displayMode === option.toLowerCase();
                            return (
                                <TouchableOpacity
                                    key={option}
                                    onPress={() => setDisplayMode(option.toLowerCase())}
                                    style={[styles.propertyForButton, isSelected && styles.selectedPropertyForButton]}
                                >
                                    <Text
                                        style={[styles.propertyForText, isSelected && styles.selectedPropertyForText]}
                                    >
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {displayMode === 'properties' && (
                        <>
                            <Text style={styles.label}>{t('filter_property_by')}</Text>
                            <View style={styles.propertyForContainer}>
                                {['Sell', 'Rent'].map((option) => {
                                    const isSelected = propertyMode === option.toLowerCase();
                                    return (
                                        <TouchableOpacity
                                            key={option}
                                            onPress={() => handlePropertyForToggle(option)}
                                            style={[styles.propertyForButton, isSelected && styles.selectedPropertyForButton]}
                                        >
                                            <Text
                                                style={[styles.propertyForText, isSelected && styles.selectedPropertyForText]}
                                            >
                                                For {option}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.label}>{t('price_range')}</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Min Price (₹)"
                                    placeholderTextColor="#888"
                                    value={minPrice}
                                    onChangeText={(text) => setMinPrice(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="numeric"
                                />
                                <Text style={styles.inputSeparator}>to</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Max Price (₹)"
                                    placeholderTextColor="#888"
                                    value={maxPrice}
                                    onChangeText={(text) => setMaxPrice(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="numeric"
                                />
                            </View>

                            <Text style={styles.label}>{t('area_range')}</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Min Area (sqft)"
                                    placeholderTextColor="#888"
                                    value={sqftFrom}
                                    onChangeText={(text) => setSqftFrom(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="numeric"
                                />
                                <Text style={styles.inputSeparator}>to</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Max Area (sqft)"
                                    placeholderTextColor="#888"
                                    value={sqftTo}
                                    onChangeText={(text) => setSqftTo(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="numeric"
                                />
                            </View>

                            <Text style={styles.label}>{t('propertyType')}</Text>
                            <ScrollView
                                horizontal={true}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.propertyTypeContainer}
                            >
                                {categoryData.length > 0 ? (
                                    categoryData.map((cat, index) => {
                                        const label = cat.label || cat.name || t('unknown');
                                        const isSelected = selectedCategory === label;
                                        return (
                                            <TouchableOpacity
                                                key={cat.id || `category-${index}`}
                                                onPress={() => handleCategoryToggle(label)}
                                                style={[styles.propertyTypeButton, isSelected && styles.selectedPropertyTypeButton]}
                                            >
                                                <Text
                                                    style={[styles.propertyTypeText, isSelected && styles.selectedPropertyTypeText]}
                                                >
                                                    {label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <Text style={styles.noResultsText}>No categories available</Text>
                                )}
                            </ScrollView>

                            {selectedCategory && Array.isArray(subcategoryOptions[selectedCategory]) && (
                                <>
                                    <Text style={styles.label}>{t('subcategory')}</Text>
                                    <ScrollView
                                        horizontal={true}
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.propertyTypeContainer}
                                    >
                                        {subcategoryOptions[selectedCategory].map((subcategory) => (
                                            <TouchableOpacity
                                                key={subcategory.value}
                                                style={[
                                                    styles.propertyTypeButton,
                                                    selectedSubCategory === subcategory.value && styles.selectedPropertyTypeButton,
                                                ]}
                                                onPress={() => setSelectedSubCategory(subcategory.value)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.propertyTypeText,
                                                        selectedSubCategory === subcategory.value && styles.selectedPropertyTypeText,
                                                    ]}
                                                >
                                                    {subcategory.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </>
                            )}
                        </>
                    )}
                </ScrollView>

                <View style={[styles.submitContainer, { marginBottom: 20 }]}>
                    <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.submitText}>{t('applyFilter')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </RBSheet>

            <RBSheet
                ref={propertySheetRef}
                closeOnDragDown={true}
                closeOnPressMask={true}
                height={Dimensions.get('window').height * 0.3}
                customStyles={{
                    wrapper: { backgroundColor: 'rgba(0,0,0,0.5)' },
                    container: {
                        borderTopLeftRadius: 35,
                        borderTopRightRadius: 35,
                        padding: 20,
                        backgroundColor: 'white',
                    },
                    draggableIcon: { backgroundColor: '#000', width: 40, height: 5, marginVertical: 10 },
                }}
            >
                {selectedItem && (
                    <MapCard
                        item={{
                            ...selectedItem,
                            property_name: selectedItem.property_name || selectedItem.projecttitle,
                            description: selectedItem.description || selectedItem.discription,
                        }}
                        map={'true'}
                        onPress={() => propertySheetRef.current?.close()}
                        onView={() => viewItem(selectedItem)}
                    />
                )}
            </RBSheet>
        </Pressable>
    );
};

export default Mapview;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    map: {
        flex: 1,
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
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: 100,
        left: 16,
        right: 16,
        zIndex: 2,
        backgroundColor: '#e0e6e9',
        // borderRadius: 25,
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
    propertyCount: {
        backgroundColor: 'lightgreen',
        borderRadius: 10,
        paddingHorizontal: 7,
        marginRight: 7,
    },
    propertyCountText: {
        color: '#000',
        fontSize: 14,
    },
    errorContainer: {
        position: 'absolute',
        bottom: 20,
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
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        zIndex: 1,
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
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    resetButton: {
        padding: 10,
    },
    resetText: {
        fontSize: 16,
        color: '#234F68',
    },
    scrollView: {
        flex: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginVertical: 10,
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        paddingHorizontal: 10,
        marginBottom: 20,
    },
    icon: {
        marginRight: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    input: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        paddingHorizontal: 10,
        paddingVertical: 10,
        fontSize: 16,
        color: '#333',
        marginRight: 10,
    },
    inputSeparator: {
        fontSize: 16,
        color: '#333',
        marginHorizontal: 10,
    },
    propertyForContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    propertyForButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        alignItems: 'center',
        marginHorizontal: 5,
    },
    selectedPropertyForButton: {
        backgroundColor: '#234F68',
        borderColor: '#234F68',
    },
    propertyForText: {
        fontSize: 16,
        color: '#333',
    },
    selectedPropertyForText: {
        color: '#fff',
    },
    propertyTypeContainer: {
        flexDirection: 'row',
        paddingVertical: 10,
    },
    propertyTypeButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        marginRight: 10,
    },
    selectedPropertyTypeButton: {
        backgroundColor: '#234F68',
        borderColor: '#234F68',
    },
    propertyTypeText: {
        fontSize: 14,
        color: '#333',
    },
    selectedPropertyTypeText: {
        color: '#fff',
    },
    submitContainer: {
        paddingVertical: 10,
    },
    submitButton: {
        backgroundColor: '#234F68',
        borderRadius: 25,
        paddingVertical: 15,
        alignItems: 'center',
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
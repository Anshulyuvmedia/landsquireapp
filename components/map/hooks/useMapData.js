// components/map/hooks/useMapData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Constants from 'expo-constants';
import debounce from 'lodash.debounce';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
    parseCoordinates,
    parseProjectCoordinates,
    calculateCentroid,
    formatINR,
} from '../utils/mapUtils';

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY || '';

const useUser = () => ({ city: null });

export const useMapData = () => {
    const router = useRouter();
    const { t } = useTranslation();

    const mapRef = useRef(null);
    const filterSheetRef = useRef(null);
    const propertySheetRef = useRef(null);

    const [allProperties, setAllProperties] = useState([]);
    const [allProjects, setAllProjects] = useState([]);
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
    const [hasMore, setHasMore] = useState(true);
    const markersPerPage = 10;
    const [mapType, setMapType] = useState('hybrid');
    const [displayMode, setDisplayMode] = useState('both');
    const [propertyMode, setPropertyMode] = useState('sell');
    const [categoryData, setCategoryData] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState(null);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sqftFrom, setSqftFrom] = useState('');
    const [sqftTo, setSqftTo] = useState('');

    const { city: userCity } = useUser();
    const isInitialFetch = useRef(true);

    const viewItem = useCallback((item) => {
        const route = item.type === 'project' ? `/projects/${item.id}` : `/properties/${item.id}`;
        router.push(route);
    }, [router]);

    const toggleMapType = useCallback(() => {
        setMapType((prev) => {
            if (prev === 'hybrid') return 'standard';
            if (prev === 'standard') return 'hybrid';
            return 'hybrid';
        });
    }, []);

    const handleCategoryToggle = useCallback((category) => {
        setSelectedCategory(category);
        setSelectedSubCategory(null); // Reset subcategory when category changes
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
    }, [initializeRegion]);

    const handleSubmit = useCallback(async () => {
        setLoading(true);
        filterSheetRef.current?.close();
        await fetchFilterData(selectedCity);
        setLoading(false);
    }, [fetchFilterData, selectedCity]);

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
            setCategoryData(response.data?.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setError('Failed to load categories. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [router]);



    const fetchFilterData = useCallback(async (city, overrideMode = null) => {
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

            // Use overrideMode if provided (from toggle), otherwise use current propertyMode state
            const modeToUse = overrideMode ?? propertyMode; // nullish coalescing for safety
            if (modeToUse) queryParams.append('filterpropertyfor', modeToUse);

            // console.log('🚀 Sending filter params to backend:', Object.fromEntries(queryParams));
            const apiUrl = `https://landsquire.in/api/filterlistings?${queryParams.toString()}`;

            const response = await axios.get(apiUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });

            let properties = Array.isArray(response.data?.data) ? response.data.data : [];

            const projectsResponse = await axios.get('https://landsquire.in/api/upcomingproject', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
                params: { city: city || undefined },
            });

            const projects = Array.isArray(projectsResponse.data?.projects) ? projectsResponse.data.projects : [];

            const formattedProperties = properties
                .filter((item) => item.maplocations)
                .map((item) => ({ ...item, type: 'property' }));

            const formattedProjects = projects
                .filter((item) => item.coordinates)
                .map((item) => ({ ...item, type: 'project' }));

            setAllProperties(formattedProperties);
            setAllProjects(formattedProjects);

            if (formattedProperties.length === 0 && formattedProjects.length === 0) {
                setError(`No results found for ${city || 'the selected area'}.`);
            } else if (!region && (formattedProperties.length > 0 || formattedProjects.length > 0)) {
                let firstCoords;
                if (formattedProperties.length > 0) {
                    firstCoords = parseCoordinates(formattedProperties[0].maplocations);
                } else {
                    const polyCoords = parseProjectCoordinates(formattedProjects[0].coordinates);
                    firstCoords = calculateCentroid(polyCoords);
                }
                const newRegion = {
                    latitude: firstCoords.latitude,
                    longitude: firstCoords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                };
                setRegion(newRegion);
                mapRef.current?.animateToRegion(newRegion, 500);
            }
        } catch (error) {
            console.error('💥 Error in fetchFilterData:', error);
            console.error('Response data:', error.response?.data);
            setError(
                error.response?.status === 404
                    ? `No results found for ${city || 'the selected area'}.`
                    : error.message.includes('Network Error')
                        ? 'Network error. Please check your internet connection.'
                        : 'An unexpected error occurred. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }, [
        selectedCategory,
        selectedSubCategory,
        minPrice,
        maxPrice,
        sqftFrom,
        sqftTo,
        propertyMode,        // Keep this — still needed for non-override calls
        selectedCity,
        router,
    ]);

    const initializeRegion = useCallback(async () => {
        if (!isInitialFetch.current) return;
        isInitialFetch.current = false;

        setLoading(true);
        const initialCity = userCity || 'Ajmer';
        // console.log('initialCity', initialCity);
        try {
            if (!GOOGLE_MAPS_API_KEY) throw new Error('Google Maps API key is missing.');

            const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: { address: initialCity, key: GOOGLE_MAPS_API_KEY },
            });

            if (response.data.status === 'OK') {
                const { lat, lng } = response.data.results[0].geometry.location;
                const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };
                setRegion(newRegion);
                // console.log('newRegion', newRegion);

                setCurrentLocationName(initialCity);
                setSelectedCity(initialCity);
                await fetchFilterData(initialCity);
                mapRef.current?.animateToRegion(newRegion, 500);
            } else {
                throw new Error('Failed to geocode initial city.');
            }
        } catch (error) {
            console.error('Error initializing region:', error);
            const defaultRegion = { latitude: 26.4499, longitude: 74.6399, latitudeDelta: 0.05, longitudeDelta: 0.05 };
            setRegion(defaultRegion);
            setCurrentLocationName('Ajmer');
            setSelectedCity('Ajmer');
            await fetchFilterData('Ajmer');
            mapRef.current?.animateToRegion(defaultRegion, 500);
        } finally {
            setLoading(false);
        }
    }, [fetchFilterData, userCity]);

    const getCurrentLocation = useCallback(async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('Location permission denied. Falling back to Ajmer.');
                await fetchFilterData('Ajmer');
                return;
            }

            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = location.coords;

            const newRegion = { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
            setRegion(newRegion);
            mapRef.current?.animateToRegion(newRegion, 500);

            const geocode = await axios.get(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
            );

            if (geocode.data.status === 'OK') {
                const city = geocode.data.results[0].address_components.find(c => c.types.includes('locality'))?.long_name || 'Unknown Location';
                setCurrentLocationName(city);
                setSelectedCity(city);
                await fetchFilterData(city);
            } else {
                setCurrentLocationName('Unknown Location');
                await fetchFilterData('Ajmer');
            }
        } catch (error) {
            console.error('Error getting location:', error);
            setError('Current location unavailable. Showing Ajmer.');
            await fetchFilterData('Ajmer');
        } finally {
            setLoading(false);
        }
    }, [fetchFilterData]);

    const fetchCitySuggestions = useCallback(async (query) => {
        if (!query.trim()) {
            setCitySuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
                params: {
                    input: query,
                    types: '(cities)',
                    key: GOOGLE_MAPS_API_KEY,
                },
            });

            if (response.data.status === 'OK') {
                const suggestions = response.data.predictions.map(p => ({
                    description: p.description.split(',')[0].trim(),
                    place_id: p.place_id,
                }));
                setCitySuggestions(suggestions);
                setShowSuggestions(true);
            } else {
                setCitySuggestions([]);
                setShowSuggestions(false);
            }
        } catch (error) {
            console.error('Error fetching city suggestions:', error);
            setCitySuggestions([]);
            setShowSuggestions(false);
        }
    }, []);

    const debouncedFetchCitySuggestions = useCallback(debounce(fetchCitySuggestions, 300), [fetchCitySuggestions]);

    const getCityDetails = useCallback(async (placeId) => {
        try {
            const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
                params: {
                    place_id: placeId,
                    fields: 'geometry,address_components',
                    key: GOOGLE_MAPS_API_KEY,
                },
            });

            if (response.data.status === 'OK') {
                const { lat, lng } = response.data.result.geometry.location;
                const city = response.data.result.address_components.find(c => c.types.includes('locality'))?.long_name || 'Unknown City';

                const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };
                setRegion(newRegion);
                setCurrentLocationName(city);
                setSelectedCity(city);
                mapRef.current?.animateToRegion(newRegion, 500);
                await fetchFilterData(city);
            }
        } catch (error) {
            console.error('Error getting city details:', error);
            setError('Failed to load city.');
        }
    }, [fetchFilterData]);

    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        debouncedFetchCitySuggestions(query);
        setShowSuggestions(query.trim() !== '');
    }, [debouncedFetchCitySuggestions]);


    const applyPropertyModeImmediately = useCallback((mode) => {
        if (loading) return;
        setPropertyMode(mode);
        const cityToUse = selectedCity || currentLocationName || 'Ajmer';
        fetchFilterData(cityToUse, mode); // Now passes the new mode directly
    }, [selectedCity, currentLocationName, fetchFilterData, loading]);

    const handleSuggestionPress = useCallback(async (suggestion) => {
        setSearchQuery(suggestion.description);
        setShowSuggestions(false);
        setLoading(true);
        await getCityDetails(suggestion.place_id);
        setLoading(false);
    }, [getCityDetails]);

    const handleMarkerPress = useCallback((item) => {
        setSelectedItem(item);
        let coords;
        if (item.type === 'property') {
            coords = parseCoordinates(item.maplocations);
        } else {
            const polyCoords = parseProjectCoordinates(item.coordinates);
            coords = calculateCentroid(polyCoords);
        }
        mapRef.current?.animateToRegion({
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
        }, 500);
        propertySheetRef.current?.open();
    }, []);

    const handleRegionChange = useCallback(debounce((newRegion) => {
        setRegion(newRegion);
    }, 100), []);

    const updateVisibleItems = useCallback(() => {
        if (!filteredData.length || !region) {
            setVisibleItems([]);
            return;
        }

        const latDelta = region.latitudeDelta / 2;
        const lngDelta = region.longitudeDelta / 2;

        const itemsInView = filteredData.filter((item) => {
            let coords;
            if (item.type === 'property') {
                coords = parseCoordinates(item.maplocations);
            } else {
                const polyCoords = parseProjectCoordinates(item.coordinates);
                coords = calculateCentroid(polyCoords);
            }

            if (isNaN(coords.latitude) || isNaN(coords.longitude)) return false;

            return (
                coords.latitude >= region.latitude - latDelta &&
                coords.latitude <= region.latitude + latDelta &&
                coords.longitude >= region.longitude - lngDelta &&
                coords.longitude <= region.longitude + lngDelta
            );
        });

        setVisibleItems(itemsInView.slice(0, page * markersPerPage));
        setHasMore(itemsInView.length > page * markersPerPage);
    }, [filteredData, region, page, markersPerPage]);

    useEffect(() => {
        // console.log('🔄 Filtering effect triggered');
        // console.log('displayMode:', displayMode);
        // console.log('allProperties count:', allProperties.length);
        // console.log('allProjects count:', allProjects.length);

        let newData = [];

        if (displayMode === 'properties') {
            newData = allProperties; // Backend already filtered by mode
        } else if (displayMode === 'projects') {
            newData = allProjects;
        } else {
            // 'both' — show all properties (already filtered by backend) + projects
            newData = [...allProperties, ...allProjects];
        }

        // console.log('Final filteredData count:', newData.length);
        setFilteredData(newData);
    }, [displayMode, allProperties, allProjects]); // ← Removed propertyMode from deps!

    // Update visible items whenever needed
    useEffect(() => {
        updateVisibleItems();
    }, [updateVisibleItems]);

    // Initial load
    useEffect(() => {
        initializeRegion();
        fetchCategories();
    }, [initializeRegion, fetchCategories]);

    return {
        // Refs
        mapRef,
        filterSheetRef,
        propertySheetRef,

        // State
        loading,
        error,
        region,
        currentLocationName,
        filteredData,
        visibleItems,
        selectedItem,
        mapType,
        displayMode,
        setDisplayMode,
        propertyMode,
        setPropertyMode,
        searchQuery,
        showSuggestions,
        citySuggestions,

        // Form controls
        categoryData,
        selectedCategory,
        setSelectedCategory: handleCategoryToggle,
        selectedSubCategory,
        setSelectedSubCategory,
        minPrice,
        setMinPrice,
        maxPrice,
        setMaxPrice,
        sqftFrom,
        setSqftFrom,
        sqftTo,
        setSqftTo,

        // Actions
        getCurrentLocation,
        handleSearch,
        handleSuggestionPress,
        handleMarkerPress,
        handleRegionChange,
        handleSubmit,
        handleReset,
        toggleMapType,
        viewItem,
        formatINR,
        applyPropertyModeImmediately,
    };
};
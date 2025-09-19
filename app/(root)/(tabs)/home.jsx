import { View, Text, Image, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import images from '@/constants/images';
import icons from '@/constants/icons';
import Search from '@/components/Search';
import { Card, HorizontalCard, MapCard } from '@/components/Cards';
import Filters from '@/components/Filters';
import { useRouter, useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { scale } from 'react-native-size-matters';
import LocationScroll from '@/components/LocationScroll';
import BrokerScroll from '@/components/BrokerScroll';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';

const PADDING_HORIZONTAL = scale(15);
const GAP = scale(10);
const LIMIT = 10; // Number of items per page

const Home = () => {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const navigation = useNavigation();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [image, setImage] = useState(images.avatar);
    const [listingData, setListingData] = useState([]);
    const [rentListingData, setRentListingData] = useState([]);
    const [featuredData, setFeaturedData] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const [projectsData, setProjectsData] = useState([]);

    const handleCardPress = (id) => router.push(`/properties/${id}`);
    const handleProjectPress = (id) => router.push(`/projects/${id}`);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            const parsedUserData = JSON.parse(await AsyncStorage.getItem('userData'));
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                console.error('No token found, redirecting to sign-in');
                await AsyncStorage.removeItem('userData');
                router.push('/signin');
                return;
            }
            if (!parsedUserData || !parsedUserData.id) {
                console.error('Invalid user data, redirecting to sign-in');
                await AsyncStorage.removeItem('userData');
                router.push('/signin');
                return;
            }

            const response = await axios.get(`https://landsquire.in/api/userprofile?id=${parsedUserData.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });

            if (response.data && response.data.data) {
                const apiData = response.data.data;
                setUserData(apiData);
                setImage(
                    apiData.profile && apiData.profile.startsWith('http')
                        ? apiData.profile
                        : apiData.profile
                            ? `https://landsquire.in/adminAssets/images/Users/${apiData.profile}`
                            : images.avatar
                );
            } else {
                console.error('Unexpected API response format:', response.data);
                setImage(images.avatar);
            }
        } catch (error) {
            console.error('Error fetching user data:', error.response?.data, error.response?.status);
            if (error.response?.status === 401) {
                await AsyncStorage.removeItem('userToken');
                await AsyncStorage.removeItem('userData');
                router.push('/signin');
            }
            setImage(images.avatar);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchListingData = useCallback(async (pageToFetch) => {
        if (!hasMore && pageToFetch !== 1) return;
        if (loading) return; // Prevent multiple simultaneous fetches
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                console.error('No token found, redirecting to sign-in');
                router.push('/signin');
                return;
            }

            // Fetch projects with region params
            const projectsResponse = await axios.get('https://landsquire.in/api/upcomingproject', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });

            setProjectsData(projectsResponse.data?.projects || []);

            const response = await axios.get(`https://landsquire.in/api/property-listings?page=${pageToFetch}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });

            const listings = response.data?.data;

            if (Array.isArray(listings)) {
                const idMap = new Map();
                const normalized = listings.map((item, index) => {
                    // Use the API-provided id if it exists and is a number; otherwise, fallback to UUID
                    let uniqueId = item.id && Number.isInteger(Number(item.id))
                        ? String(item.id) // Convert to string for consistency
                        : uuidv4();
                    if (idMap.has(uniqueId)) {
                        uniqueId = `${uniqueId}_${index}_${pageToFetch}`;
                        console.warn(`Duplicate ID detected, assigning new ID: ${uniqueId}`);
                    }
                    idMap.set(uniqueId, true);
                    return {
                        ...item,
                        id: uniqueId, // Store as string for React key consistency
                        originalId: item.id, // Preserve original integer ID for API calls
                        propertyfor: item.propertyfor ? item.propertyfor.toString().toLowerCase() : null,
                        property_name: item.property_name || 'Unnamed Property',
                        thumbnail: item.thumbnail || null,
                        category: item.category || 'N/A',
                        city: item.city || 'Unknown City',
                        price: item.price || 0,
                    };
                });

                const sellListings = normalized.filter(
                    item => item.propertyfor === null || item.propertyfor === 'sell'
                );
                const featuredlist = normalized.filter(
                    item =>
                        (item.propertyfor === null || item.propertyfor === 'sell') &&
                        item.featuredstatus === 'featured'
                );
                const rentListings = normalized.filter(item => item.propertyfor === 'rent');

                setListingData(prev => {
                    const newData = pageToFetch === 1 ? sellListings : [...prev, ...sellListings];
                    return [...new Set(newData.map(item => item.id))].map(id => newData.find(item => item.id === id));
                });
                setRentListingData(prev => {
                    const newData = pageToFetch === 1 ? rentListings : [...prev, ...rentListings];
                    return [...new Set(newData.map(item => item.id))].map(id => newData.find(item => item.id === id));
                });
                setFeaturedData(prev => {
                    const newData = pageToFetch === 1 ? featuredlist : [...prev, ...featuredlist];
                    return [...new Set(newData.map(item => item.id))].map(id => newData.find(item => item.id === id));
                });
                setHasMore(listings.length === LIMIT);
            } else {
                console.error('Unexpected API response format:', response.data);
                setListingData(prev => (pageToFetch === 1 ? [] : prev));
                setRentListingData(prev => (pageToFetch === 1 ? [] : prev));
                setFeaturedData(prev => (pageToFetch === 1 ? [] : prev));
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error fetching listing data:', error.response?.data, error.response?.status);
            if (error.response?.status === 401) {
                await AsyncStorage.removeItem('userToken');
                await AsyncStorage.removeItem('userData');
                router.push('/signin');
            }
            setError(t('error.apiFailed'));
            setHasMore(false);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [hasMore, loading, router, t]);


    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setPage(1);
        setListingData([]);
        setRentListingData([]);
        setFeaturedData([]);
        setHasMore(true);
        fetchUserData();
        fetchListingData(1);
    }, []);

    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    const loadMore = useCallback(
        debounce(() => {
            if (hasMore && !loading) {
                setPage(prev => {
                    const nextPage = prev + 1;
                    fetchListingData(nextPage);
                    return nextPage;
                });
            }
        }, 300),
        [hasMore, loading, fetchListingData]
    );

    useEffect(() => {
        fetchUserData();
        fetchListingData(1);
    }, []);

    const handleNavigation = () => {
        // console.log('Home: Navigating to /dashboard');
        // router.push('dashboard')
        navigation.navigate('dashboard');
    };

    return (
        <View className="flex-1 bg-[#fafafa]">
            <FlatList
                data={listingData}
                renderItem={({ item }) => <Card item={item} onPress={() => handleCardPress(item.id)} />}
                keyExtractor={(item) => `main_${item.id}`}
                numColumns={2}
                contentContainerClassName="pb-[100px] px-[15px]"
                columnWrapperClassName="flex-row gap-[10px]"
                showsVerticalScrollIndicator={false}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    <>
                        {loading && <ActivityIndicator size="large" color="#4A90E2" />}
                        {error && (
                            <View className="flex items-center my-4">
                                <Text className="text-red-500 text-center">{error}</Text>
                                <TouchableOpacity
                                    onPress={() => fetchListingData(page)}
                                    className="mt-2 bg-primary-400 px-4 py-2 rounded-lg"
                                >
                                    <Text className="text-white">Try Again</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        {!hasMore && listingData.length > 0 && (
                            <Text className="text-center text-gray-500 my-4">
                                - You have seen all the properties -
                            </Text>
                        )}
                    </>
                }
                ListHeaderComponent={
                    <View>
                        <View className="flex-row items-center justify-between mt-5">
                            <View className="flex flex-col items-start ml-2 justify-center">
                                <Text
                                    className={`text-2xl ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-black-300`}
                                >
                                    {t('welcome', { name: userData?.username?.split(' ')[0] || 'User' })}
                                    <Text
                                        className={`${i18n.language === 'hi' ? 'font-noto-serif-devanagari-bold' : 'font-rubik-medium'} text-primary-300`}
                                    >
                                        {userData?.username?.split(' ')[0] || 'User'}
                                    </Text>
                                </Text>
                                <Text
                                    className={`text-2xl ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-black-300`}
                                >
                                    {t('startExploring')}
                                </Text>
                            </View>

                            <View className="flex-row items-start justify-center">
                                <TouchableOpacity
                                    onPress={() => router.push('/notifications')}
                                    className="border px-3 py-3 rounded-full"
                                >
                                    <Image source={icons.bell} className="size-6" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleNavigation}
                                    className="flex flex-row items-center ml-2 justify-center border px-1 py-1 rounded-full"
                                >
                                    <Image
                                        source={typeof image === 'string' ? { uri: image } : images.avatar}
                                        className="size-10 rounded-full"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View className="mt-3">
                            <Search />
                        </View>

                        <View className="my-3">
                            <Filters />
                        </View>

                        <View className="my-4 flex-row justify-center space-x-4">
                            {["user", "broker"].includes(userData?.user_type?.toLowerCase()) && (
                                <TouchableOpacity
                                    onPress={() => router.push("/myassets/assetScreen")}
                                    className="bg-primary-400 flex-row justify-between px-4 py-4 rounded-2xl shadow-md flex-1 items-center"
                                    activeOpacity={0.8}
                                >
                                    <View className="flex-row items-center flex-shrink">
                                        <Ionicons name="home-outline" size={30} color="white" />
                                        <View className="ms-3">
                                            <Text className="text-white font-semibold text-base">
                                                View Property Leads
                                            </Text>
                                            <Text className="text-white/80 text-xs mt-1">
                                                Track and manage enquiries
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={22} color="white" />
                                </TouchableOpacity>
                            )}
                            {userData?.user_type?.toLowerCase() === "bankagent" && (
                                <TouchableOpacity
                                    onPress={() => router.push("/dashboard/loanleads")}
                                    className="bg-green-600 flex-row justify-between px-4 py-4 rounded-2xl shadow-md flex-1 items-center"
                                    activeOpacity={0.8}
                                >
                                    <View className="flex-row items-center flex-shrink">
                                        <MaterialCommunityIcons name="bank-outline" size={30} color="white" />
                                        <View className="ms-3">
                                            <Text className="text-white font-semibold text-base">
                                                View Loan Enquiries
                                            </Text>
                                            <Text className="text-white/80 text-xs mt-1">
                                                Check client loan requests
                                            </Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={22} color="white" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {featuredData && (
                            <View className="my-5">
                                <View className="flex flex-row items-center justify-between mb-5">
                                    <Text
                                        className={`text-xl ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-bold' : 'font-rubik-bold'} text-black-300`}
                                    >
                                        {t('featuredEstate')}
                                    </Text>
                                    <TouchableOpacity onPress={() => router.push('properties/explore')}>
                                        <Text
                                            className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-primary-300`}
                                        >
                                            {t('seeAll')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={featuredData}
                                    renderItem={({ item }) => <HorizontalCard item={item} onPress={() => handleCardPress(item.id)} />}
                                    keyExtractor={(item) => `featured_${item.id}`}
                                    horizontal
                                    bounces={false}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerClassName="flex gap-5"
                                    ListFooterComponent={
                                        <>
                                            {loading && <ActivityIndicator size="large" color="#4A90E2" />}
                                            {error && <Text className="text-red-500 text-center">{error}</Text>}
                                        </>
                                    }
                                />
                            </View>
                        )}

                        <View className="mt-5">
                            <View className="flex flex-row items-center justify-between">
                                <Text
                                    className={`text-xl ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-bold' : 'font-rubik-bold'} text-black-300`}
                                >
                                    {t('topLocations')}
                                </Text>
                                <TouchableOpacity onPress={() => router.push('properties/alllocations')}>
                                    <Text
                                        className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-primary-300`}
                                    >
                                        {t('seeAll')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <LocationScroll />
                        </View>

                        <BrokerScroll />

                        {rentListingData && (
                            <View className="my-5">
                                <View className="flex flex-row items-center justify-between mb-5">
                                    <Text
                                        className={`text-xl ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-bold' : 'font-rubik-bold'} text-black-300`}
                                    >
                                        Rent a property
                                    </Text>
                                    <TouchableOpacity onPress={() => router.push({
                                        pathname: "properties/explore",
                                        params: { propertyFor: "Rent" },
                                    })}>
                                        <Text
                                            className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-primary-300`}
                                        >
                                            {t('seeAll')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={rentListingData}
                                    renderItem={({ item }) => <HorizontalCard item={item} onPress={() => handleCardPress(item.id)} />}
                                    keyExtractor={(item) => `rent_${item.id}`}
                                    horizontal
                                    bounces={false}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerClassName="flex gap-5"
                                    ListFooterComponent={
                                        <>
                                            {loading && <ActivityIndicator size="large" color="#4A90E2" />}
                                            {error && <Text className="text-red-500 text-center">{error}</Text>}
                                        </>
                                    }
                                />
                            </View>
                        )}

                        {projectsData && (
                            <View className="my-5">
                                <View className="flex flex-row items-center justify-between mb-5">
                                    <Text
                                        className={`text-xl ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-bold' : 'font-rubik-bold'} text-black-300`}
                                    >
                                        Upcoming Projects
                                    </Text>
                                    {/* <TouchableOpacity onPress={() => router.push('properties/explore')}>
                                        <Text
                                            className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-primary-300`}
                                        >
                                            {t('seeAll')}
                                        </Text>
                                    </TouchableOpacity> */}
                                </View>
                                <FlatList
                                    data={projectsData}
                                    renderItem={({ item }) => <MapCard item={item} onPress={() => handleProjectPress(item.id)} />}
                                    keyExtractor={(item) => `project_${item.id}`}
                                    horizontal
                                    bounces={false}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerClassName="flex gap-5"
                                    ListFooterComponent={
                                        <>
                                            {loading && <ActivityIndicator size="large" color="#4A90E2" />}
                                            {error && <Text className="text-red-500 text-center">{error}</Text>}
                                        </>
                                    }
                                />
                            </View>
                        )}

                        <View className="my-5">
                            <View className="flex flex-row items-center justify-between">
                                <Text
                                    className={`text-xl ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-bold' : 'font-rubik-bold'} text-black-300`}
                                >
                                    {t('ourRecommendation')}
                                </Text>
                            </View>
                        </View>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#4A90E2']}
                        tintColor="#4A90E2"
                    />
                }
            />
        </View>
    );
};

export default Home;
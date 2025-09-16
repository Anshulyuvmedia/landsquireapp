import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList, Dimensions, RefreshControl } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import images from '@/constants/images';
import icons from '@/constants/icons'; // Ensure this contains heart, location, and noResultFound images
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from '@/components/Cards';

// Get screen width for dynamic card sizing
const { width: screenWidth } = Dimensions.get('window');
const PADDING_HORIZONTAL = scale(0);
const GAP = scale(10);
const CARD_WIDTH = (screenWidth - 2 * PADDING_HORIZONTAL - GAP) / 2;

const BankAgent = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [bankAgentData, setBankAgentData] = useState(null);
    const [offerData, setOfferData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBankAgentProfile = async () => {
        setLoading(true);
        setError(null);
        // console.log('Fetching bankAgent profile for id:', id);
        try {
            const response = await axios.get(`https://landsquire.in/api/bankagentprofile?id=${id}`);
            // console.log('API Response:', response.data);
            if (response.data.success) {
                if (response.data.agentdata && response.data.agentdata.length > 0) {
                    setBankAgentData(response.data.agentdata[0]);
                }
                // Assuming offers data might be under a different key (e.g., 'offers', adjust based on API)
                if (response.data.offers) {
                    const formattedOffers = response.data.offers.map((item, index) => ({
                        id: item.id || `offer_${index}`,
                        title: item.title || item.offer_name || 'Unnamed Offer',
                        description: item.description || 'N/A',
                        type: item.type || 'N/A', // e.g., 'Loan', 'Insurance'
                        amount: item.amount || 'N/A',
                        thumbnail: item.thumbnail || null,
                    }));
                    setOfferData(formattedOffers);
                }
            } else {
                throw new Error(response.data.message || 'Failed to fetch bankAgent profile');
            }
        } catch (error) {
            console.error('Error fetching user data:', error.message, 'Response:', error.response?.data);
            setError(error.message);
            setBankAgentData(null);
            setOfferData([]);
        } finally {
            setLoading(false);
            setRefreshing(false); // Reset refreshing state when done
        }
    };

    useEffect(() => {
        fetchBankAgentProfile();
    }, [id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBankAgentProfile();
    };

    const renderEmptyComponent = () => (
        <View style={styles.emptyContainer}>
            <Image source={icons.noResultFound} style={styles.emptyImage} />
            <Text style={styles.emptyTitle}>
                Offer <Text style={styles.emptyHighlight}>not found</Text>
            </Text>
            <Text style={styles.emptySubtitle}>
                Sorry, we can't find any offers from the bank agent.
            </Text>
        </View>
    );

    const getProfileImageUri = () => {
        let baseUri = bankAgentData?.profile
            ? bankAgentData.profile.startsWith('http')
                ? bankAgentData.profile
                : `https://landsquire.in/adminAssets/images/Users/${bankAgentData.profile}`
            : images.avatar;
        // console.log('Profile Image URI:', baseUri);
        return baseUri.toString();
    };

    const handleCardPress = (id) => router.push(`/offers/${id}`); // Adjusted for offers

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Bank Agent Profile</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                    <MaterialIcons name="arrow-back" size={moderateScale(20, 0.3)} color="#4B5563" />
                </TouchableOpacity>
            </View>
            {bankAgentData ? (
                <>
                    <Image
                        source={{ uri: getProfileImageUri() }}
                        style={styles.profileImage}
                        onError={(error) => console.log('Image load error for', bankAgentData.username, ':', error.nativeEvent.error)}
                    />
                    <Text style={styles.name}>{bankAgentData.username}</Text>
                    <Text style={styles.email}>{bankAgentData.email}</Text>
                </>
            ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <View style={styles.listingsSection}>
                <Text style={styles.listingsTitle}>{offerData.length} offers</Text>
                {loading ? (
                    <Text style={styles.loadingText}>Loading...</Text>
                ) : error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : (
                    <FlatList
                        data={offerData}
                        renderItem={({ item }) => <Card item={item} onPress={() => handleCardPress(item.id)} style={styles.card} />}
                        keyExtractor={(item) => item.id.toString()}
                        numColumns={2}
                        contentContainerStyle={styles.flatListContent}
                        columnWrapperStyle={styles.flatListColumnWrapper}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={!loading && offerData.length === 0 ? renderEmptyComponent : null}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#234F68']}
                                progressBackgroundColor="#f4f2f7"
                            />
                        }
                    />
                )}
            </View>
        </View>
    );
};

export default BankAgent;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
        paddingHorizontal: scale(15),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: verticalScale(12),
    },
    headerText: {
        fontSize: moderateScale(18, 0.3),
        fontFamily: 'Rubik-Bold',
        color: '#234F68',
    },
    backButton: {
        backgroundColor: '#f4f2f7',
        borderRadius: moderateScale(20, 0.3),
        width: moderateScale(40, 0.3),
        height: moderateScale(40, 0.3),
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileImage: {
        width: scale(75),
        height: scale(75),
        borderRadius: moderateScale(50, 0.3),
        alignSelf: 'center',
        marginBottom: verticalScale(10),
    },
    name: {
        fontSize: moderateScale(22, 0.3),
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#000',
        marginBottom: verticalScale(5),
    },
    email: {
        fontSize: moderateScale(14, 0.3),
        textAlign: 'center',
        color: '#666',
        marginBottom: verticalScale(15),
    },

    listingsSection: {
        marginBottom: verticalScale(20),
    },
    listingsTitle: {
        fontSize: moderateScale(18, 0.3),
        fontWeight: 'bold',
        color: '#000',
        marginBottom: verticalScale(10),
    },
    flatListContent: {
        paddingBottom: verticalScale(32),
        paddingHorizontal: PADDING_HORIZONTAL,
    },
    flatListColumnWrapper: {
        flexDirection: 'row',
        gap: GAP,
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: moderateScale(10, 0.3),
        width: CARD_WIDTH,
        marginBottom: verticalScale(15),
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: moderateScale(4, 0.3),
    },
    chatButton: {
        backgroundColor: '#8bc83f',
        padding: moderateScale(15, 0.3),
        borderRadius: moderateScale(10, 0.3),
        alignItems: 'center',
        marginTop: verticalScale(10),
    },
    chatButtonText: {
        color: '#fff',
        fontSize: moderateScale(16, 0.3),
        fontWeight: 'bold',
    },
    loadingText: {
        textAlign: 'center',
        color: '#666',
    },
    errorText: {
        textAlign: 'center',
        color: 'red',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: verticalScale(20),
    },
    emptyImage: {
        width: scale(160),
        height: scale(160),
    },
    emptyTitle: {
        fontSize: moderateScale(24, 0.3),
        fontFamily: 'Rubik-Bold',
        color: '#4B5563',
        textAlign: 'center',
        marginTop: verticalScale(10),
    },
    emptyHighlight: {
        color: '#234F68',
    },
    emptySubtitle: {
        fontSize: moderateScale(16, 0.3),
        fontFamily: 'Rubik-Regular',
        color: '#6B7280',
        textAlign: 'center',
        marginTop: verticalScale(5),
    },
});
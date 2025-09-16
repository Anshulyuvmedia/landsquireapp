import { StyleSheet, Text, View, Image, TouchableOpacity, FlatList, Dimensions, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import images from '@/constants/images';
import icons from '@/constants/icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Card } from '@/components/Cards';

const { width: screenWidth } = Dimensions.get('window');
const PADDING_HORIZONTAL = scale(0);
const GAP = scale(10);
const CARD_WIDTH = (screenWidth - 2 * PADDING_HORIZONTAL - GAP) / 2;
const BUTTON_CONTAINER_HEIGHT = verticalScale(70); // Approximate height of the button container

const Broker = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [userPropertyData, setUserPropertyData] = useState([]);
    const [brokerData, setBrokerData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBrokerProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`https://landsquire.in/api/brokerprofile?id=${id}`);
            if (response.data.success) {
                if (response.data.brokerdata && response.data.brokerdata.length > 0) {
                    setBrokerData(response.data.brokerdata[0]);
                }
                if (response.data.allproperties) {
                    const formattedProperties = response.data.allproperties.map((item, index) => ({
                        id: item.id || `property_${index}`,
                        property_name: item.property_name || item.title || 'Unnamed Property',
                        address: item.address || 'N/A',
                        price: item.price || 'N/A',
                        status: item.status || 'N/A',
                        category: item.category || 'N/A',
                        thumbnail: item.thumbnail,
                        city: item.city || 'N/A',
                    }));
                    setUserPropertyData(formattedProperties);
                }
            } else {
                throw new Error(response.data.message || 'Failed to fetch broker profile');
            }
        } catch (error) {
            console.error('Error fetching user data:', error.message, 'Response:', error.response?.data);
            setError(error.message);
            setUserPropertyData([]);
            setBrokerData(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBrokerProfile();
    }, [id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBrokerProfile();
    };

    const renderEmptyComponent = () => (
        <View style={styles.emptyContainer}>
            <Image source={icons.noResultFound} style={styles.emptyImage} />
            <Text style={styles.emptyTitle}>
                Listing <Text style={styles.emptyHighlight}>not found</Text>
            </Text>
            <Text style={styles.emptySubtitle}>
                Sorry, we can't find the real estate from the broker.
            </Text>
        </View>
    );

    const getProfileImageUri = () => {
        // console.log('proimg', brokerData?.profile);

        if (!brokerData?.profile || brokerData.profile === 'null') {
            return images.avatar; // fallback image
        }

        if (brokerData.profile.startsWith('http')) {
            return brokerData.profile;
        }

        return `https://landsquire.in/adminAssets/images/Users/${brokerData.profile}`;
    };



    const handleCardPress = (id) => router.push(`/properties/${id}`);

    const handleCallPress = () => {
        if (brokerData?.mobilenumber) {
            Linking.openURL(`tel:${brokerData.mobilenumber}`).catch((err) => console.error('Error opening phone dialer:', err));
        } else {
            console.warn('Phone number not available');
        }
    };

    const handleWhatsAppPress = () => {
        if (brokerData?.mobilenumber) {
            Linking.openURL(`https://wa.me/${brokerData.mobilenumber}`).catch((err) => console.error('Error opening WhatsApp:', err));
        } else {
            console.warn('Phone number not available');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Broker Profile</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                    <MaterialIcons name="arrow-back" size={moderateScale(20, 0.3)} color="#4B5563" />
                </TouchableOpacity>
            </View>
            {brokerData ? (
                <>
                    <Image
                        source={typeof getProfileImageUri() === "string" ? { uri: getProfileImageUri() } : getProfileImageUri()}
                        style={styles.profileImage}
                        onError={() => console.log('Image load error for', brokerData?.username)}
                    />

                    <Text style={styles.name}>{brokerData.username}</Text>
                    <Text style={styles.email}>{brokerData.email}</Text>
                    <Text style={styles.email}>{brokerData.mobilenumber}</Text>
                    <Text style={styles.listingsTitle}>Total {userPropertyData.length} listings</Text>
                </>
            ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <View style={styles.listingsSection}>
                
                {loading ? (
                    <View>
                        <ActivityIndicator size="large" color="#8bc83f" />
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                ) : error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : (
                    <FlatList
                        data={userPropertyData}
                        renderItem={({ item }) => <Card item={item} onPress={() => handleCardPress(item.id)} style={styles.card} />}
                        keyExtractor={(item) => item.id.toString()}
                        numColumns={2}
                        contentContainerStyle={[styles.flatListContent, { paddingBottom: BUTTON_CONTAINER_HEIGHT + verticalScale(20) }]}
                        columnWrapperStyle={styles.flatListColumnWrapper}
                        showsVerticalScrollIndicator={false} // Hide scroll bar
                        ListEmptyComponent={!loading && userPropertyData.length === 0 ? renderEmptyComponent : null}
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

            {/* Fixed Call and WhatsApp Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.callButton, !brokerData?.mobilenumber && styles.disabledButton]}
                    onPress={handleCallPress}
                    activeOpacity={0.7}
                    disabled={!brokerData?.mobilenumber}
                    accessible={true}
                    accessibilityLabel="Call broker"
                    accessibilityRole="button"
                >
                    <MaterialIcons name="phone" size={moderateScale(18, 0.3)} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, styles.whatsappButton, !brokerData?.mobilenumber && styles.disabledButton]}
                    onPress={handleWhatsAppPress}
                    activeOpacity={0.7}
                    disabled={!brokerData?.mobilenumber}
                    accessible={true}
                    accessibilityLabel="Message broker on WhatsApp"
                    accessibilityRole="button"
                >
                    <FontAwesome5 name="whatsapp" size={moderateScale(18, 0.3)} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.actionButtonText}>WhatsApp</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default Broker;

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
        marginVertical: verticalScale(5),
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
        marginBottom: verticalScale(5),
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
        marginBottom: verticalScale(5),
    },
    listingsSection: {
        flex: 1,
        marginBottom: verticalScale(20),
    },
    listingsTitle: {
        fontSize: moderateScale(18, 0.3),
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
        marginBottom: verticalScale(10),
    },
    flatListContent: {
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
    buttonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scale(20), // Increased for better spacing
        paddingVertical: verticalScale(12),
        backgroundColor: '#fff',
        elevation: 6, // Slightly increased for a more pronounced shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.15,
        shadowRadius: moderateScale(6, 0.3),
        borderTopWidth: 1, // Subtle border for professional look
        borderTopColor: '#e5e7eb', // Light gray border
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row', // Align icon and text horizontally
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(12),
        borderRadius: moderateScale(12, 0.3), // Slightly larger radius for modern look
        marginHorizontal: scale(8), // Increased spacing between buttons
    },
    callButton: {
        backgroundColor: '#234F68', // Darker blue for professional tone
    },
    whatsappButton: {
        backgroundColor: '#25D366', // WhatsApp brand color
    },
    disabledButton: {
        opacity: 0.5, // Visual feedback for disabled state
    },
    actionButtonText: {
        color: '#fff',
        fontSize: moderateScale(16, 0.3),
        fontFamily: 'Rubik-Medium', // Use a medium weight font for professionalism
        fontWeight: '500',
    },
    buttonIcon: {
        marginRight: scale(6), // Consistent spacing between icon and text
    },
});
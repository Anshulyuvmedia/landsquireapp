import { StyleSheet, Text, TouchableOpacity, View, Image, FlatList, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import RBSheet from 'react-native-raw-bottom-sheet';
import { Switch } from 'react-native';
import DatePicker from 'react-native-date-picker';
import icons from '@/constants/icons';
import { useTranslation } from 'react-i18next';
import Ionicons from "@expo/vector-icons/Ionicons";

// Helper to format price in Indian Rupees
const formatINR = (amount) => {
    if (!amount) return '₹0';
    const num = Number(amount);
    if (num >= 1e7) {
        return '₹' + (num / 1e7).toFixed(2).replace(/\.00$/, '') + ' Cr';
    } else if (num >= 1e5) {
        return '₹' + (num / 1e5).toFixed(2).replace(/\.00$/, '') + ' Lakh';
    }
    return '₹' + num.toLocaleString('en-IN');
};

// Get screen width for DatePicker
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const RentListing = () => {
    const { t, i18n } = useTranslation();
    const [userPropertyData, setUserPropertyData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [bidStatus, setBidStatus] = useState(false);
    const [bidEndDate, setBidEndDate] = useState(new Date());
    const [lastRefreshTime, setLastRefreshTime] = useState(0);
    const router = useRouter();
    const rbSheetRef = useRef();

    const handleCardPress = (id) => router.push(`/properties/${id}`);
    const handleEditPress = (id) => router.push(`/Rent/editrentproperty/${id}`);
    const handleAddProperty = () => router.push('/(tabs)/addlisting/addproperty');

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date)) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    };

    const fetchUserData = async () => {
        setLoading(true);
        try {
            const storedUserData = await AsyncStorage.getItem('userData');
            const token = await AsyncStorage.getItem('userToken');

            if (!storedUserData) {
                console.error("No user data found in storage");
                setSheetMessage({
                    type: 'error',
                    title: t('error'),
                    message: t('userDataMissing'),
                });
                rbSheetRef.current.open();
                return;
            }

            const parsedPropertyData = JSON.parse(storedUserData);

            // console.log("User ID:", parsedPropertyData?.id, "Token:", token);

            if (!parsedPropertyData?.id) {
                console.error('User ID missing');
                setSheetMessage({
                    type: 'error',
                    title: t('error'),
                    message: t('userDataMissing'),
                });
                rbSheetRef.current.open();
                return;
            }

            const response = await axios.get(
                `https://landsquire.in/api/viewuserlistings?id=${parsedPropertyData.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                }
            );


            if (response?.data?.properties) {
                const formattedData = response.data.properties
                    .filter(item => item.propertyfor === 'Rent')
                    .map((item) => ({
                        id: item.id,
                        property_name: item.property_name,
                        address: item.address,
                        price: item.price,
                        status: item.status,
                        propertyfor: item.propertyfor,
                        bidstatus: item.bidstatus,
                        bidenddate: formatDate(item.bidenddate),
                        category: item.category,
                        subcategory: item.subcategory,
                        thumbnail:
                            item.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.startsWith('http')
                                ? item.thumbnail
                                : item.thumbnail
                                    ? `https://landsquire.in/adminAssets/images/Listings/${item.thumbnail}`
                                    : 'https://landsquire.in/adminAssets/images/default-thumbnail.jpg',
                        city: item.city,
                    }));

                setUserPropertyData(formattedData);
            } else {
                console.error('Unexpected API response format:', response.data);
                setSheetMessage({
                    type: 'error',
                    title: t('error'),
                    message: t('unexpectedResponse'),
                });
                rbSheetRef.current.open();
            }
        } catch (error) {
            console.error(
                'Error fetching user data:',
                error.response ? error.response.status + " - " + JSON.stringify(error.response.data) : error.message
            );
            setSheetMessage({
                type: 'error',
                title: t('error'),
                message: t('fetchError'),
            });
            rbSheetRef.current.open();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };


    useEffect(() => {
        fetchUserData();
    }, []);

    const onRefresh = async () => {
        const now = Date.now();
        // Prevent refreshing too frequently (minimum 2 seconds between refreshes)
        if (now - lastRefreshTime < 2000) return;

        setRefreshing(true);
        setLastRefreshTime(now);

        // Add a minimum refresh duration for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchUserData();
    };

    const [sheetMessage, setSheetMessage] = useState({ type: '', title: '', message: '' });

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.container}>

                <View style={styles.infoContainer}>
                    <Text style={[styles.infoText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                        {t('allPropertiesListed')}
                    </Text>
                </View>

                {/* Message RBSheet */}
                <RBSheet
                    ref={rbSheetRef}
                    closeOnDragDown
                    closeOnPressMask
                    customStyles={{
                        container: {
                            borderTopLeftRadius: moderateScale(20),
                            borderTopRightRadius: moderateScale(20),
                            padding: moderateScale(20),
                            backgroundColor: sheetMessage.type === 'success' ? '#E6F3E6' : '#FFE6E6',
                        },
                        draggableIcon: {
                            backgroundColor: '#1F4C6B',
                        },
                    }}
                    height={verticalScale(200)}
                >
                    <View style={styles.sheetContent}>
                        <Text style={[styles.sheetTitle, {
                            fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold',
                            color: sheetMessage.type === 'success' ? 'green' : 'red'
                        }]}>
                            {sheetMessage.title}
                        </Text>
                        <Text style={[styles.sheetMessage, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {sheetMessage.message}
                        </Text>
                        <TouchableOpacity
                            style={[styles.sheetButton, { backgroundColor: sheetMessage.type === 'success' ? '#8BC83F' : '#FF4444' }]}
                            onPress={() => rbSheetRef.current.close()}
                        >
                            <Text style={[styles.sheetButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                {t('ok')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </RBSheet>

                {/* Content */}
                <View style={styles.content}>
                    {loading && !refreshing ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#4A90E2" />
                            <Text style={[styles.loadingText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                {t('loadingProperties')}
                            </Text>
                        </View>
                    ) : userPropertyData.length === 0 ? (
                        <View style={styles.noDataContainer}>
                            <TouchableOpacity onPress={handleAddProperty}>
                                <Image source={icons.noProperties} style={styles.noDataIcon} />
                            </TouchableOpacity>
                            <Text style={[styles.noDataTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-SemiBold' : 'Rubik-SemiBold' }]}>
                                {t('noPropertiesTitle')}
                            </Text>
                            <Text style={[styles.noDataMessage, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                {t('noPropertiesMessage')}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={userPropertyData}
                            keyExtractor={(item) => item.id.toString()}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContent}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleCardPress(item.id)}
                                    style={styles.card}
                                >
                                    {/* Image Section */}
                                    <View style={styles.imageContainer}>
                                        <Image
                                            source={{ uri: item.thumbnail || 'https://landsquire.in/adminAssets/images/default-thumbnail.jpg' }}
                                            style={styles.propertyImage}
                                        />
                                        <View style={styles.categoryBadge}>
                                            <Text style={[styles.categoryText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                                {item.propertyfor}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Text Content Section */}
                                    <View style={styles.textContent}>
                                        <Text style={[styles.propertyName, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                            {item.property_name.length > 20
                                                ? item.property_name.slice(0, 20) + '...'
                                                : item.property_name}
                                        </Text>
                                        <View style={styles.locationRow}>
                                            <View style={styles.statusContainer}>
                                                <Ionicons name="location-outline" size={16} color="#234F68" />
                                                <Text style={[styles.locationText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                                    {item.city}
                                                </Text>
                                            </View>
                                            <View style={styles.statusContainer}>
                                                <View style={[styles.statusDot, { backgroundColor: item.status?.toLowerCase() === 'published' ? '#28A745' : '#DC3545' }]} />
                                                <Text style={[styles.statusText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                                    {item.status?.toLowerCase() === 'published' ? t('Active') : t('Inactive')}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.priceRow}>
                                            <Text style={[styles.priceText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                                {formatINR(item.price)}
                                            </Text>
                                            <View style={styles.categoryBox}>
                                                <Text style={[styles.categoryTextt, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                                    {item.category} - {item.subcategory}
                                                </Text>
                                            </View>

                                        </View>

                                        <View style={styles.buttonRow}>
                                            <TouchableOpacity style={styles.editButton} onPress={() => handleEditPress(item.id)}>
                                                <Text style={[styles.editText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                                    {t('editProperty')}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.bidButton} onPress={() => handleCardPress(item.id)}>
                                                <Text style={[styles.editText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                                    View
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    colors={['#8BC83F', '#234F68']} // Multiple colors for a more dynamic effect
                                    tintColor="#8BC83F"
                                    title={t('refreshing')}
                                    titleColor="#234F68"
                                    progressViewOffset={verticalScale(20)}
                                    progressBackgroundColor="#fafafa"
                                />
                            }
                        />
                    )}
                </View>

            </View>
        </View>
    );
};

export default RentListing;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
        paddingHorizontal: scale(10),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: verticalScale(5),
    },
    backButton: {
        backgroundColor: '#f4f2f7',
        borderRadius: moderateScale(20),
        width: moderateScale(40),
        height: moderateScale(40),
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: {
        width: moderateScale(20),
        height: moderateScale(20),
    },
    title: {
        fontSize: moderateScale(18),
        color: '#234F68',
    },
    bellIcon: {
        width: moderateScale(24),
        height: moderateScale(24),
    },
    infoContainer: {
        alignItems: 'center',
        marginBottom: verticalScale(3),
        marginTop: 10,
    },
    infoText: {
        fontSize: moderateScale(14),
        color: '#4A5568',
    },
    content: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: moderateScale(14),
        color: '#718096',
        marginTop: verticalScale(8),
    },
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(20),
    },
    noDataIcon: {
        width: scale(120),
        height: scale(120),
    },
    noDataTitle: {
        fontSize: moderateScale(18),
        fontWeight: '600',
        color: '#2D3748',
        textAlign: 'center',
        marginBottom: verticalScale(8),
    },
    noDataMessage: {
        fontSize: moderateScale(14),
        color: '#718096',
        textAlign: 'center',
        marginBottom: verticalScale(16),
    },
    listContent: {
        paddingBottom: verticalScale(75),
        paddingHorizontal: scale(2),
    },
    card: {
        width: '100%',
        height: verticalScale(100),
        borderRadius: moderateScale(30),
        backgroundColor: '#f5f4f8',
        flexDirection: 'row',
        overflow: 'hidden',
        marginBottom: verticalScale(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: moderateScale(4),
        elevation: 3,
    },
    imageContainer: {
        width: scale(100),
        height: '100%',
        position: 'relative',
        padding: moderateScale(8),
    },
    propertyImage: {
        width: '100%',
        height: '100%',
        borderRadius: moderateScale(25),
        resizeMode: 'cover',
    },
    categoryBadge: {
        position: 'absolute',
        bottom: verticalScale(16),
        left: scale(16),
        backgroundColor: 'rgba(35,79,104,0.9)',
        borderRadius: moderateScale(10),
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(4),
    },
    categoryBox: {
        // Color: 'rgba(35,79,104,0.9)',
        // borderRadius: moderateScale(10),
        // paddingHorizontal: scale(16),
        // paddingVertical: verticalScale(4),
    },
    categoryTextt: {
        fontSize: moderateScale(10),
        // color: '#234F68',
    },
    categoryText: {
        fontSize: moderateScale(10),
        color: '#FFFFFF',
        fontWeight: '500',
    },
    textContent: {
        flex: 1,
        padding: moderateScale(8),
        justifyContent: 'space-between',
        alignItems: 'start',
    },
    propertyName: {
        fontSize: moderateScale(14),
        fontWeight: 'bold',
        color: '#4A5568',
        textTransform: 'capitalize',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    locationText: {
        fontSize: moderateScale(12),
        color: '#234F68',
        fontWeight: '400',
    },
    priceText: {
        fontSize: moderateScale(12),
        fontWeight: '500',
        color: '#4A5568',
        // marginBottom: verticalScale(8),
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: moderateScale(8),
        height: moderateScale(8),
        borderRadius: moderateScale(4),
        marginRight: scale(4),
    },
    statusText: {
        fontSize: moderateScale(12),
        fontWeight: '400',
        color: '#4A5568',
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'flex-end',
    },
    editButton: {
        backgroundColor: '#8bc83f',
        justifyContent: 'center',
        alignItems: 'center',
        width: '48%',
        height: verticalScale(25),
        borderRadius: moderateScale(15),
        marginEnd: 5,

    },
    bidButton: {
        backgroundColor: '#234F68',
        justifyContent: 'center',
        alignItems: 'center',
        width: '48%',
        height: verticalScale(25),
        borderRadius: moderateScale(15),
    },
    editText: {
        fontSize: moderateScale(14),
        fontWeight: '400',
        color: '#FFFFFF',
        paddingHorizontal: scale(10),
    },
    sheetTitle: {
        fontSize: moderateScale(18),
        color: '#234F68',
        marginBottom: verticalScale(16),
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    switchLabel: {
        fontSize: moderateScale(14),
        color: '#4A5568',
    },
    datePickerContainer: {
        marginBottom: verticalScale(16),
    },
    datePicker: {
        width: SCREEN_WIDTH - scale(40),
        height: verticalScale(100),
    },
    submitButton: {
        backgroundColor: '#8bc83f',
        paddingVertical: verticalScale(10),
        borderRadius: moderateScale(15),
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: '#a0a0a0',
    },
    submitButtonText: {
        fontSize: moderateScale(14),
        color: '#FFFFFF',
    },
    labelText: {
        fontSize: moderateScale(10),
        color: '#4A5568',
    },
    sheetContent: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    sheetMessage: {
        fontSize: moderateScale(14),
        color: '#333',
        textAlign: 'center',
        marginBottom: verticalScale(20),
    },
    sheetButton: {
        borderRadius: moderateScale(10),
        paddingVertical: verticalScale(10),
        paddingHorizontal: scale(20),
    },
    sheetButtonText: {
        fontSize: moderateScale(16),
        color: '#FFFFFF',
    },
});
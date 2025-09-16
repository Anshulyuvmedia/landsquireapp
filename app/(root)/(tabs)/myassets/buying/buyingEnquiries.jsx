import { StyleSheet, ScrollView, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Linking, Alert } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import RBSheet from 'react-native-raw-bottom-sheet'; // Corrected import
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';

const BuyingEnquiries = () => {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const rbSheetRef = useRef();

    useEffect(() => {
        fetchUserEnquiries();
    }, []);

    const fetchUserEnquiries = async () => {
        setLoading(true);
        try {
            const parsedPropertyData = JSON.parse(await AsyncStorage.getItem('userData'));
            if (!parsedPropertyData?.id) {
                console.error('User data or ID missing');
                return;
            }
            const token = await AsyncStorage.getItem('userToken');

            const response = await axios.get(`https://landsquire.in/api/fetchenquiries?id=${parsedPropertyData.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });
            // console.log('API Response:', response.data.brokerenquiries);

            if (response.data?.myenquiries) {
                const parsedEnquiries = response.data.myenquiries
                    .filter(enquiry =>
                        enquiry.propertyfor === null ||
                        enquiry.propertyfor === "Sell"
                    )
                    .map(enquiry => {
                        let bids = [];

                        if (typeof enquiry.propertybid === "string" && enquiry.propertybid.trim().startsWith("[")) {
                            try {
                                // ✅ keep only null bidamounts
                                bids = JSON.parse(enquiry.propertybid).filter(b => b.bidamount === null);
                            } catch (e) {
                                console.error("Failed to parse propertybid JSON:", e);
                            }
                        } else if (enquiry.propertybid === null) {
                            bids = [{ bidamount: null, date: enquiry.created_at }];
                        }

                        return { ...enquiry, propertybid: bids };
                    })
                    // ✅ only show enquiries that have at least one null bid
                    .filter(enquiry => enquiry.propertybid.length > 0);

                // console.log('parsedEnquiries', parsedEnquiries);
                setEnquiries(parsedEnquiries);
            } else {
                console.error("Unexpected API response format:", response.data);
            }

        } catch (error) {
            console.error('Error fetching enquiries:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchUserEnquiries();
    };

    const openDetails = (enquiry) => {
        setSelectedEnquiry(enquiry);
        rbSheetRef.current.open();
    };

    const formatCurrency = (amount) => {
        if (!amount || isNaN(amount)) return t('notAvailable');
        const num = Number(amount);

        if (num >= 10000000) {
            const crore = num / 10000000;
            return `${crore % 1 === 0 ? crore : crore.toFixed(2).replace(/\.00$/, '')} Cr.`;
        } else if (num >= 100000) {
            const lakh = num / 100000;
            return `${lakh % 1 === 0 ? lakh : lakh.toFixed(2).replace(/\.00$/, '')} Lakh`;
        } else if (num >= 1000) {
            const thousand = num / 1000;
            return `${thousand % 1 === 0 ? thousand : thousand.toFixed(2).replace(/\.00$/, '')} Thousand`;
        } else {
            return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
        }
    };

    const getLatestBid = (bids) => {
        if (Array.isArray(bids) && bids.length > 0) {
            return bids.reduce((latest, current) =>
                new Date(current.date) > new Date(latest.date) ? current : latest
            );
        }
        return { bidamount: t('notAvailable'), date: '' };
    };

    const formatPhoneNumber = (phone) => {
        if (!phone) return null;
        let formatted = phone.replace(/\D/g, '');
        if (!formatted.startsWith('+')) {
            if (formatted.length === 10) {
                formatted = `${formatted}`;
            } else if (formatted.length > 10 && !formatted.startsWith('91')) {
                formatted = `+${formatted}`;
            }
        }
        if (formatted.length < 10) return null;
        return formatted;
    };

    const handleCallPress = async (enquiry) => {

        if (enquiry?.mobilenumber) {
            Linking.openURL(`tel:${enquiry?.mobilenumber}`).catch((err) => console.error('Error opening phone dialer:', err));
        } else {
            console.warn('Phone number not available');
        }
    };

    const handleWhatsAppPress = async (enquiry) => {
        const phone = formatPhoneNumber(enquiry?.mobilenumber);
        console.log('WhatsApp - Raw phone:', enquiry?.mobilenumber, 'Formatted:', phone);
        if (!phone) {
            Alert.alert(t('error'), t('phoneNotAvailable'));
            console.warn('Phone number not available or invalid:', enquiry?.mobilenumber);
            return;
        }
        const url = `whatsapp://send?phone=${phone}`;
        console.log('Attempting to open URL:', url);
        try {
            const supported = await Linking.canOpenURL(url);
            console.log('Can open WhatsApp URL:', supported);
            if (supported) {
                await Linking.openURL(url);
            } else {
                // Fallback to web-based WhatsApp
                const webUrl = `https://wa.me/${phone}`;
                console.log('Falling back to web URL:', webUrl);
                const webSupported = await Linking.canOpenURL(webUrl);
                if (webSupported) {
                    await Linking.openURL(webUrl);
                } else {
                    Alert.alert(t('error'), t('whatsappNotInstalled'));
                    console.error('WhatsApp not supported');
                }
            }
        } catch (err) {
            Alert.alert(t('error'), t('failedToOpenWhatsApp'));
            console.error('Error opening WhatsApp:', err);
        }
    };

    const renderEnquiry = ({ item }) => {
        const latestBid = getLatestBid(item.propertybid);
        return (
            <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.cardLabel}>Name:</Text>
                        <Text style={[styles.cardTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
                            {item.name}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.cardLabel}>{t('Date')}:</Text>
                        <Text style={[styles.cardDate, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {new Date(latestBid.date || item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardrow}>
                    {/* {(selectedEnquiry?.propertyfor === null || selectedEnquiry?.propertyfor === 'Sale') && latestBid?.bidamount != null && latestBid?.bidamount !== '' && (
                    <View>
                        <Text style={styles.cardLabel}>{t('Bid Amount')}:</Text>
                        <Text style={[styles.cardText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {formatCurrency(latestBid.bidamount)}
                        </Text>
                    </View>
                    )} */}

                    <View>
                        <Text style={styles.cardLabel}>{t('Category')}:</Text>
                        <Text style={[styles.cardText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {item.housecategory}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.cardLabel}>{t('City')}:</Text>
                        <Text style={[styles.cardText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {item.inwhichcity || t('notAvailable')}
                        </Text>
                    </View>
                </View>
                <View style={styles.buttonContainer}>
                    {item.propertyid && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.viewPropertyButton]}
                            onPress={() => router.push(`/properties/${item.propertyid}`)}
                        >
                            <MaterialIcons name="visibility" size={moderateScale(16, 0.3)} color="#fff" style={styles.buttonIcon} />
                            <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                {t('viewProperty')}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.actionButton, styles.callButton, !item.mobilenumber && styles.disabledButton]}
                        onPress={() => handleCallPress(item)}
                        disabled={!item.mobilenumber}
                    >

                        <Feather name="phone" size={moderateScale(16, 0.3)} color="#fff" style={styles.buttonIcon} />
                        <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                            {t('Call')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.whatsappButton, !item.mobilenumber && styles.disabledButton]}
                        onPress={() => handleWhatsAppPress(item)}
                        disabled={!item.mobilenumber}
                    >
                        <FontAwesome5 name="whatsapp" size={moderateScale(16, 0.3)} color="#fff" style={styles.buttonIcon} />
                        <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                            {t('Whatsapp')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const renderBidHistory = (bids) => {
        if (!Array.isArray(bids)) return null;
        return bids.map((bid, index) => (
            <View key={index} style={styles.bidHistoryRow}>
                <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                    {t('bid', { index: index + 1 })}:
                </Text>
                <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                    {formatCurrency(bid.bidamount)} on {new Date(bid.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
            </View>
        ));
    };

    return (
        <View style={styles.container}>
            {/* <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image source={icons.backArrow} style={styles.backIcon} />
                </TouchableOpacity>
                <Text style={[styles.title, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>{t('My Leads')}</Text>
                <TouchableOpacity onPress={() => router.push('/notifications')}>
                    <Image source={icons.bell} style={styles.bellIcon} />
                </TouchableOpacity>
            </View>
            <PropertyNavigation path={'myleads'} /> */}
            <View className='mx-auto mt-3'>
                <Text>All the enquiries done by you.</Text>
            </View>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#234F68" />
                </View>
            ) : enquiries.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                        {t('noEnquiries')}
                    </Text>
                    <TouchableOpacity
                        style={{
                            marginTop: 10,
                            alignSelf: 'center',
                            backgroundColor: '#234F68',
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            borderRadius: 8,
                        }}
                        onPress={onRefresh}
                        disabled={loading}
                    >
                        <Text style={{ color: '#fff', fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }}>
                            Refresh
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={enquiries}
                    renderItem={renderEnquiry}
                    keyExtractor={(item) => item.id.toString()}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.flatListContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#234F68']}
                        />
                    }
                />
            )}

            <RBSheet
                ref={rbSheetRef}
                height={verticalScale(600)}
                openDuration={250}
                customStyles={{
                    container: styles.rbSheet,
                }}
            >
                {selectedEnquiry && (
                    <View style={styles.sheetContainer}>
                        <View style={styles.sheetHeader}>
                            <Text style={[styles.sheetTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
                                {t('enquiryDetails')}
                            </Text>
                            <TouchableOpacity
                                style={styles.sheetCloseButton}
                                onPress={() => rbSheetRef.current.close()}
                            >
                                <Text style={[styles.sheetCloseButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    X
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.sheetContent}>
                            <View style={styles.sheetRow}>
                                <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('name')}:
                                </Text>
                                <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                    {selectedEnquiry.name}
                                </Text>
                            </View>
                            <View style={styles.sheetRow}>
                                <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('mobile')}:
                                </Text>
                                <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                    {formatPhoneNumber(selectedEnquiry.mobilenumber) || selectedEnquiry.mobilenumber}
                                </Text>
                            </View>
                            <View style={styles.sheetRow}>
                                <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('email')}:
                                </Text>
                                <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                    {selectedEnquiry.email}
                                </Text>
                            </View>
                            <View style={styles.sheetRow}>
                                <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('city')}:
                                </Text>
                                <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                    {selectedEnquiry.city}
                                </Text>
                            </View>
                            <View style={styles.sheetRow}>
                                <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('state')}:
                                </Text>
                                <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                    {selectedEnquiry.state}
                                </Text>
                            </View>
                            <View style={styles.sheetRow}>
                                <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('propertyType')}:
                                </Text>
                                <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                    {selectedEnquiry.housecategory}
                                </Text>
                            </View>
                            <View style={styles.sheetRow}>
                                <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('clientsCity')}:
                                </Text>
                                <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                    {selectedEnquiry.inwhichcity || t('notAvailable')}
                                </Text>
                            </View>
                            <View style={styles.sheetRow}>
                                <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('status')}:
                                </Text>
                                <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                    {selectedEnquiry.status}
                                </Text>
                            </View>
                            {/* {renderBidHistory(selectedEnquiry.propertybid)} */}
                        </ScrollView>
                        <View style={styles.sheetButtonContainer}>
                            <TouchableOpacity
                                style={styles.sheetActionButton}
                                onPress={() => rbSheetRef.current.close()}
                            >
                                <Text style={[styles.sheetActionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('close')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </RBSheet>
        </View>
    );
};

export default BuyingEnquiries;

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
        fontFamily: 'Rubik-Bold',
        color: '#234F68',
    },
    bellIcon: {
        width: moderateScale(24),
        height: moderateScale(24),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: verticalScale(50),
    },
    emptyText: {
        fontSize: moderateScale(16),
        color: '#666',
        fontFamily: 'Rubik-Regular',
    },
    flatListContent: {
        paddingBottom: verticalScale(80),
        paddingHorizontal: scale(7),
    },
    card: {
        backgroundColor: '#fff',
        borderColor: '#234F68',
        borderWidth: 2,
        borderRadius: moderateScale(10),
        padding: moderateScale(15),
        marginVertical: verticalScale(8),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(8),
    },
    cardrow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: verticalScale(3),
    },
    cardLabel: {
        fontSize: moderateScale(12),
        color: '#666',
        fontFamily: 'Rubik-Regular',
    },
    cardTitle: {
        fontSize: moderateScale(16),
        fontFamily: 'Rubik-Bold',
        color: '#234F68',
    },
    cardText: {
        fontSize: moderateScale(14),
        color: '#000',
        fontWeight: 'bold',
        marginVertical: verticalScale(3),
    },
    cardDate: {
        fontSize: moderateScale(12),
        color: '#000',
        fontWeight: 'bold',
        marginTop: verticalScale(5),
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: verticalScale(10),
        gap: scale(10),
        flexWrap: 'wrap', // Added to prevent overflow
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: moderateScale(8),
        paddingVertical: verticalScale(5),
        paddingHorizontal: scale(10),
    },
    viewPropertyButton: {
        backgroundColor: '#234F68',
    },
    callButton: {
        backgroundColor: '#FF9800',
    },
    whatsappButton: {
        backgroundColor: '#4CAF50',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: moderateScale(14),
        fontFamily: 'Rubik-Medium',
        marginLeft: scale(5),
    },
    buttonIcon: {
        marginRight: scale(1),
    },
    rbSheet: {
        flex: 1,
        borderTopLeftRadius: moderateScale(20),
        borderTopRightRadius: moderateScale(20),
        padding: moderateScale(20),
        backgroundColor: '#fff',
    },
    sheetContainer: {
        flex: 1,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: verticalScale(10),
    },
    sheetTitle: {
        fontSize: moderateScale(18),
        fontFamily: 'Rubik-Bold',
        color: '#234F68',
    },
    sheetCloseButton: {
        backgroundColor: '#f4f2f7',
        borderRadius: moderateScale(20),
        width: moderateScale(30),
        height: moderateScale(30),
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetCloseButtonText: {
        fontSize: moderateScale(16),
        fontFamily: 'Rubik-Medium',
        color: '#234F68',
    },
    sheetContent: {
        flexGrow: 1,
        paddingBottom: verticalScale(20),
    },
    sheetRow: {
        flexDirection: 'row',
        marginVertical: verticalScale(5),
    },
    bidHistoryRow: {
        flexDirection: 'row',
        marginVertical: verticalScale(5),
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: verticalScale(5),
    },
    sheetLabel: {
        fontSize: moderateScale(14),
        fontFamily: 'Rubik-Medium',
        color: '#234F68',
        width: scale(120),
    },
    sheetValue: {
        fontSize: moderateScale(14),
        fontFamily: 'Rubik-Regular',
        color: '#666',
        flex: 1,
    },
    sheetButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: verticalScale(10),
        gap: scale(10),
    },
    sheetActionButton: {
        backgroundColor: '#234F68',
        borderRadius: moderateScale(8),
        paddingVertical: verticalScale(8),
        paddingHorizontal: scale(12),
        alignItems: 'center',
    },
    sheetActionButtonText: {
        color: '#fff',
        fontSize: moderateScale(14),
        fontFamily: 'Rubik-Medium',
    },
});
import { StyleSheet, ScrollView, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, Linking, Alert } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import RBSheet from 'react-native-raw-bottom-sheet';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import icons from '@/constants/icons';
import { useUser } from '@/context/UserContext';
import { useTranslation } from 'react-i18next';
import { MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';

// Utility function to format phone numbers for WhatsApp
const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    // Remove any non-digit characters (spaces, dashes, etc.)
    let cleaned = phone.replace(/\D/g, '');
    // Ensure the phone number includes the country code (e.g., +91 for India)
    if (!cleaned.startsWith('+')) {
        // Assuming Indian phone numbers; adjust country code as needed
        cleaned = `+91${cleaned}`;
    }
    return cleaned;
};

const Loanleads = () => {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { userType, loading: userLoading } = useUser();
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedEnquiry, setSelectedEnquiry] = useState(null);
    const rbSheetRef = useRef();

    const fetchUserEnquiries = async () => {
        setLoading(true);
        try {
            const parsedPropertyData = JSON.parse(await AsyncStorage.getItem('userData'));
            if (!parsedPropertyData?.id) {
                console.error('User data or ID missing at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
                return;
            }
            const token = await AsyncStorage.getItem('userToken');

            const response = await axios.get(`https://landsquire.in/api/fetchenquiries?id=${parsedPropertyData.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });
            console.log('response', response.data.loanenquiries);
            if (response.data && Array.isArray(response.data.loanenquiries)) {
                const parsedEnquiries = response.data.loanenquiries.map(enquiry => ({
                    ...enquiry,
                    loan_amount: Number(enquiry.loan_amount) || 0,
                }));
                setEnquiries(parsedEnquiries);
            } else {
                console.error('No loanenquiries found or invalid response format at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ':', response.data);
                setEnquiries([]);
            }
        } catch (error) {
            console.error('Error fetching enquiries at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ':', error);
            setEnquiries([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    
    useEffect(() => {
        fetchUserEnquiries();
    }, []);



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
            return `${thousand % 1 === 0 ? thousand : thousand.toFixed(2).replace(/\.00$/, '')} k`;
        } else {
            return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
        }
    };

    const handleCall = (number) => {
        if (number) {
            Linking.openURL(`tel:${number}`).catch(err => console.error('Error opening phone app:', err));
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
        return (
            <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text className='text-sm font-rubik text-gray-600'>Name:</Text>
                        <Text style={[styles.cardTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
                            {item.name}
                        </Text>
                    </View>
                    <View>
                        <Text className='text-sm font-rubik text-gray-600'>Date:</Text>
                        <Text style={[styles.cardDate, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardrow}>
                    <View>
                        <Text className='text-sm font-rubik text-gray-600'>Loan required:</Text>
                        <Text style={[styles.cardText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {formatCurrency(item.loan_amount)}
                        </Text>
                    </View>
                    <View>
                        <Text className='text-sm font-rubik text-gray-600'>City:</Text>
                        <Text style={[styles.cardText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {item.inwhichcity || item.city || t('notAvailable')}
                        </Text>
                    </View>
                </View>
                <View style={styles.buttonContainer}>
                    {item.propertyid && (
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => router.push(`/properties/${item.propertyid}`)}
                        >
                            <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                {t('viewProperty')}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {item.agentid && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.agentButton]}
                            onPress={() => router.push(`/broker/${item.agentid}`)}
                        >
                            <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                {t('viewBroker')}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {item.mobilenumber && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.callButton]}
                            onPress={() => handleCall(item.mobilenumber)}
                        >
                            <Feather name="phone" size={moderateScale(16, 0.3)} color="#fff" style={styles.buttonIcon} />
                            <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                {t('Call Now')}
                            </Text>
                        </TouchableOpacity>
                    )}
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

    const renderLoanDetails = () => {
        if (!selectedEnquiry?.loan_amount) return null;
        return (
            <View>

                <View style={styles.bidHistoryRow}>
                    <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                        {t('Loan Amount')}:
                    </Text>
                    <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                        {formatCurrency(selectedEnquiry.loan_amount)}
                    </Text>
                </View>
                <View style={styles.bidHistoryRow}>
                    <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                        {t('Date')}:
                    </Text>
                    <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                        {new Date(selectedEnquiry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {/* <View className='me-12'></View> */}
                <Text style={[styles.title, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
                    {t('Loan Enquiries')}
                </Text>
                <TouchableOpacity onPress={() => router.push('/dashboard')} style={styles.backButton}>
                    <Image source={icons.backArrow} style={styles.backIcon} />
                </TouchableOpacity>
                {/* <TouchableOpacity onPress={() => router.push('/notifications')}>
                    <Image source={icons.bell} style={styles.bellIcon} />
                </TouchableOpacity> */}
            </View>

            <View className='mx-auto'>
                <Text>All the loan enquiries.</Text>
            </View>

            {loading || userLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#234F68" />
                </View>
            ) : enquiries.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                        {t('noEnquiries')}
                    </Text>
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
                height={verticalScale(500)}
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
                                    {selectedEnquiry.mobilenumber}
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
                            {renderLoanDetails()}
                        </ScrollView>
                        <View style={styles.sheetButtonContainer}>
                            {selectedEnquiry.agentid && (
                                <TouchableOpacity
                                    style={[styles.sheetActionButton, styles.agentButton]}
                                    onPress={() => {
                                        rbSheetRef.current.close();
                                        router.push(`/broker/${selectedEnquiry.agentid}`);
                                    }}
                                >
                                    <Text style={[styles.sheetActionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                        {t('viewBroker')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {selectedEnquiry.mobilenumber && (
                                <TouchableOpacity
                                    style={[styles.sheetActionButton, styles.callButton]}
                                    onPress={() => handleCall(selectedEnquiry.mobilenumber)}
                                >
                                    <Feather name="phone" size={moderateScale(16, 0.3)} color="#fff" style={styles.buttonIcon} />
                                    <Text style={[styles.sheetActionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                        {t('Call Now')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.sheetActionButton, styles.whatsappButton, !selectedEnquiry.mobilenumber && styles.disabledButton]}
                                onPress={() => handleWhatsAppPress(selectedEnquiry)}
                                disabled={!selectedEnquiry.mobilenumber}
                            >
                                <FontAwesome5 name="whatsapp" size={moderateScale(16, 0.3)} color="#fff" style={styles.buttonIcon} />
                                <Text style={[styles.sheetActionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('Whatsapp')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </RBSheet>
        </View>
    );
};

export default Loanleads;

// Styles remain unchanged
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
        paddingInline: verticalScale(7),
    },
    card: {
        backgroundColor: '#fff',
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
    },
    cardTitle: {
        fontSize: moderateScale(16),
        fontFamily: 'Rubik-Bold',
        color: '#234F68',
    },
    statusBadge: {
        paddingHorizontal: moderateScale(10),
        paddingVertical: verticalScale(5),
        borderRadius: moderateScale(12),
    },
    statusText: {
        fontSize: moderateScale(12),
        fontFamily: 'Rubik-Medium',
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
    },
    whatsappButton: {
        backgroundColor: '#4CAF50',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#234F68',
        borderRadius: moderateScale(8),
        paddingVertical: verticalScale(5),
        paddingHorizontal: scale(12),
    },
    callButton: {
        backgroundColor: '#234F68',
    },
    agentButton: {
        backgroundColor: '#4CAF50',
    },
    buttonIcon: {
        marginRight: scale(3),
    },
    actionButtonText: {
        color: '#fff',
        fontSize: moderateScale(14),
        fontFamily: 'Rubik-Medium',
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#234F68',
        borderRadius: moderateScale(8),
        paddingVertical: verticalScale(8),
        paddingHorizontal: scale(12),
        alignItems: 'center',
    },
    sheetCallButton: {
        backgroundColor: '#4CAF50',
    },
    sheetActionButtonText: {
        color: '#fff',
        fontSize: moderateScale(14),
        fontFamily: 'Rubik-Medium',
    },
});
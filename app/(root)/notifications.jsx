import { StyleSheet, Text, TouchableOpacity, View, Image, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import icons from '@/constants/icons';
import RBSheet from 'react-native-raw-bottom-sheet';
import { useTranslation } from 'react-i18next';

const LIMIT = 10; // Number of notifications per page

const Notifications = () => {
    const { t, i18n } = useTranslation();
    const [notificationData, setNotificationData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [readStatus, setReadStatus] = useState({});
    const [filter, setFilter] = useState(t('all'));
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [error, setError] = useState(null);

    const fetchNotifications = useCallback(async (pageToFetch = 1) => {
        if (!hasMore && pageToFetch !== 1) return;
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const parsedUserData = JSON.parse(await AsyncStorage.getItem('userData'));
            const token = await AsyncStorage.getItem('userToken');
            if (!token || !parsedUserData?.id) {
                console.error('No token or user ID, redirecting to sign-in');
                await AsyncStorage.removeItem('userData');
                router.push('/signin');
                return;
            }

            const response = await axios.get(`https://landsquire.in/api/usernotifications/?id=${parsedUserData.id}&page=${pageToFetch}&limit=${LIMIT}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });

            if (response.data?.notifications) {
                const apiData = response.data.notifications;
                setNotificationData(prev => {
                    const newData = pageToFetch === 1 ? apiData : [...prev, ...apiData];
                    return [...new Set(newData.map(item => item.id))].map(id => newData.find(item => item.id === id));
                });
                setHasMore(apiData.length === LIMIT);

                const storedStatus = await AsyncStorage.getItem('readStatus');
                const initialStatus = storedStatus ? JSON.parse(storedStatus) : {};
                apiData.forEach((item, index) => {
                    if (!(item.id in initialStatus)) {
                        initialStatus[item.id] = item.read_at !== null;
                    }
                });
                setReadStatus(initialStatus);
                await AsyncStorage.setItem('readStatus', JSON.stringify(initialStatus));
            } else {
                console.error('Unexpected API response format:', response.data);
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error.response?.data, error.response?.status);
            if (error.response?.status === 401) {
                await AsyncStorage.removeItem('userToken');
                await AsyncStorage.removeItem('userData');
                router.push('/signin');
            }
            setError(t('error.apiFailed'));
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [hasMore, loading, t]);

    useEffect(() => {
        fetchNotifications(1);
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
                    fetchNotifications(nextPage);
                    return nextPage;
                });
            }
        }, 300),
        [hasMore, loading, fetchNotifications]
    );

    const toggleReadStatus = async (id) => {
        const updatedStatus = { ...readStatus, [id]: !readStatus[id] };
        setReadStatus(updatedStatus);
        await AsyncStorage.setItem('readStatus', JSON.stringify(updatedStatus));
    };

    const markAllAsRead = async () => {
        const updatedStatus = {};
        notificationData.forEach(item => {
            updatedStatus[item.id] = true;
        });
        setReadStatus(updatedStatus);
        await AsyncStorage.setItem('readStatus', JSON.stringify(updatedStatus));
    };

    const handleOpenSheet = async (item) => {
        if (!readStatus[item.id]) {
            const updatedStatus = { ...readStatus, [item.id]: true };
            setReadStatus(updatedStatus);
            await AsyncStorage.setItem('readStatus', JSON.stringify(updatedStatus));
        }
        setSelectedNotification(item);
        refRBSheet.current.open();
    };

    const handleCardPress = (id) => {
        refRBSheet.current.close();
        router.push(`/properties/${id}`);
    };

    const filteredNotifications = notificationData.filter(item => {
        if (filter === t('all')) return true;
        return readStatus[item.id] === (filter === t('read'));
    });

    const groupByDate = (data) => {
        const today = new Date().toLocaleDateString();
        return [
            { title: t('today'), data: data.filter(item => new Date(item.created_at).toLocaleDateString() === today) },
            { title: t('olderNotifications'), data: data.filter(item => new Date(item.created_at).toLocaleDateString() !== today) },
        ];
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year}`;
    };

    const unreadCount = notificationData.filter(item => !readStatus[item.id]).length;
    const readCount = notificationData.length - unreadCount;

    const onRefresh = useCallback(() => {
        setPage(1);
        setNotificationData([]);
        setHasMore(true);
        fetchNotifications(1);
    }, [fetchNotifications])

    const renderNotification = ({ item }) => {
        const notificationData = JSON.parse(item.data);
        const imageUrl = item.property?.thumbnail
            ? `https://landsquire.in/adminAssets/images/Listings/${item.property.thumbnail}`
            : 'https://via.placeholder.com/40';
        const isRead = readStatus[item.id] || false;
        const previewText = notificationData.message.length > 50
            ? `${notificationData.message.substring(0, 50)}...`
            : notificationData.message;

        return (
            <TouchableOpacity onPress={() => handleOpenSheet(item)}>
                <View style={[styles.card, !isRead && styles.unreadCard]}>
                    <Image source={{ uri: imageUrl }} style={styles.profileImage} />
                    <View style={styles.details}>
                        <View style={styles.headerRow}>
                            <Text style={[styles.name, !isRead && styles.unreadText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                {notificationData.title}
                            </Text>
                            <TouchableOpacity onPress={() => toggleReadStatus(item.id)}>
                                <View style={[styles.statusDot, isRead ? styles.readDot : styles.unreadDot]} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.description, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]} numberOfLines={2}>
                            {previewText}
                        </Text>
                        <Text style={[styles.timestamp, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section: { title, data } }) => (
        data.length > 0 && (
            <Text style={[styles.sectionTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-SemiBold' : 'Rubik-SemiBold' }]}>
                {title}
            </Text>
        )
    );

    const refRBSheet = useRef();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image source={icons.backArrow} style={styles.backIcon} />
                </TouchableOpacity>
                <Text style={[styles.title, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
                    {t('notifications')}
                </Text>
                <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                    <Text style={[styles.markAllText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                        {t('markAllRead')}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
                {[t('all'), t('read'), t('unread')].map((status, index) => {
                    const originalStatus = ['All', 'Read', 'Unread'][index];
                    const count = originalStatus === 'All' ? notificationData.length : originalStatus === 'Read' ? readCount : unreadCount;
                    return (
                        <TouchableOpacity
                            key={status}
                            style={[styles.filterButton, filter === status && styles.activeFilter]}
                            onPress={() => setFilter(status)}
                        >
                            <Text style={[styles.filterText, filter === status && styles.activeFilterText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                {status} {count > 0 && `(${count})`}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading && page === 1 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#234F68" />
                </View>
            ) : notificationData.length === 0 ? (
                <View style={styles.noDataContainer}>
                    <Image source={icons.alertDanger} style={styles.noDataIcon} />
                    <Text style={[styles.noDataTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
                        {t('noNotificationTitle')}
                    </Text>
                    <Text style={[styles.noDataMessage, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                        {t('noNotificationMessage')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={groupByDate(filteredNotifications)}
                    keyExtractor={(item) => item.title}
                    renderItem={({ item }) => (
                        <FlatList
                            data={item.data}
                            keyExtractor={(notification) => notification.id.toString()}
                            renderItem={renderNotification}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                    renderSectionHeader={renderSectionHeader}
                    showsVerticalScrollIndicator={false}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        <>
                            {loading && page > 1 && <ActivityIndicator size="large" color="#234F68" />}
                            {error && (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{error}</Text>
                                    <TouchableOpacity
                                        style={styles.retryButton}
                                        onPress={() => fetchNotifications(page)}
                                    >
                                        <Text style={styles.retryButtonText}>{t('retry')}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {!hasMore && notificationData.length > 0 && (
                                <Text style={styles.noMoreText}>You have seen all the notifications</Text>
                            )}
                        </>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={loading && page === 1}
                            onRefresh={onRefresh}
                            colors={['#234F68']}
                            tintColor="#234F68"
                        />
                    }
                />
            )}

            <RBSheet
                ref={refRBSheet}
                closeOnDragDown={true}
                closeOnPressMask={true}
                customStyles={{
                    wrapper: { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
                    container: {
                        borderTopLeftRadius: moderateScale(20),
                        borderTopRightRadius: moderateScale(20),
                        padding: moderateScale(16),
                        height: 400,
                    },
                    draggableIcon: { backgroundColor: '#D1D5DB' },
                }}
            >
                {selectedNotification && (
                    <View style={styles.sheetContent}>
                        <View style={styles.sheetHeader}>
                            <Image
                                source={{
                                    uri: selectedNotification.property?.thumbnail
                                        ? `https://landsquire.in/adminAssets/images/Listings/${selectedNotification.property.thumbnail}`
                                        : 'https://via.placeholder.com/40'
                                }}
                                style={styles.profileImage}
                            />
                            <View>
                                <Text style={[styles.sheetTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-SemiBold' : 'Rubik-SemiBold' }]}>
                                    {JSON.parse(selectedNotification.data).title}
                                </Text>
                                <Text style={[styles.sheetTimestamp, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                    {new Date(selectedNotification.created_at).toLocaleString()}
                                </Text>
                            </View>
                        </View>
                        <ScrollView style={styles.sheetScroll}>
                            {selectedNotification.property && (
                                <>
                                    <View style={styles.highlightContainer}>
                                        <Text style={[styles.highlightText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-SemiBold' : 'Rubik-SemiBold' }]}>
                                            Property: {selectedNotification.property.property_name}
                                        </Text>
                                    </View>
                                    {selectedNotification.property.bidenddate && (
                                        <View style={styles.highlightContainer}>
                                            <Text style={[styles.highlightText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-SemiBold' : 'Rubik-SemiBold' }]}>
                                                Bid End Date: {formatDate(selectedNotification.property.bidenddate)}
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}
                            <Text style={[styles.sheetDescription, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                {JSON.parse(selectedNotification.data).message}
                            </Text>
                        </ScrollView>
                        <View style={styles.sheetButtons}>
                            {selectedNotification.property && (
                                <TouchableOpacity
                                    style={styles.viewPropertyButton}
                                    onPress={() => handleCardPress(selectedNotification.property.id)}
                                >
                                    <Text style={[styles.viewPropertyButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                        {t('viewPropertynoti')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => refRBSheet.current.close()}
                            >
                                <Text style={[styles.closeButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
        paddingHorizontal: scale(16),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: verticalScale(12),
        marginTop: verticalScale(12),
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
    markAllButton: {
        backgroundColor: '#f4f2f7',
        borderRadius: moderateScale(20),
        paddingVertical: verticalScale(6),
        paddingHorizontal: scale(12),
    },
    markAllText: {
        fontSize: moderateScale(12),
        color: '#234F68',
        fontWeight: '500',
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(12),
    },
    filterButton: {
        flex: 1,
        backgroundColor: '#f4f2f7',
        paddingVertical: verticalScale(8),
        borderRadius: moderateScale(20),
        alignItems: 'center',
        marginHorizontal: scale(2),
    },
    activeFilter: {
        backgroundColor: '#234F68',
    },
    filterText: {
        fontSize: moderateScale(12),
        color: '#6B7280',
    },
    activeFilterText: {
        color: '#FFFFFF',
    },
    sectionTitle: {
        fontSize: moderateScale(16),
        color: '#1E293B',
        marginVertical: verticalScale(8),
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#f4f2f7',
        borderRadius: moderateScale(12),
        padding: moderateScale(12),
        marginBottom: verticalScale(8),
    },
    unreadCard: {
        borderWidth: 1,
        borderColor: '#8bc83f',
        backgroundColor: '#fff',
    },
    profileImage: {
        width: scale(70),
        height: scale(70),
        borderRadius: moderateScale(5),
        marginRight: scale(12),
    },
    details: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    name: {
        fontSize: moderateScale(14),
        fontWeight: '500',
        color: '#6B7280',
    },
    unreadText: {
        color: '#1E293B',
    },
    description: {
        fontSize: moderateScale(12),
        color: '#9CA3AF',
        marginTop: verticalScale(4),
    },
    timestamp: {
        fontSize: moderateScale(10),
        color: '#9CA3AF',
        marginTop: verticalScale(4),
    },
    statusDot: {
        width: moderateScale(10),
        height: moderateScale(10),
        borderRadius: moderateScale(5),
        borderWidth: 1,
    },
    unreadDot: {
        backgroundColor: '#8bc83f',
        borderColor: '#8bc83f',
    },
    readDot: {
        backgroundColor: '#FFFFFF',
        borderColor: '#D1D5DB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        alignItems: 'center',
        marginVertical: verticalScale(16),
    },
    errorText: {
        fontSize: moderateScale(14),
        color: '#EF4444',
        marginBottom: verticalScale(8),
    },
    retryButton: {
        backgroundColor: '#234F68',
        paddingVertical: verticalScale(8),
        paddingHorizontal: scale(16),
        borderRadius: moderateScale(12),
    },
    retryButtonText: {
        fontSize: moderateScale(14),
        color: '#FFFFFF',
        fontWeight: '500',
    },
    noMoreText: {
        fontSize: moderateScale(14),
        color: '#6B7280',
        textAlign: 'center',
        marginVertical: verticalScale(16),
    },
    sheetContent: {
        flex: 1,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(16),
    },
    sheetTitle: {
        fontSize: moderateScale(18),
        color: '#1E293B',
        marginBottom: verticalScale(8),
    },
    sheetTimestamp: {
        fontSize: moderateScale(12),
        color: '#9CA3AF',
    },
    sheetScroll: {
        flex: 1,
        marginBottom: verticalScale(16),
    },
    highlightContainer: {
        backgroundColor: '#F0F4F8',
        padding: moderateScale(8),
        borderRadius: moderateScale(6),
        marginBottom: verticalScale(8),
    },
    highlightText: {
        fontSize: moderateScale(14),
        color: '#234F68',
        textTransform: 'capitalize',
    },
    sheetDescription: {
        fontSize: moderateScale(14),
        color: '#4B5563',
        marginBottom: verticalScale(8),
    },
    sheetButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    viewPropertyButton: {
        backgroundColor: '#8bc83f',
        paddingVertical: verticalScale(10),
        borderRadius: moderateScale(12),
        flex: 1,
        alignItems: 'center',
        marginRight: scale(5),
    },
    viewPropertyButtonText: {
        fontSize: moderateScale(14),
        color: '#FFFFFF',
        fontWeight: '500',
    },
    closeButton: {
        backgroundColor: '#234F68',
        paddingVertical: verticalScale(10),
        borderRadius: moderateScale(12),
        flex: 1,
        alignItems: 'center',
        marginLeft: scale(5),
    },
    closeButtonText: {
        fontSize: moderateScale(14),
        color: '#FFFFFF',
        fontWeight: '500',
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
});

export default Notifications;
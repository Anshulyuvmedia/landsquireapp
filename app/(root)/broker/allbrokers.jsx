import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions, Linking, RefreshControl } from 'react-native';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import images from '@/constants/images';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Ionicons from '@expo/vector-icons/Ionicons';
import icons from '@/constants/icons';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';

const PADDING_HORIZONTAL = scale(15);
const GAP = scale(7);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Allbrokers = () => {
    const [brokerList, setBrokerList] = useState([]);
    const [filteredBrokerList, setFilteredBrokerList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCity, setSelectedCity] = useState('all');
    const [cities, setCities] = useState([]);
    const router = useRouter();
    const { t } = useTranslation();

    const fetchAgentList = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`https://landsquire.in/api/brokerlist`);
            if (response.data && response.data.success && Array.isArray(response.data.data)) {
                const apiData = response.data.data.map((broker) => ({
                    id: broker.id,
                    city: broker.city || 'Unknown',
                    name: broker.username ? broker.username.split(' ')[0] : 'Unknown broker',
                    image: broker.profile
                        ? broker.profile.startsWith('http')
                            ? { uri: broker.profile }
                            : { uri: `https://landsquire.in/adminAssets/images/Users/${broker.profile}` }
                        : images.avatar,
                    phone: broker.mobilenumber || `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                }));
                setBrokerList(apiData);
                setFilteredBrokerList(apiData);
                // Extract unique cities
                const uniqueCities = ['all', ...new Set(apiData.map(broker => broker.city).filter(city => city && city !== 'Unknown'))];
                setCities(uniqueCities);
            } else {
                console.error('Unexpected API response format:', response.data);
                setBrokerList([]);
                setFilteredBrokerList([]);
                setCities(['all']);
            }
        } catch (error) {
            console.error('Error fetching broker data:', error.response ? `${error.response.status} - ${error.response.statusText}` : error.message, error.response ? error.response.data : {});
            setBrokerList([]);
            setFilteredBrokerList([]);
            setCities(['all']);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAgentList();
    }, []);

    useEffect(() => {
        // Filter brokers based on selected city
        if (selectedCity === 'all') {
            setFilteredBrokerList(brokerList);
        } else {
            setFilteredBrokerList(brokerList.filter(broker => broker.city === selectedCity));
        }
    }, [selectedCity, brokerList]);

    const onRefresh = () => {
        setRefreshing(true);
        setSelectedCity('all'); // Reset filter on refresh
        fetchAgentList();
    };

    const handleCall = (phone) => {
        if (phone) {
            Linking.openURL(`tel:${phone}`).catch((err) => console.error('Error opening phone dialer:', err));
        } else {
            console.error('No phone number provided for call');
        }
    };

    const handleWhatsApp = (phone) => {
        if (phone) {
            const formattedPhone = phone.replace(/\s/g, '').startsWith('+') ? phone.replace(/\s/g, '') : `+91${phone.replace(/\s/g, '')}`;
            Linking.openURL(`https://wa.me/${formattedPhone}`).catch((err) => console.error('Error opening WhatsApp:', err));
        } else {
            console.error('No phone number provided for WhatsApp');
        }
    };

    const renderBroker = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => {
                const imageUri = typeof item.image === 'object' && item.image.uri ? item.image.uri : (typeof item.image === 'number' ? images.avatar : item.image);
                router.push({ pathname: `/broker/${item.id}`, params: { name: item.name, image: imageUri } });
            }}
        >
            <Image
                source={item.image}
                style={styles.brokerImage}
                onError={(error) => console.log('Image load error for', item.name, ':', error.nativeEvent.error)}
            />
            <View className='flex-row justify-content-between flex-1'>
                <View style={styles.infoContainer}>
                    <Text style={styles.brokerName}>{item.name}</Text>
                    <View style={styles.ratingContainer}>
                        <Text style={styles.ratingText}>{item.city}</Text>
                    </View>
                </View>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleCall(item.phone)}>
                        <Ionicons name="call" size={moderateScale(18)} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#25D366' }]} onPress={() => handleWhatsApp(item.phone)}>
                        <Ionicons name="logo-whatsapp" size={moderateScale(18)} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8bc83f" />
                <Text style={styles.loadingText}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>{t('allBrokers')}</Text>
                </View>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image source={icons.backArrow} style={styles.backIcon} />
                </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
                <Picker
                    selectedValue={selectedCity}
                    onValueChange={(itemValue) => setSelectedCity(itemValue)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                >
                    {cities.map((city) => (
                        <Picker.Item
                            key={city}
                            label={city === 'all' ? t('allCities') : city}
                            value={city}
                        />
                    ))}
                </Picker>
            </View>

            <FlatList
                data={filteredBrokerList}
                renderItem={renderBroker}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.flatListContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#8bc83f']}
                        tintColor="#8bc83f"
                    />
                }
                ListEmptyComponent={() => (
                    <Text style={styles.emptyText}>{t('noBrokersAvailable')}</Text>
                )}
            />
        </View>
    );
};

export default Allbrokers;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
        paddingHorizontal: PADDING_HORIZONTAL,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: verticalScale(10),
        marginTop: verticalScale(10),
    },
    backButton: {
        backgroundColor: '#E6F0FA',
        borderRadius: 9999,
        width: scale(30),
        height: scale(30),
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: {
        width: scale(20),
        height: scale(20),
    },
    titleContainer: {
        alignItems: 'center',
        flex: 1,
    },
    title: {
        fontSize: moderateScale(20),
        fontFamily: 'Rubik-Bold',
        color: '#234F68',
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterContainer: {
        marginBottom: verticalScale(10),
        backgroundColor: '#fff',
        borderRadius: moderateScale(8),
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    picker: {
        width: '100%',
        // height: verticalScale(50),
        color: '#234F68',
    },
    pickerItem: {
        fontSize: moderateScale(14),
        fontFamily: 'Rubik-Regular',
        color: '#234F68',
    },
    flatListContent: {
        paddingBottom: verticalScale(50),
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: moderateScale(8),
        padding: moderateScale(10),
        marginBottom: moderateScale(10),
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    brokerImage: {
        width: scale(50),
        height: scale(50),
        borderRadius: 9999,
        backgroundColor: '#fff',
        resizeMode: 'cover',
        marginRight: scale(10),
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    brokerName: {
        fontSize: moderateScale(16),
        fontFamily: 'Rubik-Medium',
        color: '#234F68',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(2),
    },
    ratingText: {
        marginLeft: scale(5),
        fontSize: moderateScale(12),
        fontFamily: 'Rubik-Regular',
        color: '#6B7280',
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: verticalScale(5),
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        borderRadius: moderateScale(50),
        paddingVertical: verticalScale(5),
        paddingHorizontal: scale(12),
        marginRight: scale(10),
    },
    emptyText: {
        fontSize: moderateScale(16),
        fontFamily: 'Rubik-Regular',
        color: '#6B7280',
        textAlign: 'center',
        marginTop: verticalScale(20),
    },
});
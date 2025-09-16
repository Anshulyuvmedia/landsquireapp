import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import images from '@/constants/images';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

const BrokerScroll = () => {
    const { t, i18n } = useTranslation();
    const [brokerList, setBrokerList] = useState([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const fetchAgenList = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`https://landsquire.in/api/brokerlist`);
            if (response.data && response.data.success && Array.isArray(response.data.data)) {
                const apiData = response.data.data.map((broker, index) => ({
                    id: broker.id,
                    name: broker.username ? broker.username.split(' ')[0] : t('unknownBroker'),
                    image: broker.profile
                        ? broker.profile.startsWith('http')
                            ? { uri: broker.profile }
                            : { uri: `https://landsquire.in/adminAssets/images/Users/${broker.profile}` }
                        : images.avatar,
                }));
                setBrokerList(apiData);
            } else {
                console.error('Unexpected API response format:', response.data);
                setBrokerList([]);
            }
        } catch (error) {
            console.error('Error fetching broker data:', error.response ? `${error.response.status} - ${error.response.statusText}` : error.message, error.response ? error.response.data : {});
            setBrokerList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgenList();
    }, []);

    const renderbroker = ({ item }) => (
        <TouchableOpacity
            onPress={() => {
                const imageUri = typeof item.image === 'object' && item.image.uri ? item.image.uri : (typeof item.image === 'number' ? images.avatar : item.image);
                router.push({ pathname: `/broker/${item.id}`, params: { name: item.name, image: imageUri } });
            }}
            className="items-center me-3"
        >
            <Image
                source={item.image}
                className="w-16 h-16 rounded-full bg-white shadow-sm"
                style={{ resizeMode: 'cover' }}
                onError={(error) => console.log('Image load error for', item.name, ':', error.nativeEvent.error)}
            />
            <Text className={`mt-2 text-sm ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-black-300`}>
                {item.name}
            </Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View className="my-5">
                <ActivityIndicator size="large" color="#8bc83f" />
            </View>
        );
    }

    return (
        <View className="my-5">
            <View className="flex-row items-center justify-between mb-4">
                <Text className={`text-xl ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-bold' : 'font-rubik-bold'} text-black-300`}>
                    {t('topPropertyBrokers')}
                </Text>
                <TouchableOpacity onPress={() => router.push('broker/allbrokers')}>
                    <Text className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-primary-300`}>
                        {t('explore')}
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={brokerList}
                renderItem={renderbroker}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <Text className={`text-black-300 text-center ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'}`}>
                        {t('noBrokersAvailable')}
                    </Text>
                )}
            />
        </View>
    );
};

export default BrokerScroll;

const styles = StyleSheet.create({});
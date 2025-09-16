import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import images from '@/constants/images';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Ionicons from '@expo/vector-icons/Ionicons';
import icons from '@/constants/icons';

const PADDING_HORIZONTAL = scale(15);
const GAP = scale(7);
const NUM_COLUMNS = 2;

const Allbankagents = () => {
    const [bankAgentList, setBankAgentList] = useState([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const fetchAgenList = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`https://landsquire.in/api/bankagentlist`);
            if (response.data && response.data.success && Array.isArray(response.data.data)) {
                const apiData = response.data.data.map((bankAgent, index) => ({
                    id: bankAgent.id,
                    name: bankAgent.username ? bankAgent.username.split(' ')[0] : 'Unknown bankAgent',
                    image: bankAgent.profile
                        ? bankAgent.profile.startsWith('http')
                            ? { uri: bankAgent.profile }
                            : { uri: `https://landsquire.in/adminAssets/images/Users/${bankAgent.profile}` }
                        : images.avatar,
                    rating: (Math.random() * (5 - 4) + 4).toFixed(1), // Simulated rating (4.0-5.0)
                    sales: Math.floor(Math.random() * 20) + 10, // Simulated sales (10-29)
                }));
                setBankAgentList(apiData);
            } else {
                console.error('Unexpected API response format:', response.data);
                setBankAgentList([]);
            }
        } catch (error) {
            console.error('Error fetching bankAgent data:', error.response ? `${error.response.status} - ${error.response.statusText}` : error.message, error.response ? error.response.data : {});
            setBankAgentList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgenList();
    }, []);

    const renderBankAgent = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => {
                const imageUri = typeof item.image === 'object' && item.image.uri ? item.image.uri : (typeof item.image === 'number' ? images.avatar : item.image);
                router.push({ pathname: `/bank/${item.id}`, params: { name: item.name, image: imageUri } });
            }}
        >
            <Image
                source={item.image}
                style={styles.bankAgentImage}
                onError={(error) => console.log('Image load error for', item.name, ':', error.nativeEvent.error)}
            />
            <Text style={styles.bankAgentName}>{item.name}</Text>
            <View style={styles.ratingContainer}>
                <Ionicons name="star" size={moderateScale(14)} color="#FFD700" />
                <Text style={styles.ratingText}>{item.rating}</Text>
                <Text style={styles.salesText}>{item.sales} Sold</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8bc83f" />
            </View>
        );
    }
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>All Bank Agent</Text>
                </View>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image source={icons.backArrow} style={styles.backIcon} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={bankAgentList}
                renderItem={renderBankAgent}
                keyExtractor={(item) => item.id.toString()}
                numColumns={NUM_COLUMNS}
                contentContainerStyle={styles.flatListContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <Text style={styles.emptyText}>No bankAgents available</Text>
                )}
            />
        </View>
    )
}

export default Allbankagents

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
    },
    backButton: {
        backgroundColor: '#E6F0FA',
        borderRadius: 9999,
        width: scale(44),
        height: scale(44),
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: {
        width: scale(20),
        height: scale(20),
    },
    titleContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: moderateScale(20),
        fontFamily: 'Rubik-Bold',
        color: '#234F68',
        textAlign: 'center',
    },
    bellIcon: {
        width: scale(24),
        height: scale(24),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    flatListContent: {
        paddingBottom: verticalScale(20),
        paddingInline: verticalScale(2),
    },
    columnWrapper: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: GAP,
    },
    card: {
        backgroundColor: '#f4f2f7',
        borderRadius: moderateScale(15),
        padding: moderateScale(10),
        marginBottom: moderateScale(10),
        width: (Dimensions.get('window').width - PADDING_HORIZONTAL * 2 - GAP) / NUM_COLUMNS, // Dynamic width
        alignItems: 'center',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.1,
        // shadowRadius: 4,
        // elevation: 3,
    },
    bankAgentImage: {
        width: scale(80),
        height: scale(80),
        borderRadius: 9999,
        backgroundColor: '#fff',
        resizeMode: 'cover',
    },
    bankAgentName: {
        marginTop: verticalScale(8),
        fontSize: moderateScale(16),
        fontFamily: 'Rubik-Medium',
        color: '#234F68',
        textAlign: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(5),
    },
    ratingText: {
        marginLeft: scale(5),
        fontSize: moderateScale(14),
        fontFamily: 'Rubik-Regular',
        color: '#6B7280',
    },
    salesText: {
        marginLeft: scale(5),
        fontSize: moderateScale(14),
        fontFamily: 'Rubik-Regular',
        color: '#6B7280',
    },
    emptyText: {
        fontSize: moderateScale(16),
        color: '#6B7280',
        textAlign: 'center',
        marginTop: verticalScale(20),
    },
});
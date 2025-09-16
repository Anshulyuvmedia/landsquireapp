import { StyleSheet, Text, View, TouchableOpacity, Image, FlatList, Animated, Dimensions } from 'react-native';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import cities from '@/constants/cities';
import Ionicons from '@expo/vector-icons/Ionicons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import icons from '@/constants/icons';

const PADDING_HORIZONTAL = scale(15);
const GAP = scale(10);
const NUM_COLUMNS = 2;

const AllLocations = () => {
    const params = useLocalSearchParams();
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState(params.city?.toUpperCase() || '');
    const scaleAnims = useRef(
        Object.keys(cities).reduce((acc, city) => {
            acc[city] = new Animated.Value(1);
            return acc;
        }, {})
    ).current;

    const memoizedCity = useMemo(() => params.city?.toUpperCase() || '', [params.city]);

    useEffect(() => {
        if (memoizedCity !== selectedCategory) {
            setSelectedCategory(memoizedCity);
        }
    }, [memoizedCity]);

    const handleCategoryPress = (category) => {
        const updatedParams = { ...params };
        const upperCategory = category.toUpperCase();
        if (selectedCategory === upperCategory) {
            setSelectedCategory('');
            delete updatedParams.city;
        } else {
            setSelectedCategory(upperCategory);
            updatedParams.city = upperCategory;
        }

        Animated.sequence([
            Animated.timing(scaleAnims[category], {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnims[category], {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();

        router.replace({ pathname: '/properties/explore', params: updatedParams });
    };

    const renderItem = ({ item }) => {
        const city = cities[item];
        return (
            <Animated.View style={{ transform: [{ scale: scaleAnims[item] }] }}>
                <TouchableOpacity
                    onPress={() => handleCategoryPress(item)}
                    style={styles.touchableOpacity}
                    activeOpacity={0.8}
                >
                    {city ? (
                        <Image source={city} style={styles.cityImg} />
                    ) : (
                        <Ionicons name="location-outline" size={moderateScale(40)} color="#666" />
                    )}
                    <Text style={styles.text} numberOfLines={1}>
                        {item}
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image source={icons.backArrow} style={styles.backIcon} />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Top Locations</Text>
                    <Text style={styles.subtitle}>Explore the best places to live</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/notifications')}>
                    <Image source={icons.bell} style={styles.bellIcon} />
                </TouchableOpacity>
            </View>
            <FlatList
                data={Object.keys(cities)}
                keyExtractor={(item) => item}
                renderItem={renderItem}
                numColumns={NUM_COLUMNS}
                contentContainerStyle={styles.flatListContent}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
            />
        </View>
    );
};

export default AllLocations;

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
        marginVertical: verticalScale(15),
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
    subtitle: {
        fontSize: moderateScale(14),
        fontFamily: 'Rubik-Regular',
        color: '#6B7280',
        textAlign: 'center',
    },
    bellIcon: {
        width: scale(24),
        height: scale(24),
    },
    flatListContent: {
        paddingBottom: verticalScale(20),
    },
    columnWrapper: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: GAP,
    },
    touchableOpacity: {
        flexDirection: 'column',
        alignItems: 'center',
        padding: moderateScale(10),
        marginBottom: moderateScale(10),
        borderRadius: moderateScale(15),
        backgroundColor: '#f4f2f7',
        width: (Dimensions.get('window').width - PADDING_HORIZONTAL * 2 - GAP) / NUM_COLUMNS,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 1 },
        // shadowOpacity: 0.05,
        // shadowRadius: 2,
        // elevation: 2,
    },
    text: {
        fontSize: moderateScale(14),
        fontFamily: 'Rubik-Regular',
        textTransform: 'capitalize',
        marginTop: verticalScale(8),
        textAlign: 'center',
        color: '#1F2937',
    },
    cityImg: {
        width: scale(60),
        height: scale(60),
        borderRadius: 9999,
        resizeMode: 'cover',
    },
});
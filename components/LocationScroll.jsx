import { StyleSheet, Text, View, TouchableOpacity, Image, FlatList, Animated } from 'react-native';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import cities from '@/constants/cities';
import Ionicons from '@expo/vector-icons/Ionicons';

const LocationScroll = () => {
    const params = useLocalSearchParams();
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState(params.city?.toUpperCase() || '');
    const scaleAnims = useRef(
        Object.keys(cities).reduce((acc, city) => {
            acc[city] = new Animated.Value(1);
            return acc;
        }, {})
    ).current;

    // Memoize params.city to prevent unnecessary updates
    const memoizedCity = useMemo(() => params.city?.toUpperCase() || '', [params.city]);

    // Sync selectedCategory with params.city
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

        // Animation for press feedback
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
        const isSelected = selectedCategory === item.toUpperCase();
        return (
            <Animated.View style={{ transform: [{ scale: scaleAnims[item] }] }}>
                <TouchableOpacity
                    onPress={() => handleCategoryPress(item)}
                    style={[
                        styles.touchableOpacity,
                        isSelected ? styles.selectedCategory : styles.unselectedCategory,
                    ]}
                    accessibilityLabel={`Select ${item} city`}
                    activeOpacity={0.8}
                >
                    {city ? (
                        <Image source={city} style={styles.cityImg} />
                    ) : (
                        <Ionicons name="image-outline" size={24} color="#666" style={styles.cityImg} />
                    )}
                    <Text
                        style={[
                            styles.text,
                            isSelected ? styles.selectedText : styles.unselectedText,
                        ]}
                        numberOfLines={1}
                    >
                        {item}
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <FlatList
            data={Object.keys(cities)}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.flatListContainer}
            renderItem={renderItem}
        />
    );
};

export default LocationScroll;

const styles = StyleSheet.create({
    flatListContainer: {
        // paddingHorizontal: 15, // Match Explore padding
        paddingVertical: 12,
        gap: 12,
    },
    touchableOpacity: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 100,
        backgroundColor: '#F4F2F7',
    },
    selectedCategory: {
        backgroundColor: '#234F68',
        borderColor: '#234F68',
        shadowOpacity: 0.2,
    },
    unselectedCategory: {
        backgroundColor: '#F4F2F7',
    },
    text: {
        fontSize: 14,
        fontFamily: 'Rubik-Regular',
        textTransform: 'capitalize',
        maxWidth: 100,
    },
    selectedText: {
        color: '#FFFFFF',
        fontFamily: 'Rubik-Medium',
    },
    unselectedText: {
        color: '#1F2937',
        fontFamily: 'Rubik-Regular',
    },
    cityImg: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
        marginRight: 8,
        borderRadius: 4,
    },
});
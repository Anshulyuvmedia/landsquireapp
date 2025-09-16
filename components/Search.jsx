import { View, TouchableOpacity, ScrollView, TextInput, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router, usePathname } from "expo-router";
import React, { useState, useRef, useEffect, useMemo } from "react";
import RBSheet from "react-native-raw-bottom-sheet";
import RNPickerSelect from "react-native-picker-select";
import axios from "axios";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from 'react-i18next';

const Search = () => {
    const { t, i18n } = useTranslation();
    const path = usePathname();
    const params = useLocalSearchParams();
    const refRBSheet = useRef(null);

    const [categoryData, setCategoryData] = useState([]);
    const [cityData, setCityData] = useState([]);
    const [selectedCity, setSelectedCity] = useState(params.city || null);
    const [selectedPropertyTypes, setSelectedPropertyTypes] = useState(
        params.propertyType ? params.propertyType.split(",") : []
    );
    const [selectedPropertyFor, setSelectedPropertyFor] = useState(params.propertyFor || null);
    const [minPrice, setMinPrice] = useState(params.minPrice || "");
    const [maxPrice, setMaxPrice] = useState(params.maxPrice || "");
    const [sqftfrom, setsqftfrom] = useState(params.sqftfrom || "");
    const [sqftto, setsqftto] = useState(params.sqftto || "");
    const [loading, setLoading] = useState(false);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`https://landsquire.in/api/get-categories`);
            if (response.data?.categories) {
                setCategoryData(response.data.categories);
            } else {
                console.error("Unexpected API response format:", response.data);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCityListing = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`https://landsquire.in/api/listingscitywise`);
            if (response.data?.data) {
                setCityData(response.data.data);
            } else {
                console.error("Unexpected API response format:", response.data);
            }
        } catch (error) {
            console.error("Error fetching cities:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
        fetchCityListing();
    }, []);

    const memoizedParams = useMemo(
        () => ({
            city: params.city || null,
            propertyType: params.propertyType ? params.propertyType.split(",") : [],
            propertyFor: params.propertyFor || null,
            minPrice: params.minPrice || "",
            maxPrice: params.maxPrice || "",
            sqftfrom: params.sqftfrom || "",
            sqftto: params.sqftto || "",
        }),
        [params.city, params.propertyType, params.propertyFor, params.minPrice, params.maxPrice, params.sqftfrom, params.sqftto]
    );

    useEffect(() => {
        if (memoizedParams.city !== selectedCity) {
            setSelectedCity(memoizedParams.city);
        }
        if (
            JSON.stringify(memoizedParams.propertyType) !== JSON.stringify(selectedPropertyTypes)
        ) {
            setSelectedPropertyTypes(memoizedParams.propertyType);
        }
        if (memoizedParams.propertyFor !== selectedPropertyFor) {
            setSelectedPropertyFor(memoizedParams.propertyFor);
        }
        if (memoizedParams.minPrice !== minPrice) {
            setMinPrice(memoizedParams.minPrice);
        }
        if (memoizedParams.maxPrice !== maxPrice) {
            setMaxPrice(memoizedParams.maxPrice);
        }
        if (memoizedParams.sqftfrom !== sqftfrom) {
            setsqftfrom(memoizedParams.sqftfrom);
        }
        if (memoizedParams.sqftto !== sqftto) {
            setsqftto(memoizedParams.sqftto);
        }
    }, [memoizedParams]);

    const handlePropertyTypeToggle = (propertyType) => {
        if (selectedPropertyTypes.includes(propertyType)) {
            setSelectedPropertyTypes(selectedPropertyTypes.filter((type) => type !== propertyType));
        } else {
            setSelectedPropertyTypes([...selectedPropertyTypes, propertyType]);
        }
    };

    const handlePropertyForToggle = (propertyFor) => {
        setSelectedPropertyFor(propertyFor === selectedPropertyFor ? null : propertyFor);
    };

    const handleSubmit = async () => {
        setLoading(true);
        const filterParams = {
            city: selectedCity || undefined,
            propertyType: selectedPropertyTypes.length > 0 ? selectedPropertyTypes.join(",") : undefined,
            propertyFor: selectedPropertyFor || undefined,
            minPrice: minPrice || undefined,
            maxPrice: maxPrice || undefined,
            sqftfrom: sqftfrom || undefined,
            sqftto: sqftto || undefined,
        };

        const cleanFilters = Object.fromEntries(
            Object.entries(filterParams).filter(([_, v]) => v !== undefined)
        );

        router.replace({
            pathname: "/properties/explore",
            params: cleanFilters,
        });

        refRBSheet.current?.close();
        setLoading(false);
    };

    const handleReset = () => {
        setSelectedCity(null);
        setSelectedPropertyTypes([]);
        setSelectedPropertyFor(null);
        setMinPrice("");
        setMaxPrice("");
        setsqftfrom("");
        setsqftto("");
        router.replace({
            pathname: "/properties/explore",
            params: {},
        });
    };

    return (
        <View className="flex-1 bg-white">
            <TouchableOpacity onPress={() => refRBSheet.current?.open()}>
                <View className="flex-row items-center justify-between w-full rounded-xl bg-[#f4f2f7] border border-primary-100 py-4 px-4">
                    <View className="flex-row items-center flex-1">
                        <Ionicons name="search-outline" size={20} color="#1F2937" />
                        <TextInput
                            value={selectedCity || ""}
                            editable={false}
                            placeholder={t('searchPlaceholder')}
                            placeholderTextColor="#999"
                            className={`text-sm ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-black-200 ml-2 flex-1`}
                        />
                    </View>
                    <Ionicons
                        name="filter-outline"
                        size={20}
                        color="#1F2937"
                        style={{ paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: "#D1D5DB" }}
                    />
                </View>
            </TouchableOpacity>

            <RBSheet
                ref={refRBSheet}
                closeOnDragDown={true}
                closeOnPressMask={true}
                height={600}
                customStyles={{
                    wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
                    container: { borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 20, backgroundColor: "white" },
                    draggableIcon: { backgroundColor: "#000", width: 40, height: 5, marginVertical: 10 },
                }}
            >
                <View className="flex-row justify-between items-center mb-3">
                    <Text className={`text-xl ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-bold' : 'font-rubik-bold'} text-black-300`}>
                        {t('filter')}
                    </Text>
                    <TouchableOpacity
                        onPress={handleReset}
                        className="px-5 py-2 rounded-xl bg-white border border-gray-300 mr-3"
                    >
                        <Text className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} text-black-300 text-center`}>
                            {t('reset')}
                        </Text>
                    </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} text-black-300 mb-2`}>
                        {t('city')}
                    </Text>
                    <View className="flex-row items-center bg-[#f4f2f7] rounded-xl px-4 py-3">
                        <Ionicons name="location-outline" size={20} color="#1F2937" style={{ marginRight: 8 }} />
                        <RNPickerSelect
                            onValueChange={(value) => setSelectedCity(value)}
                            items={cityData.map((city, index) => ({
                                label: city.label || city.name || t('unknown'),
                                value: city.label || city.name || "",
                                key: city.id || `city-${index}`,
                            }))}
                            value={selectedCity}
                            placeholder={{ label: t('chooseCity'), value: null }}
                            style={pickerSelectStyles(i18n.language)}
                            useNativeAndroidPickerStyle={false}
                        />
                    </View>

                    <Text className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} text-black-300 mt-5 mb-2`}>
                        Filter property by
                    </Text>
                    <View className="flex-row">
                        {["Sell", "Rent"].map((option) => {
                            const isSelected = selectedPropertyFor === option;
                            return (
                                <TouchableOpacity
                                    key={option}
                                    onPress={() => handlePropertyForToggle(option)}
                                    className={`me-2 px-5 py-4 rounded-xl ${isSelected
                                        ? "bg-[#8bc83f] border-[#8bc83f]"
                                        : "bg-[#f4f2f7] border-[#D1D5DB]"
                                        }`}
                                >
                                    <Text
                                        className={`text-sm ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} ${isSelected ? "text-white" : "text-[#1F2937]"
                                            }`}
                                    >
                                        For {option}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} text-black-300 mt-5 mb-2`}>
                        {t('priceRange')}
                    </Text>
                    <View className="flex-row items-center justify-between">
                        <TextInput
                            placeholder={t('min')}
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={minPrice}
                            onChangeText={setMinPrice}
                            className={`rounded-xl p-4 flex-1 bg-[#f4f2f7] text-sm ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-black-200`}
                            style={{ marginRight: 8 }}
                        />
                        <Text className="text-black-200">-</Text>
                        <TextInput
                            placeholder={t('max')}
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={maxPrice}
                            onChangeText={setMaxPrice}
                            className={`rounded-xl p-4 flex-1 bg-[#f4f2f7] text-sm ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-black-200`}
                            style={{ marginLeft: 8 }}
                        />
                    </View>

                    <Text className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} text-black-300 mt-5 mb-2`}>
                        {t('squareFeet')}
                    </Text>
                    <View className="flex-row items-center justify-between">
                        <TextInput
                            placeholder={t('min')}
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={sqftfrom}
                            onChangeText={setsqftfrom}
                            className={`rounded-xl p-4 flex-1 bg-[#f4f2f7] text-sm ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-black-200`}
                            style={{ marginRight: 8 }}
                        />
                        <Text className="text-black-200">-</Text>
                        <TextInput
                            placeholder={t('max')}
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={sqftto}
                            onChangeText={setsqftto}
                            className={`rounded-xl p-4 flex-1 bg-[#f4f2f7] text-sm ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik'} text-black-200`}
                            style={{ marginLeft: 8 }}
                        />
                    </View>

                    <Text className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} text-black-300 mt-5 mb-2`}>
                        {t('propertyType')}
                    </Text>
                    <ScrollView
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        contentContainerClassName="flex-row"
                    >
                        {categoryData.map((cat, index) => {
                            const label = cat.label || cat.name || t('unknown');
                            const isSelected = selectedPropertyTypes.includes(label);
                            return (
                                <TouchableOpacity
                                    key={cat.id || `category-${index}`}
                                    onPress={() => handlePropertyTypeToggle(label)}
                                    className={`me-2 px-5 py-4 rounded-xl ${isSelected
                                        ? "bg-[#8bc83f] border-[#8bc83f]"
                                        : "bg-[#f4f2f7] border-[#D1D5DB]"
                                        }`}
                                >
                                    <Text
                                        className={`text-sm ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} ${isSelected ? "text-white" : "text-[#1F2937]"
                                            }`}
                                    >
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </ScrollView>

                <View className="flex-row justify-between mt-6">
                    <TouchableOpacity
                        onPress={handleSubmit}
                        className="flex-1 p-4 rounded-xl bg-primary-300"
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} text-white text-center`}>
                                {t('applyFilter')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </RBSheet>
        </View>
    );
};

export default Search;

const styles = StyleSheet.create({
    pickerContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f4f2f7",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginTop: 8,
    },
    icon: {
        marginRight: 8,
    },
});

const pickerSelectStyles = (language) => ({
    inputIOS: {
        fontSize: 14,
        color: "#1F2937",
        paddingVertical: 12,
        paddingHorizontal: 10,
        fontFamily: language === 'hi' ? "NotoSerifDevanagari-Regular" : "Rubik-Regular",
    },
    inputAndroid: {
        fontSize: 14,
        color: "#1F2937",
        paddingVertical: 12,
        paddingHorizontal: 10,
        fontFamily: language === 'hi' ? "NotoSerifDevanagari-Regular" : "Rubik-Regular",
    },
    placeholder: {
        color: "#999",
        fontSize: 14,
    },
});
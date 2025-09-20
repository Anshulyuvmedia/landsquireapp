import { View, TouchableOpacity, ScrollView, TextInput, Text, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { useLocalSearchParams, router, usePathname } from "expo-router";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import RBSheet from "react-native-raw-bottom-sheet";
import RNPickerSelect from "react-native-picker-select";
import axios from "axios";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Search = () => {
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
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
    const [initialLoad, setInitialLoad] = useState(true);

    const fetchCategories = useCallback(async () => {
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
    }, []);

    const fetchCityListing = useCallback(async () => {
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
    }, []);

    useEffect(() => {
        fetchCategories();
        fetchCityListing();
        setInitialLoad(false);
    }, [fetchCategories, fetchCityListing]);

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
        if (!initialLoad) {
            if (memoizedParams.city !== selectedCity) {
                setSelectedCity(memoizedParams.city);
            }
            if (JSON.stringify(memoizedParams.propertyType) !== JSON.stringify(selectedPropertyTypes)) {
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
        }
    }, [memoizedParams, initialLoad]);

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
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => refRBSheet.current?.open()} style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Ionicons name="search-outline" size={20} color="#1F2937" />
                    <TextInput
                        value={selectedCity || ""}
                        editable={false}
                        placeholder={t('searchPlaceholder')}
                        placeholderTextColor="#999"
                        style={styles.searchInput}
                    />
                </View>
                <Ionicons
                    name="filter-outline"
                    size={20}
                    color="#1F2937"
                    style={styles.filterIcon}
                />
            </TouchableOpacity>

            <RBSheet
                ref={refRBSheet}
                closeOnDragDown={true}
                closeOnPressMask={true}
                height={Dimensions.get('window').height * 0.9} // Use a percentage of screen height
                customStyles={{
                    wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
                    container: { borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 20, backgroundColor: "white" },
                    draggableIcon: { backgroundColor: "#000", width: 40, height: 5, marginVertical: 10 },
                }}
            >
                <View style={styles.header}>
                    <Text style={styles.headerText}>{t('filter')}</Text>
                    <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                        <Text style={styles.resetText}>{t('reset')}</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
                    <Text style={styles.label}>{t('city')}</Text>
                    <View style={styles.pickerContainer}>
                        <Ionicons name="location-outline" size={20} color="#1F2937" style={styles.icon} />
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

                    <Text style={styles.label}>{t('filter_property_by')}</Text>
                    <View style={styles.propertyForContainer}>
                        {["Sell", "Rent"].map((option) => {
                            const isSelected = selectedPropertyFor === option;
                            return (
                                <TouchableOpacity
                                    key={option}
                                    onPress={() => handlePropertyForToggle(option)}
                                    style={[styles.propertyForButton, isSelected && styles.selectedPropertyForButton]}
                                >
                                    <Text style={[styles.propertyForText, isSelected && styles.selectedPropertyForText]}>
                                        For {option}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={styles.label}>{t('priceRange')}</Text>
                    <View style={styles.rangeContainer}>
                        <TextInput
                            placeholder={t('min')}
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={minPrice}
                            onChangeText={setMinPrice}
                            style={styles.input}
                        />
                        <Text style={styles.rangeSeparator}>-</Text>
                        <TextInput
                            placeholder={t('max')}
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={maxPrice}
                            onChangeText={setMaxPrice}
                            style={styles.input}
                        />
                    </View>

                    <Text style={styles.label}>{t('squareFeet')}</Text>
                    <View style={styles.rangeContainer}>
                        <TextInput
                            placeholder={t('min')}
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={sqftfrom}
                            onChangeText={setsqftfrom}
                            style={styles.input}
                        />
                        <Text style={styles.rangeSeparator}>-</Text>
                        <TextInput
                            placeholder={t('max')}
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={sqftto}
                            onChangeText={setsqftto}
                            style={styles.input}
                        />
                    </View>

                    <Text style={styles.label}>{t('propertyType')}</Text>
                    <ScrollView
                        horizontal={true}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.propertyTypeContainer}
                    >
                        {categoryData.map((cat, index) => {
                            const label = cat.label || cat.name || t('unknown');
                            const isSelected = selectedPropertyTypes.includes(label);
                            return (
                                <TouchableOpacity
                                    key={cat.id || `category-${index}`}
                                    onPress={() => handlePropertyTypeToggle(label)}
                                    style={[styles.propertyTypeButton, isSelected && styles.selectedPropertyTypeButton]}
                                >
                                    <Text style={[styles.propertyTypeText, isSelected && styles.selectedPropertyTypeText]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </ScrollView>

                <View style={[styles.submitContainer, { marginBottom: insets.bottom, }]}>
                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={styles.submitButton}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.submitText}>{t('applyFilter')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </RBSheet>
        </View>
    );
};

export default Search;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        backgroundColor: "#f4f2f7",
        borderRadius: 12,
        // borderWidth: 1,
        // borderColor: "#D1D5DB",
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    searchInput: {
        fontSize: 14,
        color: "#1F2937",
        paddingVertical: 0,
        paddingHorizontal: 8,
        fontFamily: "Rubik-Regular",
        flex: 1,
    },
    filterIcon: {
        paddingLeft: 8,
        borderLeftWidth: 1,
        borderLeftColor: "#D1D5DB",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    headerText: {
        fontSize: 20,
        color: "#1F2937",
        fontFamily: "Rubik-Bold",
    },
    resetButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#D1D5DB",
    },
    resetText: {
        fontSize: 16,
        color: "#1F2937",
        fontFamily: "Rubik-Medium",
        textAlign: "center",
    },
    scrollView: {
        flex: 1,
    },
    label: {
        fontSize: 16,
        color: "#1F2937",
        marginBlock: 4,
        fontFamily: "Rubik-Medium",
    },
    pickerContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f4f2f7",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginBottom: 8,
    },
    icon: {
        marginRight: 8,
    },
    propertyForContainer: {
        flexDirection: "row",
        marginBottom: 16,
    },
    propertyForButton: {
        marginRight: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        // borderWidth: 1,
        // borderColor: "#D1D5DB",
        backgroundColor: "#f4f2f7",
    },
    selectedPropertyForButton: {
        backgroundColor: "#8bc83f",
        borderColor: "#8bc83f",
    },
    propertyForText: {
        fontSize: 14,
        color: "#1F2937",
        fontFamily: "Rubik-Medium",
    },
    selectedPropertyForText: {
        color: "white",
    },
    rangeContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    input: {
        flex: 1,
        backgroundColor: "#f4f2f7",
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: "#1F2937",
        fontFamily: "Rubik-Regular",
        marginHorizontal: 4,
    },
    rangeSeparator: {
        fontSize: 16,
        color: "#1F2937",
        marginHorizontal: 8,
    },
    propertyTypeContainer: {
        flexDirection: "row",
        paddingVertical: 8,
    },
    propertyTypeButton: {
        marginRight: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        // borderWidth: 1,
        // borderColor: "#D1D5DB",
        backgroundColor: "#f4f2f7",
    },
    selectedPropertyTypeButton: {
        backgroundColor: "#8bc83f",
        borderColor: "#8bc83f",
    },
    propertyTypeText: {
        fontSize: 14,
        color: "#1F2937",
        fontFamily: "Rubik-Medium",
    },
    selectedPropertyTypeText: {
        color: "white",
    },
    submitContainer: {
        marginTop: 24,
    },
    submitButton: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#8bc83f",
        alignItems: "center",
    },
    submitText: {
        fontSize: 16,
        color: "white",
        fontFamily: "Rubik-Medium",
    },
});

const pickerSelectStyles = (language) => ({
    inputIOS: {
        fontSize: 14,
        color: "#1F2937",
        paddingVertical: 12,
        paddingHorizontal: 10,
        fontFamily: language === 'hi' ? "NotoSerifDevanagari-Regular" : "Rubik-Regular",
        flex: 1,
    },
    inputAndroid: {
        fontSize: 14,
        color: "#1F2937",
        paddingVertical: 8,
        paddingHorizontal: 10,
        fontFamily: language === 'hi' ? "NotoSerifDevanagari-Regular" : "Rubik-Regular",
        flex: 1,
    },
    placeholder: {
        color: "#999",
        fontSize: 14,
    },
});
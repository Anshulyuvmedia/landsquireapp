// components/map/FilterBottomSheet.jsx
import React from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RBSheet from 'react-native-raw-bottom-sheet';
import { useTranslation } from 'react-i18next';

const subcategoryOptions = {
    Agriculture: [{ label: 'Plot', value: 'Plot' }, { label: 'House', value: 'House' }],
    Approved: [
        { label: 'Plot', value: 'Plot' },
        { label: 'House', value: 'House' },
        { label: 'Apartment', value: 'Apartment' },
    ],
    Commercial: [
        { label: 'Plot', value: 'Plot' },
        { label: 'Land', value: 'Land' },
        { label: 'Shop', value: 'Shop' },
        { label: 'Office', value: 'Office' },
        { label: 'Other', value: 'Other' },
    ],
};

const FilterBottomSheet = ({
    sheetRef,
    searchQuery = '',
    showSuggestions = false,
    citySuggestions = [],
    displayMode,
    setDisplayMode,
    propertyMode = 'sell',
    setPropertyMode,
    minPrice = '',
    setMinPrice,
    maxPrice = '',
    setMaxPrice,
    sqftFrom = '',
    setSqftFrom,
    sqftTo = '',
    setSqftTo,
    categoryData = [],
    selectedCategory = null,
    setSelectedCategory,
    selectedSubCategory = null,
    setSelectedSubCategory,
    mapType = 'hybrid',
    toggleMapType,
    loading = false,
    handleSearch,
    handleSuggestionPress,
    handleSubmit,
    handleReset,
}) => {
    const { t } = useTranslation();

    return (
        <RBSheet
            ref={sheetRef}
            closeOnDragDown
            closeOnPressMask
            height={Dimensions.get('window').height * 0.85}
            customStyles={{
                wrapper: { backgroundColor: 'rgba(0,0,0,0.5)' },
                container: {
                    borderTopLeftRadius: 35,
                    borderTopRightRadius: 35,
                    padding: 20,
                    backgroundColor: 'white',
                },
                draggableIcon: { backgroundColor: '#000', width: 40, height: 5 },
            }}
        >
            <View style={styles.header}>
                <Text style={styles.headerText}>{t('filter')}</Text>
                <TouchableOpacity onPress={handleReset}>
                    <Text style={styles.resetText}>{t('reset')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* City Search */}
                <Text style={styles.label}>{t('city')}</Text>
                <View style={styles.pickerContainer}>
                    <Ionicons name="location-outline" size={20} color="#1F2937" style={styles.icon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by city..."
                        placeholderTextColor="#888"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>

                {showSuggestions && citySuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                        <Text style={styles.suggestionsTitle}>Cities</Text>
                        {citySuggestions.map((suggestion, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.suggestionItem}
                                onPress={() => handleSuggestionPress(suggestion)}
                            >
                                <Text style={styles.suggestionText}>{suggestion.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Display Mode */}
                <Text style={styles.label}>Display Mode</Text>
                <View style={styles.propertyForContainer}>
                    {['Both', 'Properties', 'Projects'].map((option) => {
                        const mode = option.toLowerCase();
                        const isSelected = displayMode === mode;
                        return (
                            <TouchableOpacity
                                key={option}
                                onPress={() => setDisplayMode(mode)}
                                style={[styles.propertyForButton, isSelected && styles.selectedPropertyForButton]}
                            >
                                <Text style={[styles.propertyForText, isSelected && styles.selectedPropertyForText]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>



                {/* Only show property-specific filters when in properties mode */}
                {displayMode === 'properties' && (
                    <>
                        <Text style={styles.label}>Property For</Text>
                        <View style={styles.propertyForContainer}>
                            {['Sell', 'Rent'].map((option) => {
                                const mode = option.toLowerCase();
                                const isSelected = propertyMode === mode;
                                return (
                                    <TouchableOpacity
                                        key={option}
                                        onPress={() => setPropertyMode(mode)}
                                        style={[styles.propertyForButton, isSelected && styles.selectedPropertyForButton]}
                                    >
                                        <Text style={[styles.propertyForText, isSelected && styles.selectedPropertyForText]}>
                                            For {option}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Price Range */}
                        <Text style={styles.label}>Price Range</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Min Price (₹)"
                                placeholderTextColor="#888"
                                value={minPrice}
                                onChangeText={(text) => setMinPrice(text.replace(/[^0-9]/g, ''))}
                                keyboardType="numeric"
                            />
                            <Text style={styles.inputSeparator}>to</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Max Price (₹)"
                                placeholderTextColor="#888"
                                value={maxPrice}
                                onChangeText={(text) => setMaxPrice(text.replace(/[^0-9]/g, ''))}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Area Range */}
                        <Text style={styles.label}>Area Range (sqft)</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Min Area"
                                placeholderTextColor="#888"
                                value={sqftFrom}
                                onChangeText={(text) => setSqftFrom(text.replace(/[^0-9]/g, ''))}
                                keyboardType="numeric"
                            />
                            <Text style={styles.inputSeparator}>to</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Max Area"
                                placeholderTextColor="#888"
                                value={sqftTo}
                                onChangeText={(text) => setSqftTo(text.replace(/[^0-9]/g, ''))}
                                keyboardType="numeric"
                            />
                        </View>

                        {/* Property Type */}
                        <Text style={styles.label}>Property Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyTypeContainer}>
                            {Array.isArray(categoryData) && categoryData.length > 0 ? (
                                categoryData.map((cat) => {
                                    const label = cat.label || cat.name || 'Unknown';
                                    const isSelected = selectedCategory === label;
                                    return (
                                        <TouchableOpacity
                                            key={cat.id || label}
                                            onPress={() => setSelectedCategory(isSelected ? null : label)}
                                            style={[styles.propertyTypeButton, isSelected && styles.selectedPropertyTypeButton]}
                                        >
                                            <Text style={[styles.propertyTypeText, isSelected && styles.selectedPropertyTypeText]}>
                                                {label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })
                            ) : (
                                <Text style={styles.noDataText}>Loading categories...</Text>
                            )}
                        </ScrollView>

                        {/* Subcategory */}
                        {selectedCategory && subcategoryOptions[selectedCategory] && (
                            <>
                                <Text style={styles.label}>Subcategory</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyTypeContainer}>
                                    {subcategoryOptions[selectedCategory].map((sub) => (
                                        <TouchableOpacity
                                            key={sub.value}
                                            onPress={() => setSelectedSubCategory(sub.value)}
                                            style={[
                                                styles.propertyTypeButton,
                                                selectedSubCategory === sub.value && styles.selectedPropertyTypeButton,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.propertyTypeText,
                                                    selectedSubCategory === sub.value && styles.selectedPropertyTypeText,
                                                ]}
                                            >
                                                {sub.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}
                    </>
                )}

                {/* Map Type */}
                <Text style={styles.label}>Map Type</Text>
                <View style={styles.propertyForContainer}>
                    <TouchableOpacity onPress={toggleMapType} style={styles.mapTypeFilterButton}>
                        <Text style={styles.mapTypeFilterText}>
                            {mapType.charAt(0).toUpperCase() + mapType.slice(1)}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Apply Button */}
            <View style={styles.submitContainer}>
                <TouchableOpacity onPress={handleSubmit} style={styles.submitButton} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitText}>Apply Filters</Text>
                    )}
                </TouchableOpacity>
            </View>
        </RBSheet>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    resetText: {
        fontSize: 16,
        color: '#234F68',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginVertical: 10,
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        paddingHorizontal: 10,
        marginBottom: 20,
    },
    icon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        paddingVertical: 12,
    },
    suggestionsContainer: {
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
    },
    suggestionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    suggestionItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    suggestionText: {
        fontSize: 16,
        color: '#333',
    },
    propertyForContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    propertyForButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        alignItems: 'center',
        marginHorizontal: 5,
    },
    selectedPropertyForButton: {
        backgroundColor: '#234F68',
        borderColor: '#234F68',
    },
    propertyForText: {
        fontSize: 16,
        color: '#333',
    },
    selectedPropertyForText: {
        color: '#fff',
    },
    mapTypeFilterButton: {
        flex: 1,
        backgroundColor: '#234F68',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    mapTypeFilterText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    input: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        marginHorizontal: 5,
    },
    inputSeparator: {
        fontSize: 16,
        color: '#333',
    },
    propertyTypeContainer: {
        paddingVertical: 10,
    },
    propertyTypeButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        marginRight: 10,
    },
    selectedPropertyTypeButton: {
        backgroundColor: '#234F68',
        borderColor: '#234F68',
    },
    propertyTypeText: {
        fontSize: 14,
        color: '#333',
    },
    selectedPropertyTypeText: {
        color: '#fff',
    },
    noDataText: {
        fontSize: 14,
        color: '#888',
        paddingVertical: 10,
    },
    submitContainer: {
        marginTop: 20,
        marginBottom: 30,
    },
    submitButton: {
        backgroundColor: '#234F68',
        borderRadius: 30,
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default FilterBottomSheet;
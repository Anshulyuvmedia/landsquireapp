// app/(root)/(tabs)/mapview.jsx
import React from 'react';
import { Pressable, View, Text, ActivityIndicator, StyleSheet } from 'react-native';

import MapContainer from '@/components/map/MapContainer';
import FilterBottomSheet from '@/components/map/FilterBottomSheet';
import PropertyDetailSheet from '@/components/map/PropertyDetailSheet';
import MapOverlays from '@/components/map/MapOverlays';
import { useMapData } from '@/components/map/hooks/useMapData';

const MapView = () => {
    const mapData = useMapData();

    const {
        // Refs
        mapRef,
        filterSheetRef,
        propertySheetRef,

        // Core state
        loading,
        error,
        region,
        mapType,
        visibleItems,
        filteredData,
        currentLocationName,
        propertyMode,
        selectedItem,

        // Actions
        getCurrentLocation,
        handleMarkerPress,
        handleRegionChange,
        setPropertyMode,
        viewItem,

        // === ALL VALUES NEEDED FOR FILTER SHEET ===
        searchQuery,
        showSuggestions,
        citySuggestions,
        displayMode,
        setDisplayMode,
        minPrice,
        setMinPrice,
        maxPrice,
        setMaxPrice,
        sqftFrom,
        setSqftFrom,
        sqftTo,
        setSqftTo,
        categoryData,
        selectedCategory,
        setSelectedCategory,
        selectedSubCategory,
        setSelectedSubCategory,
        toggleMapType,
        handleSearch,
        handleSuggestionPress,
        handleSubmit,
        handleReset,
        applyPropertyModeImmediately,
    } = mapData;

    return (
        <Pressable style={styles.container}>
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>Loading data...</Text>
                </View>
            )}

            <MapContainer
                mapRef={mapRef}
                region={region}
                mapType={mapType}
                visibleItems={visibleItems}
                onMarkerPress={handleMarkerPress}
                onRegionChangeComplete={handleRegionChange}
            />

            <MapOverlays
                currentLocationName={currentLocationName}
                filteredDataLength={filteredData.length}
                propertyMode={propertyMode}
                onNearbyPress={getCurrentLocation}
                onFilterOpen={() => filterSheetRef.current?.open()}
                onPropertyModeChange={applyPropertyModeImmediately}
                
            />

            {(error || (visibleItems.length === 0 && filteredData.length === 0 && !loading)) && (
                <View style={styles.errorContainer}>
                    <View style={styles.noResultsContainer}>
                        <Text style={styles.noResultsText}>
                            {error || 'No real estate found in this area'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Pass ALL required props explicitly */}
            <FilterBottomSheet
                sheetRef={filterSheetRef}
                searchQuery={searchQuery}
                showSuggestions={showSuggestions}
                citySuggestions={citySuggestions}
                displayMode={displayMode}
                setDisplayMode={setDisplayMode}
                propertyMode={propertyMode}
                setPropertyMode={setPropertyMode}
                minPrice={minPrice}
                setMinPrice={setMinPrice}
                maxPrice={maxPrice}
                setMaxPrice={setMaxPrice}
                sqftFrom={sqftFrom}
                setSqftFrom={setSqftFrom}
                sqftTo={sqftTo}
                setSqftTo={setSqftTo}
                categoryData={categoryData}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedSubCategory={selectedSubCategory}
                setSelectedSubCategory={setSelectedSubCategory}
                mapType={mapType}
                toggleMapType={toggleMapType}
                loading={loading}
                handleSearch={handleSearch}
                handleSuggestionPress={handleSuggestionPress}
                handleSubmit={handleSubmit}
                handleReset={handleReset}
            />

            <PropertyDetailSheet
                sheetRef={propertySheetRef}
                selectedItem={selectedItem}
                viewItem={viewItem}
            />
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#fff',
    },
    errorContainer: {
        position: 'absolute',
        bottom: 170,
        left: 20,
        right: 20,
        zIndex: 5,
        alignItems: 'center',
    },
    noResultsContainer: {
        backgroundColor: '#234F68',
        borderRadius: 25,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    noResultsText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
});

export default MapView;
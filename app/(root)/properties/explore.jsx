import { StyleSheet, TouchableOpacity, View, Text, Image, FlatList, Dimensions, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import axios from 'axios';
import icons from '@/constants/icons';
import Search from '@/components/Search';
import Filters from '@/components/Filters';
import { Card } from '@/components/Cards';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

// Get screen width for dynamic card sizing
const PADDING_HORIZONTAL = scale(15);
const GAP = scale(10);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Explore = () => {
  const { t, i18n } = useTranslation();
  const [listingData, setListingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCity, setSelectedCity] = useState('all');
  const [cities, setCities] = useState(['all']);
  const params = useLocalSearchParams();

  // Memoize params with deep comparison
  const memoizedParams = useMemo(() => JSON.stringify(params), [JSON.stringify(params)]);

  // Derive filtered data instead of storing in state
  const filteredListingData = useMemo(() => {
    if (selectedCity === 'all') {
      return listingData;
    }
    return listingData.filter(item => item.city === selectedCity);
  }, [selectedCity, listingData]);

  const handleCardPress = (id) => router.push(`/properties/${id}`);

  const fetchFilterData = async () => {
    setLoading(true);
    setListingData([]); // Clear data to prevent stale renders
    try {
      const queryParams = new URLSearchParams();
      const parsedParams = JSON.parse(memoizedParams);

      // Combine all filters into query parameters
      if (parsedParams.propertyType && parsedParams.propertyType !== t('all')) {
        queryParams.append('filtercategory', parsedParams.propertyType);
      }
      if (parsedParams.city && parsedParams.city !== t('all')) {
        queryParams.append('filtercity', parsedParams.city);
      }
      if (parsedParams.propertyFor) {
        queryParams.append('filterpropertyfor', parsedParams.propertyFor);
      }
      if (parsedParams.minPrice) queryParams.append('filterminprice', parsedParams.minPrice);
      if (parsedParams.maxPrice) queryParams.append('filtermaxprice', parsedParams.maxPrice);
      if (parsedParams.sqftfrom) queryParams.append('sqftfrom', parsedParams.sqftfrom);
      if (parsedParams.sqftto) queryParams.append('sqftto', parsedParams.sqftto);

      const apiUrl = `https://landsquire.in/api/filterlistings?${queryParams.toString()}`;
      const response = await axios({
        method: 'get', // Changed to GET
        url: apiUrl,
      });

      if (response.data && Array.isArray(response.data.data)) {
        const apiData = response.data.data;
        setListingData(apiData);
        const uniqueCities = ['all', ...new Set(apiData.map(item => item.city).filter(city => city && city !== 'Unknown'))];
        setCities(uniqueCities);
      } else {
        console.error('Unexpected API response format:', response.data);
        setListingData([]);
        setCities(['all']);
      }
    } catch (error) {
      console.error('Error fetching filtered listings:', error.response?.data || error.message);
      setListingData([]);
      setCities(['all']);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFilterData();
  }, [memoizedParams]);

  const onRefresh = () => {
    setRefreshing(true);
    setSelectedCity('all');
    if (Object.keys(params).length > 0) {
      router.replace({ pathname: '/properties/explore', params: {} });
    }
  };

  const clearFilter = (filterKey) => {
    const updatedParams = { ...JSON.parse(memoizedParams) };
    const keyMap = {
      city: 'city',
      type: 'propertyType',
      'property for': 'propertyFor', // Updated to handle space
      price: ['minPrice', 'maxPrice'],
      size: ['sqftfrom', 'sqftto'],
    };

    // Normalize filterKey by removing spaces and converting to lowercase
    const normalizedFilterKey = filterKey.replace(/\s+/g, '').toLowerCase();
    const mappedKey = Object.keys(keyMap).find(
      (key) => key.replace(/\s+/g, '').toLowerCase() === normalizedFilterKey
    );

    if (mappedKey) {
      if (Array.isArray(keyMap[mappedKey])) {
        keyMap[mappedKey].forEach((key) => delete updatedParams[key]);
      } else {
        delete updatedParams[keyMap[mappedKey]];
      }
    }

    if (JSON.stringify(updatedParams) !== JSON.stringify(params)) {
      router.replace({ pathname: '/properties/explore', params: updatedParams });
    }
  };

  const renderFilterChips = () => {
    const filters = [];
    const parsedParams = JSON.parse(memoizedParams);
    if (parsedParams.city) filters.push(`City: ${parsedParams.city}`);
    if (parsedParams.propertyType) filters.push(`Type: ${parsedParams.propertyType}`);
    if (parsedParams.propertyFor) filters.push(`Property For: ${t(parsedParams.propertyFor)}`);
    if (parsedParams.minPrice || parsedParams.maxPrice) {
      filters.push(`Price: ${parsedParams.minPrice || t('any')} - ${parsedParams.maxPrice || t('any')}`);
    }
    if (parsedParams.sqftfrom || parsedParams.sqftto) {
      filters.push(`Size: ${parsedParams.sqftfrom || t('any')} - ${parsedParams.sqftto || t('any')} sqft`);
    }

    return filters.length > 0 ? (
      <View className="flex-row justify-between items-center">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterChipsContainer}
        >
          {filters.map((filter, index) => (
            <View key={index} style={styles.filterChip}>
              <Text
                style={[
                  styles.filterChipText,
                  { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' },
                ]}
              >
                {filter}
              </Text>
              <TouchableOpacity
                onPress={() => clearFilter(filter.split(':')[0].toLowerCase().trim())}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={16} color="#234F68" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {filters.length > 0 && (
          <TouchableOpacity
            onPress={() => router.replace({ pathname: '/properties/explore', params: {} })}
            style={styles.clearAllButton}
          >
            <Text
              style={[
                styles.clearAllText,
                { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' },
              ]}
            >
              {t('clearAll')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    ) : null;
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Image source={icons.noResultFound} style={styles.emptyImage} />
      <Text
        style={[
          styles.emptyTitle,
          { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' },
        ]}
      >
        {t('noResultsTitle')}
      </Text>
      <Text
        style={[
          styles.emptySubtitle,
          { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' },
        ]}
      >
        {t('noResultsMessage1')}
      </Text>
      <Text
        style={[
          styles.emptySubtitle,
          { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' },
        ]}
      >
        {t('noResultsMessage2')}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredListingData}
        renderItem={({ item }) => <Card item={item} onPress={() => handleCardPress(item.id)} />}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.flatListContent}
        columnWrapperStyle={styles.flatListColumnWrapper}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8bc83f']}
            tintColor="#8bc83f"
            accessibilityLabel={t('refreshListings')}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => router.navigate('/')}
                style={styles.backButton}
              >
                <Image source={icons.backArrow} style={styles.backIcon} />
              </TouchableOpacity>
              <Text
                style={[
                  styles.headerTitle,
                  { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' },
                ]}
              >
                {t('searchResults')}
              </Text>
              <TouchableOpacity onPress={() => router.push('/notifications')}>
                <Image source={icons.bell} style={styles.bellIcon} />
              </TouchableOpacity>
            </View>
            <Search />
            {renderFilterChips()}
            <Filters />
            <View style={styles.foundTextContainer}>
              <Text
                style={[
                  styles.foundText,
                  { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' },
                ]}
              >
                Found {filteredListingData.length} Properties
              </Text>
              {loading && <ActivityIndicator size="large" color="#234F68" />}

            </View>
          </View>
        }
        ListEmptyComponent={!loading && !refreshing && filteredListingData.length === 0 ? renderEmptyComponent : null}
      />
    </View>
  );
};

export default Explore;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    // paddingHorizontal: PADDING_HORIZONTAL,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: verticalScale(10),
    marginBottom: verticalScale(10),
  },
  backButton: {
    backgroundColor: '#f4f2f7',
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
  headerTitle: {
    fontSize: moderateScale(20),
    fontFamily: 'Rubik-Bold',
    color: '#234F68',
    textAlign: 'center',
    flex: 1,
  },
  bellIcon: {
    width: scale(24),
    height: scale(24),
  },
  foundTextContainer: {
    marginTop: verticalScale(20),
  },
  foundText: {
    fontSize: moderateScale(16),
    fontFamily: 'Rubik-Bold',
    color: '#4B5563',
    paddingBottom: verticalScale(10),
  },
  flatListContent: {
    paddingBottom: verticalScale(32),
    paddingHorizontal: PADDING_HORIZONTAL,
  },
  flatListColumnWrapper: {
    flexDirection: 'row',
    gap: GAP,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(80),
  },
  emptyImage: {
    width: scale(160),
    height: scale(160),
  },
  emptyTitle: {
    fontSize: moderateScale(24),
    fontFamily: 'Rubik-Bold',
    color: '#4B5563',
    textAlign: 'center',
    marginTop: verticalScale(10),
  },
  emptySubtitle: {
    fontSize: moderateScale(16),
    fontFamily: 'Rubik-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: verticalScale(5),
  },
  filterChipsContainer: {
    marginTop: verticalScale(10),
    marginBottom: verticalScale(10),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FA',
    borderRadius: 20,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    marginRight: scale(8),
  },
  filterChipText: {
    fontSize: moderateScale(12),
    fontFamily: 'Rubik-Regular',
    color: '#234F68',
    marginRight: scale(4),
  },
  clearButton: {
    padding: scale(2),
  },
  clearAllButton: {
    marginRight: PADDING_HORIZONTAL,
    marginBottom: verticalScale(5),
  },
  clearAllText: {
    fontSize: moderateScale(14),
    fontFamily: 'Rubik-Medium',
    color: '#234F68',
    textAlign: 'right',
  },
  filterContainer: {
    marginTop: verticalScale(10),
    marginBottom: verticalScale(10),
    backgroundColor: '#fff',
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  picker: {
    width: '100%',
    height: verticalScale(40),
    color: '#234F68',
  },
  pickerItem: {
    fontSize: moderateScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#234F68',
  },
});
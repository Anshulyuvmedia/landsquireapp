import { StyleSheet, Text, TouchableOpacity, View, Image, Dimensions } from 'react-native'
import React, { useEffect, useState } from 'react'
import images from '@/constants/images'
import icons from '@/constants/icons'
import Ionicons from "@expo/vector-icons/Ionicons";
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import * as Location from "expo-location";

// Get screen width for dynamic card sizing
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const PADDING_HORIZONTAL = scale(10);
const GAP = scale(5);
const CARD_WIDTH = (SCREEN_WIDTH - 3 * PADDING_HORIZONTAL - (NUM_COLUMNS - 1) * GAP) / NUM_COLUMNS;

const FeaturedCard = ({ item, onPress, map }) => {
  return (
    <View className=''>
      <TouchableOpacity onPress={onPress} className='flex flex-col items-start w-60 h-80 relative'>
        <Image source={{ uri: `https://landsquire.in/adminAssets/images/Listings/${item.thumbnail}` }} className='size-full rounded-2xl' />
        <Image source={images.cardGradient} className='size-full rounded-2xl absolute bottom-0' />

        {/* <View className='flex flex-row items-center bg-white/90 px-3 py-1.5 rounded-full absolute top-5 right-5'>
          <Image source={icons.star} className='size-3.5' />
          <Text className='text-xs font-rubik-bold text-yellow-800 ml-1'>4.4</Text>
        </View> */}

        <View className='flex flex-col items-start absolute bottom-5 inset-x-5'>
          <Text className='text-xl font-rubik-extrabold text-white' numberofLines={1}>{item.property_name}</Text>
          <Text className='text-base font-rubik text-white' numberOfLines={1}>{item.city}</Text>
          <View className='flex flex-row items-center justify-between w-full'>
            <Text className='text-xl font-rubik-extrabold text-white'>{item.category}</Text>
            {/* <Image source={icons.heart} className='size-5' /> */}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  )
}

export { FeaturedCard };

const Card = ({ item, onPress }) => {
  const formatINR = (amount) => {
    if (!amount) return '₹0';
    const num = Number(amount);
    if (num >= 1e7) {
      return '₹' + (num / 1e7).toFixed(2).replace(/\.00$/, '') + ' Cr';
    } else if (num >= 1e5) {
      return '₹' + (num / 1e5).toFixed(1) + ' Lakh'; // Adjusted to 1 decimal
    }
    return '₹' + num.toLocaleString('en-IN');
  };

  // console.log('thumbnail', item.thumbnail)
  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
      {/* Heart Icon */}
      {/* <View style={styles.heartContainer}>
        <TouchableOpacity>
          <Image
            source={require('../assets/icons/heart.png')} // Update path
            style={styles.heartIcon}
          />
        </TouchableOpacity>
      </View> */}

      {/* Category Badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>

      {/* Thumbnail Image */}
      <Image
        source={{ uri: `https://landsquire.in/adminAssets/images/Listings/${item.thumbnail}` }}
        style={styles.thumbnail}
      />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.propertyName} numberOfLines={1}>
          {item.property_name}
        </Text>
        <Text style={styles.priceText}>{formatINR(item.price || 290)}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={moderateScale(16)} color="#234F68" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.city}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};


export { Card };

const HorizontalCard = ({ item, onPress, onView, map }) => {
  // console.log('item:', item);
  // Helper to format price in Indian Rupees
  const formatINR = (amount) => {
    if (!amount) return '₹0';
    const num = Number(amount);
    if (num >= 1e7) {
      return '₹' + (num / 1e7).toFixed(2).replace(/\.00$/, '') + ' Cr';
    } else if (num >= 1e5) {
      return '₹' + (num / 1e5).toFixed(2).replace(/\.00$/, '') + ' Lakh';
    }
    return '₹' + num.toLocaleString('en-IN');
  };

  // Fallback for property_name
  const propertyName = item.property_name || 'Unnamed Property';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-[320px] h-[130px] rounded-[30px] bg-[#f5f4f8] flex-row overflow-hidden"
    >
      {/* Image Section */}
      <View className="w-[150px] h-full relative p-2">
        <Image
          source={{
            uri: item.thumbnail
              ? `https://landsquire.in/adminAssets/images/Listings/${item.thumbnail}`
              : `https://landsquire.in/adminAssets/images/Projects/${item.thumbnail}`, // Fallback image
          }}
          className="w-full h-full rounded-[30px]"
          style={{ resizeMode: 'cover' }}
        />
        {/* Category Badge */}
        <View
          className="absolute bottom-4 left-4 rounded-xl px-4 py-1"
          style={{ backgroundColor: 'rgba(35,79,104,0.9)', backdropFilter: 'blur(8px)' }}
        >
          <Text className="text-sm font-rubik text-white">
            {item.category || 'N/A'}
          </Text>
        </View>
      </View>
      {/* Text Content Section */}
      <View className="flex-1 p-2 justify-center items-start">
        {/* Property Name */}
        <Text className="text-lg font-rubik-medium text-black-300">
          {propertyName.length > 17 ? propertyName.slice(0, 17) + '...' : propertyName}
        </Text>

        {/* Location */}
        <View className="flex-row items-center mt-1">
          <Ionicons name="location-outline" size={16} color="#234F68" />
          <Text className="text-sm font-rubik text-black ml-1">
            {item.city || 'Unknown City'}
          </Text>
        </View>

        {/* Price */}
        <View className="w-[100%] flex-row items-center justify-between mt-2">
          <Text className="text-base font-rubik text-black-300">
            {formatINR(item.price || 0)}
          </Text>
          {map && (
            <TouchableOpacity
              onPress={onView}
              className="py-1 px-2 bg-primary-400 rounded-lg items-center"
            >
              <Ionicons name="eye-outline" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export { HorizontalCard };

// HorizontalCard component for displaying both properties and projects
const MapCard = ({ item, onPress, onView, map }) => {
  // Helper to format price in Indian Rupees
  const formatINR = (amount) => {
    if (!amount) return '₹0';
    const num = Number(amount);
    if (num >= 1e7) {
      return '₹' + (num / 1e7).toFixed(2).replace(/\.00$/, '') + ' Cr';
    } else if (num >= 1e5) {
      return '₹' + (num / 1e5).toFixed(2).replace(/\.00$/, '') + ' Lakh';
    }
    return '₹' + num.toLocaleString('en-IN');
  };
  // console.log('item:', item);
  const [projectCity, setProjectCity] = useState("Unknown City");
  // Determine field values based on item type
  const isProperty = item.type === 'property';
  const propertyName = item.property_name || item.projecttitle || 'Unnamed Property';
  const category = item.category || 'Project';
  const city = item.city || 'Unknown City';
  const price = item.price || '';
  const centroid = item.latitude
  const thumbnailPath = isProperty
    ? `https://landsquire.in/adminAssets/images/Listings/${item.thumbnail}`
    : `https://landsquire.in/adminAssets/images/Projects/${item.thumbnail}`;

  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        // console.log("Permission to access location was denied");
        return null;
      }

      const results = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (results.length > 0) {
        const addressObj = results[0];
        return addressObj.city || addressObj.region || "Unknown City";
      }
      return null;
    } catch (error) {
      console.error("Error in reverse geocoding:", error);
      return null;
    }
  };

  // Parse centroid for project
  const parseCentroid = (coordinates) => {
    try {
      const coords = JSON.parse(coordinates);
      if (!Array.isArray(coords) || coords.length === 0) return null;
      let latSum = 0, lngSum = 0;
      coords.forEach(c => {
        latSum += parseFloat(c.lat);
        lngSum += parseFloat(c.lng);
      });
      return {
        latitude: latSum / coords.length,
        longitude: lngSum / coords.length,
      };
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!isProperty && item.coordinates) {
      const centroid = parseCentroid(item.coordinates);
      if (centroid) {
        getAddressFromCoordinates(centroid.latitude, centroid.longitude)
          .then(cityName => {
            if (cityName) {
              setProjectCity(cityName);
            }
          });
      }
    }
  }, [item]);


  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-[320px] h-[130px] rounded-[30px] bg-[#f5f4f8] flex-row overflow-hidden"
    >
      {/* Image Section */}
      <View className="w-[150px] h-full relative p-2">
        <Image
          source={{
            uri: item.thumbnail ? thumbnailPath : 'https://landsquire.in/adminAssets/images/default.jpg', // Fallback image
          }}
          className="w-full h-full rounded-[30px]"
          style={{ resizeMode: 'cover' }}
        />
        {/* Category Badge */}
        <View
          className="absolute bottom-4 left-4 rounded-xl px-4 py-1"
          style={{ backgroundColor: 'rgba(35,79,104,0.9)', backdropFilter: 'blur(8px)' }}
        >
          <Text className="text-sm font-rubik text-white">
            {category}
          </Text>
        </View>
      </View>
      {/* Text Content Section */}
      <View className="flex-1 p-2 justify-center items-start">
        {/* Property/Project Name */}
        <Text className="text-lg font-rubik-medium text-black-300">
          {propertyName.length > 17 ? propertyName.slice(0, 17) + '...' : propertyName}
        </Text>

        {/* Location */}
        <View className="flex-row items-center mt-1">
          <Ionicons name="location-outline" size={16} color="#234F68" />
          <Text className="text-sm font-rubik text-black ml-1">
            {isProperty ? city : projectCity}
          </Text>
        </View>

        {/* Price */}
        <View className="w-[100%] flex-row items-center justify-between mt-2">
          <Text className="text-base font-rubik text-black-300">
            {price && formatINR(price)}
          </Text>

          {map && (
            <TouchableOpacity
              onPress={onView}
              className="py-1 px-2 bg-primary-400 rounded-lg items-center"
            >
              <Ionicons name="eye-outline" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export { MapCard };

const styles = StyleSheet.create({

  cardContainer: {
    width: CARD_WIDTH,
    backgroundColor: '#f5f4f8',
    borderRadius: moderateScale(20),
    padding: moderateScale(5),
    overflow: 'hidden',
    marginBottom: verticalScale(15),
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  heartContainer: {
    position: 'absolute',
    top: verticalScale(10),
    right: scale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 9999,
    padding: moderateScale(7),
    zIndex: 50,
  },
  heartIcon: {
    width: scale(15),
    height: scale(15),
    tintColor: '#191d31',
  },
  categoryBadge: {
    position: 'absolute',
    top: verticalScale(120),
    right: scale(10),
    backgroundColor: 'rgba(35, 79, 104, 0.9)',
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(2),
    zIndex: 50,
  },
  categoryText: {
    fontSize: moderateScale(12),
    fontFamily: 'Rubik-Regular',
    color: '#FFFFFF',
  },
  thumbnail: {
    width: '100%',
    height: verticalScale(140),
    borderRadius: moderateScale(20),
  },
  content: {
    padding: moderateScale(10),
  },
  propertyName: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    textTransform: 'capitalize',
    color: '#000000',
    marginBottom: verticalScale(5),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(5),
  },
  locationText: {
    fontSize: moderateScale(12),
    fontFamily: 'Rubik-Regular',
    color: '#000000',
    marginLeft: scale(5),
  },
  priceText: {
    fontSize: moderateScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#234F68',
  },

  icon: {
    marginRight: 3,
  },
})
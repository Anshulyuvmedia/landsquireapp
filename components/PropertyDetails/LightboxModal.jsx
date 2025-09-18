import React from 'react';
import { View, Modal, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';

const LightboxModal = ({
    isLightboxVisible,
    closeLightbox,
    navigateLightbox,
    getMediaAtIndex,
    selectedMediaIndex,
    propertyGallery,
    videoUrls,
    videoRef,
    scale,
    savedScale,
}) => {
    const windowWidth = Dimensions.get('window').width;
    const windowHeight = Dimensions.get('window').height;
    const mediaWidth = windowWidth * 0.9;
    const mediaHeight = windowHeight * 0.6;

    // Animated style for scaling
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Modal
            visible={isLightboxVisible}
            transparent={true}
            onRequestClose={closeLightbox}
            animationType="slide"
        >
            <View className="flex-1 bg-black/80 justify-center items-center">
                {/* Close button */}
                <TouchableOpacity className="absolute top-10 right-10 z-50" onPress={closeLightbox}>
                    <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>

                {/* Left/Right navigation for media switching */}
                <TouchableOpacity
                    className="absolute left-10 z-50 top-1/2 -translate-y-1/2"
                    onPress={() => navigateLightbox(-1)}
                    disabled={selectedMediaIndex === 0}
                >
                    <Ionicons
                        name="chevron-back"
                        size={30}
                        color={selectedMediaIndex === 0 ? 'gray' : 'white'}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    className="absolute right-10 z-50 top-1/2 -translate-y-1/2"
                    onPress={() => navigateLightbox(1)}
                    disabled={selectedMediaIndex === (propertyGallery?.length || 0) + videoUrls.length - 1}
                >
                    <Ionicons
                        name="chevron-forward"
                        size={30}
                        color={
                            selectedMediaIndex === (propertyGallery?.length || 0) + videoUrls.length - 1
                                ? 'gray'
                                : 'white'
                        }
                    />
                </TouchableOpacity>

                {/* Zoom in/out buttons */}
                <View className="absolute bottom-10 flex-row gap-4 z-50">
                    <TouchableOpacity
                        onPress={() => {
                            const newScale = Math.max(savedScale.value - 0.5, 1);
                            scale.value = withSpring(newScale);
                            savedScale.value = newScale;
                        }}
                        className="bg-white/80 p-2 rounded-full"
                        accessibilityLabel="Zoom out"
                    >
                        <Ionicons name="remove" size={24} color="black" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            const newScale = Math.min(savedScale.value + 0.5, 3);
                            scale.value = withSpring(newScale);
                            savedScale.value = newScale;
                        }}
                        className="bg-white/80 p-2 rounded-full"
                        accessibilityLabel="Zoom in"
                    >
                        <Ionicons name="add" size={24} color="black" />
                    </TouchableOpacity>
                </View>

                {/* Media content */}
                {getMediaAtIndex(selectedMediaIndex) ? (
                    <Animated.View style={[animatedStyle, { width: mediaWidth, height: mediaHeight }]}>
                        {typeof getMediaAtIndex(selectedMediaIndex) === 'string' &&
                            (getMediaAtIndex(selectedMediaIndex).endsWith('.mp4') ||
                                getMediaAtIndex(selectedMediaIndex).endsWith('.mov')) ? (
                            <Video
                                ref={videoRef}
                                source={{ uri: getMediaAtIndex(selectedMediaIndex) }}
                                style={{ width: mediaWidth, height: mediaHeight, borderRadius: 10 }}
                                resizeMode="contain"
                                useNativeControls
                                shouldPlay={true}
                                isLooping={false}
                                onError={(error) => console.log('Video error:', error)}
                            />
                        ) : (
                            <ExpoImage
                                source={{ uri: getMediaAtIndex(selectedMediaIndex) }}
                                style={{ width: mediaWidth, height: mediaHeight, borderRadius: 10 }}
                                contentFit="contain"
                                transition={1000}
                                onError={(error) => console.log('Image error:', error.nativeEvent.error)}
                            />
                        )}
                    </Animated.View>
                ) : (
                    <Text className="text-white text-base">No media available</Text>
                )}
            </View>
        </Modal>
    );
};

export default LightboxModal;
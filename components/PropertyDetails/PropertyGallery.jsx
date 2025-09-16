import { View, FlatList, TouchableOpacity } from "react-native";
import { Image as ExpoImage } from "expo-image";
import images from "@/constants/images";
import { useEffect } from "react";

const PropertyGallery = ({ propertyGallery, windowWidth, openLightbox }) => {
    if (!propertyGallery?.length) return null;

    // useEffect(() => {
    //     propertyGallery.forEach((item, index) => {
    //         console.log(`Item ${index} image type: ${typeof item.image}, Value: ${item.image}`);
    //     });
    // }, [propertyGallery]);

    return (
        <View className="mt-4 p-4 border-t border-primary-200">
            <FlatList
                data={propertyGallery}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => {
                    // console.log(`Image type: ${typeof item.image}, Value: ${item.image}`, index);
                    const imageSource = typeof item.image === "string" ? item.image : String(images.avatar);
                    return (
                        <TouchableOpacity onPress={() => {openLightbox(index); }} style={{ width: windowWidth / 2 }}>
                            <ExpoImage
                                source={{ uri: imageSource }}
                                style={{ width: windowWidth / 2, height: 150, borderRadius: 20 }}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                placeholder={images.newYork} // Ensure this is a valid local image
                                onError={(error) => console.log('Image load error:', error.nativeEvent.error)}
                                // onLoadStart={() => console.log('Image load started for:', item.image)}
                            />
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
                getItemLayout={(data, index) => ({
                    length: windowWidth / 2,
                    offset: (windowWidth / 2) * index,
                    index,
                })}
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={7}
                removeClippedSubviews={true}
            />
        </View>
    );
};

export default PropertyGallery;
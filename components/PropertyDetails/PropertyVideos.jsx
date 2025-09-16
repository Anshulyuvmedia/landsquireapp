import { View, Text, FlatList, TouchableOpacity, Image } from "react-native";
import icons from "@/constants/icons";

const PropertyVideos = ({ videoUrls, windowWidth, openLightbox, selectedMediaIndex, propertyGalleryLength }) => {
    // Return null if videoUrls is empty or not an array
    if (!Array.isArray(videoUrls) || videoUrls.length === 0) return null;
    // console.log('videoUrls', videoUrls);

    // Validate that each video has a unique ID
    const validatedVideoUrls = videoUrls.map((video, index) => ({
        ...video,
        id: video.id || `video-${index}`, // Fallback ID if video.id is missing or not unique
    }));

    return (
        <View className="px-5 mt-4">
            <Text className="text-black-300 text-xl font-rubik-bold">Property Videos</Text>
            <FlatList
                data={validatedVideoUrls}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()} // Ensure key is a string
                renderItem={({ item, index }) => {
                    const thumbnailUri =
                        typeof item.thumbnail === "string"
                            ? { uri: item.thumbnail }
                            : icons.videofile;
                    return (
                        <TouchableOpacity
                            onPress={() => openLightbox(propertyGalleryLength + index)}
                            className="bg-primary-100 px-2 rounded-[10px]"
                        >
                            <Image
                                source={
                                    typeof item.thumbnail === "string"
                                        ? { uri: item.thumbnail }  // Remote URL
                                        : icons.videofile          // Local require fallback
                                }
                                className="w-[75px] h-[75px]"
                                resizeMode="cover"
                            />

                            <Text className="text-black text-sm font-rubik-medium mt-2 text-center">
                                {item.title || `Video ${index + 1}`}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
                getItemLayout={(data, index) => ({
                    length: windowWidth,
                    offset: windowWidth * index,
                    index,
                })}
            />
            <View className="flex-row justify-center mt-2">
                {validatedVideoUrls.map((_, index) => (
                    <View
                        key={`dot-${index}`} // Add unique key for pagination dots
                        className={`w-2 h-2 rounded-full mx-1 ${selectedMediaIndex === propertyGalleryLength + index
                            ? "bg-blue-500"
                            : "bg-gray-300"
                            }`}
                    />
                ))}
            </View>
        </View>
    );
};

export default PropertyVideos;

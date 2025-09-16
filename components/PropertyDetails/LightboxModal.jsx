import { View, Modal, TouchableOpacity, Text, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";
import { Image as ExpoImage } from "expo-image";
import { PinchGestureHandler, PanGestureHandler, State } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, withSpring, useAnimatedGestureHandler, useSharedValue } from "react-native-reanimated";

const LightboxModal = ({
    isLightboxVisible,
    closeLightbox,
    navigateLightbox,
    getMediaAtIndex,
    selectedMediaIndex,
    propertyGallery,
    videoUrls,
    windowWidth,
    windowHeight,
    videoRef,
    scale,
    savedScale,
}) => {
    // State for panning
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    // Calculate boundaries for panning
    const mediaWidth = windowWidth * 0.9;
    const mediaHeight = windowHeight * 0.6;
    const maxTranslateX = () => Math.max(0, (mediaWidth * (savedScale.value - 1)) / 2);
    const maxTranslateY = () => Math.max(0, (mediaHeight * (savedScale.value - 1)) / 2);

    // Pinch gesture handler for zooming
    const pinchHandler = useAnimatedGestureHandler({
        onActive: (event) => {
            scale.value = savedScale.value * event.scale;
        },
        onEnd: () => {
            savedScale.value = scale.value;
            if (scale.value < 1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else if (scale.value > 3) {
                scale.value = withSpring(3);
                savedScale.value = 3;
            }
        },
    });

    // Pan gesture handler for dragging
    const panHandler = useAnimatedGestureHandler({
        onActive: (event) => {
            if (savedScale.value > 1) {
                translateX.value = savedTranslateX.value + event.translationX;
                translateY.value = savedTranslateY.value + event.translationY;

                // Clamp translations to prevent moving beyond boundaries
                const maxX = maxTranslateX();
                const maxY = maxTranslateY();
                translateX.value = Math.max(-maxX, Math.min(maxX, translateX.value));
                translateY.value = Math.max(-maxY, Math.min(maxY, translateY.value));
            }
        },
        onEnd: () => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        },
    });

    // Animated style for scaling and panning
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateX: translateX.value },
            { translateY: translateY.value },
        ],
    }));

    // Handle arrow navigation for panning
    const handlePan = (direction) => {
        if (savedScale.value <= 1) return; // No panning if not zoomed in
        const step = 50; // Pixels to move per click
        const maxX = maxTranslateX();
        const maxY = maxTranslateY();

        switch (direction) {
            case "up":
                translateY.value = withSpring(Math.min(maxY, translateY.value + step));
                savedTranslateY.value = translateY.value;
                break;
            case "down":
                translateY.value = withSpring(Math.max(-maxY, translateY.value - step));
                savedTranslateY.value = translateY.value;
                break;
            case "left":
                translateX.value = withSpring(Math.min(maxX, translateX.value + step));
                savedTranslateX.value = translateX.value;
                break;
            case "right":
                translateX.value = withSpring(Math.max(-maxX, translateX.value - step));
                savedTranslateX.value = translateX.value;
                break;
        }
    };

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
                        color={selectedMediaIndex === 0 ? "gray" : "white"}
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
                                ? "gray"
                                : "white"
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
                            if (newScale === 1) {
                                translateX.value = withSpring(0);
                                translateY.value = withSpring(0);
                                savedTranslateX.value = 0;
                                savedTranslateY.value = 0;
                            }
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

                {/* Pan navigation arrows (top, bottom, left, right) */}
                {savedScale.value > 1 && (
                    <>
                        <TouchableOpacity
                            className="absolute top-10 z-50"
                            onPress={() => handlePan("up")}
                            accessibilityLabel="Pan up"
                        >
                            <Ionicons name="chevron-up" size={30} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="absolute bottom-20 z-50"
                            onPress={() => handlePan("down")}
                            accessibilityLabel="Pan down"
                        >
                            <Ionicons name="chevron-down" size={30} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="absolute left-10 top-1/3 z-50"
                            onPress={() => handlePan("left")}
                            accessibilityLabel="Pan left"
                        >
                            <Ionicons name="chevron-back" size={30} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="absolute right-10 top-1/3 z-50"
                            onPress={() => handlePan("right")}
                            accessibilityLabel="Pan right"
                        >
                            <Ionicons name="chevron-forward" size={30} color="white" />
                        </TouchableOpacity>
                    </>
                )}

                {/* Media content with pinch and pan handlers */}
                {getMediaAtIndex(selectedMediaIndex) ? (
                    <PinchGestureHandler onGestureEvent={pinchHandler}>
                        <Animated.View>
                            <PanGestureHandler
                                onGestureEvent={panHandler}
                                enabled={savedScale.value > 1}
                                simultaneousHandlers={['pinch']}
                            >
                                <Animated.View
                                    style={[animatedStyle, { width: mediaWidth, height: mediaHeight }]}
                                >
                                    {typeof getMediaAtIndex(selectedMediaIndex) === "string" &&
                                        (getMediaAtIndex(selectedMediaIndex).endsWith(".mp4") ||
                                            getMediaAtIndex(selectedMediaIndex).endsWith(".mov")) ? (
                                        <Video
                                            ref={videoRef}
                                            source={{ uri: getMediaAtIndex(selectedMediaIndex) }}
                                            style={{ width: mediaWidth, height: mediaHeight, borderRadius: 10 }}
                                            resizeMode="contain"
                                            useNativeControls
                                            shouldPlay={true}
                                            isLooping={false}
                                            onError={(error) => console.log("Video error:", error)}
                                        />
                                    ) : (
                                        <ExpoImage
                                            source={{ uri: getMediaAtIndex(selectedMediaIndex) }}
                                            style={{ width: mediaWidth, height: mediaHeight, borderRadius: 10 }}
                                            contentFit="contain"
                                            transition={1000}
                                            onError={(error) => console.log("Image error:", error.nativeEvent.error)}
                                        />
                                    )}
                                </Animated.View>
                            </PanGestureHandler>
                        </Animated.View>
                    </PinchGestureHandler>
                ) : (
                    <Text className="text-white text-base">No media available</Text>
                )}
            </View>
        </Modal>
    );
};

export default LightboxModal;
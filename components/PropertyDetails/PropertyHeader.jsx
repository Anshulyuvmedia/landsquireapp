import { View, Image, TouchableOpacity, Text, Platform, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Share } from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";
import images from "@/constants/images";

const PropertyHeader = ({ propertyThumbnail, propertyData, loggedinUserId, isProject }) => {
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [sheetContent, setSheetContent] = useState({ type: "", message: "" });
    const rbSheetRef = useRef();

    // console.log('propertyThumbnail', propertyThumbnail, typeof propertyThumbnail);
    // useEffect(() => {
    //     console.log('propertyThumbnail updated:', propertyThumbnail, typeof propertyThumbnail);
    // }, [propertyThumbnail]);
    // Check if the property is already in the user's wishlist
    const checkWishlistStatus = async () => {
        if (!loggedinUserId || !propertyData?.id) {
            console.warn("Missing userId or propertyId");
            return;
        }

        try {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) {
                console.warn("No token found");
                setSheetContent({ type: "error", message: "Please log in to check wishlist status." });
                rbSheetRef.current?.open();
                return;
            }

            const response = await axios.get(
                `https://landsquire.in/api/checkWishlistStatus/${loggedinUserId}/${propertyData.id}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (response.data.success) {
                setIsWishlisted(response.data.isWishlisted);
            } else {
                setSheetContent({ type: "error", message: response.data.message || "Failed to check wishlist status." });
                rbSheetRef.current?.open();
            }
        } catch (error) {
            console.error("Error checking wishlist status:", error.message);
            let errorMessage = "Failed to check wishlist status. Please try again.";
            if (error.response?.status === 404) {
                errorMessage = "Wishlist endpoint not found. Please contact support.";
            } else if (error.response?.status === 500) {
                errorMessage = "Server error while checking wishlist. Please try again later.";
            }
            setSheetContent({ type: "error", message: errorMessage });
            rbSheetRef.current?.open();
        }
    };

    useEffect(() => {
        checkWishlistStatus();
    }, [loggedinUserId, propertyData?.id]);

    // Function to toggle wishlist status
    const toggleWishlist = async () => {
        if (!loggedinUserId || !propertyData?.id) {
            setSheetContent({ type: "error", message: "Please log in and select a valid property." });
            rbSheetRef.current?.open();
            return;
        }

        try {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) {
                setSheetContent({ type: "error", message: "Please log in to manage your wishlist." });
                rbSheetRef.current?.open();
                return;
            }

            const response = await axios.post(
                `https://landsquire.in/api/addToWishlist`,
                {
                    userId: parseInt(loggedinUserId, 10),
                    propertyId: parseInt(propertyData.id, 10),
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.data.success) {
                setIsWishlisted(response.data.added);
                setSheetContent({
                    type: "success",
                    message: response.data.added ? "Added to wishlist." : "Removed from wishlist.",
                });
                rbSheetRef.current?.open();
                setTimeout(() => rbSheetRef.current?.close(), 2000);
            } else {
                setSheetContent({ type: "error", message: response.data.message || "Failed to update wishlist." });
                rbSheetRef.current?.open();
            }

            await checkWishlistStatus();
        } catch (error) {
            console.error("Error updating wishlist:", error.response?.data, error.message);
            const errorMessage = error.response?.data?.message || "An error occurred while updating the wishlist.";
            setSheetContent({ type: "error", message: errorMessage });
            rbSheetRef.current?.open();
        }
    };

    const fetchEncryptedId = async (id) => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            if (!token) {
                throw new Error("No token found");
            }
            const response = await axios.get(`https://landsquire.in/api/getencryptedid/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.data.encrypted_id) {
                return response.data.encrypted_id;
            } else {
                throw new Error("Encrypted ID not found in response");
            }
        } catch (error) {
            console.error("Error fetching encrypted ID:", error.message);
            throw error;
        }
    };

    const shareProperty = async () => {
        try {
            if (!propertyData?.id) {
                setSheetContent({ type: "error", message: "Property ID is missing." });
                rbSheetRef.current?.open();
                return;
            }

            let shareUrl;
            let shareTitle = isProject ? "Check out this project!" : "Check out this property!";

            if (isProject) {
                shareUrl = `https://landsquire.in/project-details/${propertyData.id}`;
            } else {
                const encryptedId = await fetchEncryptedId(propertyData.id);
                shareUrl = `https://landsquire.in/listing-details/${encryptedId}`;
            }

            const message = isProject
                ? `View this project: ${shareUrl}`
                : `View this property: ${shareUrl}`;

            const result = await Share.share({
                message,
                url: shareUrl,
                title: shareTitle,
            });

            if (result.action === Share.sharedAction) {
                console.log(isProject ? "Project shared successfully!" : "Property shared successfully!");
            } else if (result.action === Share.dismissedAction) {
                console.log("Share dismissed.");
            }
        } catch (error) {
            console.error("Error sharing:", error.message);
            setSheetContent({ type: "error", message: `Could not share ${isProject ? "project" : "property"}.` });
            rbSheetRef.current?.open();
        }
    };

    return (
        <>
            <View className="relative w-full p-2" style={{ height: Dimensions.get("window").height / 2 }}>
                <Image
                    source={
                        typeof propertyThumbnail === "string"
                            ? { uri: propertyThumbnail }
                            : images.newYork
                    }
                    className="w-full h-full rounded-[50px]"
                    resizeMode="cover"
                />

                <View className="z-50 absolute inset-x-8" style={{ top: Platform.OS === "ios" ? 70 : 25 }}>
                    <View className="flex flex-row items-center justify-between w-full">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="flex flex-row bg-white rounded-full w-11 h-11 items-center justify-center"
                        >
                            <Ionicons name="arrow-back" size={20} color="#000000" />
                        </TouchableOpacity>
                        <View className="flex flex-row items-center gap-3">
                            {propertyData?.roleid === loggedinUserId && (
                                <Text
                                    className={`inline-flex items-center rounded-md capitalize px-2 py-1 text-xs font-rubik ring-1 ring-inset ${propertyData.status === "published"
                                        ? "bg-green-50 text-green-700 ring-green-600/20"
                                        : "bg-red-50 text-red-700 ring-red-600/20"
                                        }`}
                                >
                                    {propertyData.status}
                                </Text>
                            )}
                            <TouchableOpacity
                                onPress={shareProperty}
                                className="flex flex-row bg-white rounded-full w-11 h-11 items-center justify-center"
                            >
                                <Ionicons name="share-social" size={28} color="#000000" />
                            </TouchableOpacity>
                            {loggedinUserId && !isProject && (
                                <TouchableOpacity
                                    onPress={toggleWishlist}
                                    className="flex flex-row bg-white rounded-full w-11 h-11 items-center justify-center"
                                >
                                    <Ionicons
                                        name="heart-outline"
                                        size={28}
                                        color={isWishlisted ? "#FF0000" : "#000000"}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </View>
            <RBSheet
                ref={rbSheetRef}
                height={220}
                openDuration={300}
                closeDuration={200}
                customStyles={{
                    container: {
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        backgroundColor: "#ffffff",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5,
                    },
                }}
            >
                <View className="flex-1 px-6 py-4 items-center">
                    <Ionicons
                        name={sheetContent.type === "success" ? "checkmark-circle" : "warning-outline"}
                        size={48}
                        color={sheetContent.type === "success" ? "#22c55e" : "#ef4444"}
                        style={{ marginTop: 16 }}
                    />
                    <Text
                        className={`text-lg font-rubik font-semibold text-center mt-4 ${sheetContent.type === "success" ? "text-green-700" : "text-red-700"
                            }`}
                    >
                        {sheetContent.message}
                    </Text>
                    <TouchableOpacity
                        onPress={() => rbSheetRef.current?.close()}
                        className="mt-6 rounded-full px-8 py-3"
                    >
                        <Text className="text-base font-rubik text-gray-800 font-medium">Close</Text>
                    </TouchableOpacity>
                </View>
            </RBSheet>
        </>
    );
};

export default PropertyHeader;
import React, { useEffect, useState } from "react";
import { View, Text, Image, FlatList, TouchableOpacity, Linking, Alert } from "react-native";
import * as FileSystem from "expo-file-system"; // For downloading files
import * as Sharing from "expo-sharing"; // For opening/sharing files

const MasterPlanList = ({ masterPlanDocs }) => {
    const [processedDocs, setProcessedDocs] = useState([]);
    const [imageError, setImageError] = useState({}); // Track image loading errors
    const [urlStatus, setUrlStatus] = useState({}); // Track URL accessibility

    // Test URL accessibility
    const testImageUrl = async (url) => {
        try {
            const response = await fetch(url, { method: "HEAD" });
            // console.log(`🔹 URL ${url} is accessible: ${response.ok}`);
            return response.ok;
        } catch (error) {
            console.log(`🔹 URL ${url} is inaccessible:`, error.message);
            return false;
        }
    };

    useEffect(() => {
        // console.log("🔹 Received masterPlanDocs:", masterPlanDocs);
        let docs = [];

        if (typeof masterPlanDocs === "string") {
            docs = [masterPlanDocs];
        } else if (Array.isArray(masterPlanDocs)) {
            docs = masterPlanDocs.map((doc) => doc.replace("Listtings", "Listings")); // Fix typo if present
        }

        // Test accessibility for each URL
        const checkUrls = async () => {
            const status = {};
            for (const doc of docs) {
                status[doc] = await testImageUrl(doc);
            }
            setUrlStatus(status);
        };

        setProcessedDocs(docs);
        checkUrls();
    }, [masterPlanDocs]);

    // Handle opening or downloading files
    const handleFilePress = async (url) => {
        try {
            if (!url || typeof url !== "string") {
                Alert.alert("Error", "Invalid file URL.");
                return;
            }

            const isPdf = url.toLowerCase().endsWith(".pdf");

            if (isPdf) {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                    console.log("🔹 Opening PDF:", url);
                    await Linking.openURL(url);
                } else {
                    Alert.alert("Error", "No app available to open PDF.");
                }
            } else {
                console.log("🔹 Handling image download/open:", url);
                const fileName = url.split("/").pop();
                const fileUri = `${FileSystem.documentDirectory}${fileName}`;

                // Download the file
                console.log("🔹 Downloading to:", fileUri);
                const { uri } = await FileSystem.downloadAsync(url, fileUri);

                // Open or share the file
                if (await Sharing.isAvailableAsync()) {
                    console.log("🔹 Opening/sharing file:", uri);
                    await Sharing.shareAsync(uri, {
                        mimeType: url.toLowerCase().endsWith(".jpg") ? "image/jpeg" : "image/png",
                        dialogTitle: `Open ${fileName}`,
                    });
                } else {
                    Alert.alert("Error", "No app available to open or download the file.");
                }
            }
        } catch (error) {
            console.error("🔹 File Handling Error:", error);
            Alert.alert("Error", `Failed to open or download the file: ${error.message}`);
        }
    };

    const renderItem = ({ item }) => {
        const isPdf = item.toLowerCase().endsWith(".pdf");
        const hasImageError = imageError[item] || !urlStatus[item];

        return (
            <View className="mb-4">
                <TouchableOpacity onPress={() => handleFilePress(item)}>
                    <View className="p-3 bg-gray-100 rounded-lg flex items-center justify-center">
                        {isPdf ? (
                            <>
                                <Image
                                    source={{ uri: "https://cdn-icons-png.flaticon.com/512/337/337946.png" }}
                                    className="w-20 h-20 rounded-lg border border-gray-300"
                                    onError={() => {
                                        console.log("🔹 PDF icon failed to load");
                                        setImageError((prev) => ({ ...prev, [item]: true }));
                                    }}
                                />
                                <Text className="text-lg mt-2 font-rubik">View PDF</Text>
                            </>
                        ) : hasImageError ? (
                            <View className="w-40 h-40 rounded-lg border border-gray-300 flex items-center justify-center bg-gray-200">
                                <Text className="text-gray-500 text-center">Failed to Load Image</Text>
                            </View>
                        ) : (
                            <>
                                <Image
                                    source={{ uri: item }}
                                    className="w-40 h-40 rounded-lg border border-gray-300"
                                    resizeMode="contain"
                                    onError={() => {
                                        console.log("🔹 Image failed to load:", item);
                                        setImageError((prev) => ({ ...prev, [item]: true }));
                                    }}
                                />
                                <Text className="text-center text-gray-500 mt-2">Master Plan</Text>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View className="mt-4">
            {processedDocs.length > 0 ? (
                <FlatList
                    data={processedDocs}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={renderItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 16, paddingVertical: 10 }}
                />
            ) : (
                <Text className="text-gray-500 text-center">No Master Plan Available</Text>
            )}
        </View>
    );
};

export default MasterPlanList;
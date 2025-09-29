import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, Alert, ScrollView } from "react-native";
import * as FileSystem from "expo-file-system/legacy"; // use legacy API
import * as Sharing from "expo-sharing";

const MasterPlanList = ({ masterPlanDocs }) => {
    const [errorFiles, setErrorFiles] = useState({});

    const handleFilePress = async (url) => {
        try {
            if (!url) return Alert.alert("Error", "Invalid file URL.");

            const fileName = url.split("/").pop();
            const fileUri = `${FileSystem.documentDirectory}${fileName}`;

            // Download if not already exists
            const fileInfo = await FileSystem.getInfoAsync(fileUri); // legacy API
            if (!fileInfo.exists) {
                await FileSystem.downloadAsync(url, fileUri);
            }

            // Open with sharing
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
            } else {
                Alert.alert("Error", "File sharing is not available on this device");
            }
        } catch (err) {
            console.error("File Handling Error:", err);
            Alert.alert("Error", "Failed to open the file.");
        }
    };

    const docs = typeof masterPlanDocs === "string" ? [masterPlanDocs] : Array.isArray(masterPlanDocs) ? masterPlanDocs : [];

    return (
        <ScrollView horizontal contentContainerStyle={{ padding: 16, gap: 12 }}>
            {docs.length > 0 ? (
                docs.map((doc, index) => {
                    const isPdf = doc.toLowerCase().endsWith(".pdf");
                    const fileName = doc.split("/").pop();

                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => handleFilePress(doc)}
                            style={{
                                width: 120,
                                alignItems: "center",
                                backgroundColor: "#f0f0f0",
                                borderRadius: 8,
                                padding: 8,
                            }}
                        >
                            {isPdf ? (
                                <Image
                                    source={{ uri: "https://cdn-icons-png.flaticon.com/512/337/337946.png" }}
                                    style={{ width: 60, height: 60, marginBottom: 6 }}
                                />
                            ) : errorFiles[doc] ? (
                                <View
                                    style={{
                                        width: 100,
                                        height: 100,
                                        backgroundColor: "#ddd",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        borderRadius: 8,
                                        marginBottom: 6,
                                    }}
                                >
                                    <Text style={{ color: "#888", fontSize: 12, textAlign: "center" }}>
                                        Failed to load
                                    </Text>
                                </View>
                            ) : (
                                <Image
                                    source={{ uri: doc }}
                                    style={{ width: 100, height: 100, borderRadius: 8, marginBottom: 6 }}
                                    resizeMode="cover"
                                    onError={() =>
                                        setErrorFiles((prev) => ({ ...prev, [doc]: true }))
                                    }
                                />
                            )}
                            <Text style={{ fontSize: 14, color: "#333", textAlign: "center" }} numberOfLines={2}>
                                {fileName}
                            </Text>
                        </TouchableOpacity>
                    );
                })
            ) : (
                <Text style={{ textAlign: "center", color: "#888" }}>No Master Plan Available</Text>
            )}
        </ScrollView>
    );
};

export default MasterPlanList;

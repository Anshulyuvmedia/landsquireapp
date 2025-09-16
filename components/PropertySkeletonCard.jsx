import React from "react";
import { View } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder-expo";
import { LinearGradient } from "expo-linear-gradient";

const PropertySkeletonCard = ({ count = 3 }) => {
    return (
        <SkeletonPlaceholder
            backgroundColor="#E1E9EE"
            highlightColor="#F2F8FC"
            LinearGradientComponent={LinearGradient} // 👈 Force Expo gradient
        >
            {[...Array(count)].map((_, index) => (
                <View
                    key={index}
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 20,
                        padding: 10,
                    }}
                >
                    {/* Image placeholder */}
                    <View style={{ width: 100, height: 80, borderRadius: 10 }} />

                    {/* Text placeholders */}
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <View style={{ width: "70%", height: 20, borderRadius: 4 }} />
                        <View style={{ marginTop: 8, width: "50%", height: 18, borderRadius: 4 }} />
                        <View style={{ marginTop: 8, width: "40%", height: 16, borderRadius: 4 }} />
                    </View>
                </View>
            ))}
        </SkeletonPlaceholder>
    );
};

export default PropertySkeletonCard;

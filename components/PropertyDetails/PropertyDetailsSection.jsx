import { View, Text, ScrollView } from "react-native";
import { Ionicons, FontAwesome5, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

const PropertyDetailsSection = ({ propertyData, visitcount }) => {
    console.log('visit count', visitcount);
    return (
        <View className="px-5 mt-7 flex gap-2">
            <Text className="text-2xl font-rubik-medium capitalize">{propertyData.property_name}</Text>
            <View className="flex flex-row items-center justify-between gap-3">
                <View className="flex flex-row items-center py-2">
                    <Ionicons name="location-outline" size={20} color="#234F68" />
                    <Text className="text-sm font-rubik text-black capitalize">{propertyData.city}</Text>
                </View>
                {visitcount != null && (
                    <View className="flex flex-row items-center py-2">
                        <Ionicons name="eye-outline" size={20} color="#234F68" />
                        <Text className="text-sm font-rubik text-black ms-1">{visitcount}</Text>
                    </View>
                )}

                <View className="flex flex-row items-center py-2 px-3 bg-primary-400 rounded-xl">
                    <Text className="text-sm font-rubik text-white capitalize">
                        For {propertyData?.propertyfor ?? "Sell"}
                    </Text>
                </View>

                {propertyData?.subcategory ? (
                    <View className="flex flex-row items-center py-2 px-3 bg-primary-300 rounded-xl">
                        <Text className="text-sm font-rubik text-white capitalize">
                            {propertyData.category} - {propertyData.subcategory}
                        </Text>
                    </View>
                ) : (
                    <View className="flex flex-row items-center py-2 px-3 bg-primary-300 rounded-xl">
                        <Text className="text-sm font-rubik text-white capitalize">
                            {propertyData.category}
                        </Text>
                    </View>
                )}

            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="h-[60px]">
                <View className="flex-row items-center gap-3">
                    {propertyData?.bedroom ? (
                        <View className="flex-row items-center justify-center bg-primary-100 rounded-full py-4 w-36">
                            <FontAwesome5 name="bed" size={16} color="#8bc83f" />
                            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
                                {propertyData.bedroom} Bedroom
                            </Text>
                        </View>
                    ) : null}

                    {propertyData?.floor ? (
                        <View className="flex-row items-center justify-center bg-primary-100 rounded-full py-4 w-36">
                            <MaterialCommunityIcons name="floor-plan" size={20} color="#8bc83f" />
                            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
                                {propertyData.floor} Floors
                            </Text>
                        </View>
                    ) : null}

                    {propertyData?.bathroom ? (
                        <View className="flex-row items-center justify-center bg-primary-100 rounded-full py-4 w-36">
                            <MaterialCommunityIcons name="bathtub-outline" size={20} color="#8bc83f" />
                            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
                                {propertyData.bathroom} Bathroom
                            </Text>
                        </View>
                    ) : null}

                    {propertyData?.squarefoot ? (
                        <View className="flex-row items-center justify-center bg-primary-100 rounded-full py-4 w-36">
                            <MaterialIcons name="zoom-out-map" size={20} color="#8bc83f" />
                            <Text className="text-black-300 text-sm font-rubik-medium ml-2">
                                {propertyData.squarefoot}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </ScrollView>

        </View>
    );
};

export default PropertyDetailsSection;
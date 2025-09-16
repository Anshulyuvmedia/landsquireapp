import { View, Text, Image } from "react-native";
import icons from "@/constants/icons";

const AmenitiesList = ({ amenities }) => {
    if (amenities?.length === 0) return null;

    return (
        <View className="px-5 mt-7">
            <Text className="text-black-300 text-xl font-rubik-bold">Amenities</Text>
            <View className="flex flex-row flex-wrap items-start justify-start mt-2 gap-3">
                {amenities.map((item, index) => (
                    <View key={index} className="flex items-start">
                        <View className="px-3 py-2 bg-blue-100 rounded-full flex flex-row items-center justify-center">
                            <Image
                                source={typeof icons.checkmark === "string" ? { uri: icons.checkmark } : icons.checkmark}
                                className="w-6 h-6 mr-2"
                            />
                            <Text className="text-black-300 text-sm text-center font-rubik-bold capitalize">
                                {item}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

export default AmenitiesList;
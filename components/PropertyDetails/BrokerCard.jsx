import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import images from "@/constants/images";

const BrokerCard = ({ brokerData, handleCall, openWhatsApp, getProfileImageUri }) => {
    if (!brokerData) return null;

    console.log('brokerdata', brokerData.profile, typeof brokerData.profile);
    return (
        <View className="px-5 mt-4">
            <Text className="text-black-300 text-xl font-rubik-bold">Property Owner</Text>
            <TouchableOpacity
                className="flex flex-row items-center bg-primary-100 rounded-lg p-3 mt-2 shadow-md shadow-black/10"
                onPress={() => {
                    router.push({
                        pathname: `/broker/${brokerData.id}`,
                        params: {
                            name: brokerData.username,
                            image: brokerData?.profile,
                            city: brokerData.city || "Unknown",
                            email: brokerData.email || "N/A",
                            company: brokerData.company_name || "N/A",
                        },
                    });
                }}
            >
                <Image
                    source={
                        typeof brokerData?.profile === "string"
                            ? { uri: brokerData?.profile }
                            : images.avatar
                    }
                    className="w-14 h-14 rounded-full"
                    onError={(error) => console.log('Image load error for broker:', error.nativeEvent.error)}
                />
                <View className="flex flex-row justify-between flex-1 ml-3">
                    <View className="flex flex-col">
                        <Text className="text-lg text-primary-300 font-rubik-bold">{brokerData.username || "Unknown"}</Text>
                        <Text className="text-sm text-black-200 font-rubik-medium">{brokerData.company_name || "N/A"}</Text>
                        <Text className="text-sm text-black-200 font-rubik-medium">{brokerData.email || "N/A"}</Text>
                        <Text className="text-sm text-black-200 font-rubik-medium">{brokerData.mobilenumber || "Unknown"}</Text>
                    </View>
                    <View className="flex flex-row items-center gap-2">
                        <TouchableOpacity
                            className={`bg-primary-300 p-2 rounded-full ${!brokerData.mobilenumber ? "opacity-50" : ""}`}
                            onPress={() => handleCall(brokerData.mobilenumber)}
                            disabled={!brokerData.mobilenumber}
                        >
                            <Ionicons
                                name="call"
                                size={18}
                                color={brokerData.mobilenumber ? "#fff" : "#ccc"}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`bg-green-500 p-2 rounded-full ${!brokerData.mobilenumber ? "opacity-50" : ""}`}
                            onPress={() => openWhatsApp(brokerData.mobilenumber)}
                            disabled={!brokerData.mobilenumber}
                        >
                            <Ionicons
                                name="logo-whatsapp"
                                size={18}
                                color={brokerData.mobilenumber ? "#fff" : "#ccc"}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default BrokerCard;
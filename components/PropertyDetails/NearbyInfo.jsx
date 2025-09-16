import { View, Text } from "react-native";

const NearbyInfo = ({ nearbylocation, approxrentalincome, formatINR, propertyfor }) => {
    return (
        <View className="px-5 mt-7">
            {nearbylocation && (
                <>
                    <Text className="text-black-300 text-base font-rubik-medium mt-3">Nearby Locations:</Text>
                    <Text className="text-black-200 text-base font-rubik mt-2 capitalize">{nearbylocation}</Text>
                </>
            )}
            {approxrentalincome && propertyfor === 'Sell' && (
                <Text className="text-black-300 text-center font-rubik-medium mt-2 bg-blue-100 flex-grow p-2 rounded-full">
                    Approx Rental Income: {formatINR(approxrentalincome)}
                </Text>
            )}
        </View>
    );
};

export default NearbyInfo;
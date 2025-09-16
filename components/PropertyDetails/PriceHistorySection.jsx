import { View } from "react-native";
import PriceHistoryChart from "@/components/PriceHistoryChart";

const PriceHistorySection = ({ priceHistoryData }) => {
    if (priceHistoryData?.length === 0) return null;

    return (
        <View className="px-5 mt-4">
            <PriceHistoryChart priceHistoryData={priceHistoryData} />
        </View>
    );
};

export default PriceHistorySection;
import { View, Text } from "react-native";
import MasterPlanList from "@/components/MasterPlanList";

const MasterPlanSection = ({ masterPlanDocs }) => {
    if (masterPlanDocs.length === 0) return null;

    return (
        <View className="px-5 mt-4">
            <Text className="text-black-300 text-xl font-rubik-bold">Property Master Plan</Text>
            <View>
                <MasterPlanList masterPlanDocs={masterPlanDocs} />
            </View>
        </View>
    );
};

export default MasterPlanSection;
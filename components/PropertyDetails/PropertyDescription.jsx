import { View, Text } from "react-native";

const stripHtmlTags = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, "").trim();
};

const PropertyDescription = ({ description }) => {
    const cleanDescription = stripHtmlTags(description);

    return (
        <View className="px-5 mt-5 flex gap-2">
            <Text className="text-black-300 text-xl font-rubik-bold">Description</Text>
            <Text className="text-black-200 text-base font-rubik my-2">
                {cleanDescription}
            </Text>
        </View>
    );
};

export default PropertyDescription;

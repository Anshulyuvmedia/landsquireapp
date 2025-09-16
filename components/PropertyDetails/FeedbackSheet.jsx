import { forwardRef } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";
import icons from "@/constants/icons";

const FeedbackSheet = forwardRef(({ type, message, height, onClose }, ref) => {
    const isSuccess = type === "success";
    const bgColor = isSuccess ? "#28a745" : "#dc3545";
    const alertIcon = isSuccess ? icons.alertSuccess : icons.alertDanger;

    return (
        <RBSheet
            ref={ref}
            closeOnDragDown={true}
            closeOnPressMask={true}
            customStyles={{
                container: {
                    backgroundColor: "#f4f2f7",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    padding: 20,
                },
                draggableIcon: {
                    backgroundColor: "#8bc83f",
                },
            }}
            height={height}
            openDuration={250}
            onClose={onClose}
        >
            <View className="items-center">
                <Image source={alertIcon} className="w-[100px] h-[100px]" />
                <Text className={`text-[18px] font-rubik-bold text-[${bgColor}] mt-2`}>
                    {isSuccess ? "Success" : "Error"}
                </Text>
                <Text className="text-base text-center font-rubik mt-2">{message}</Text>
                <TouchableOpacity
                    className={`bg-[${bgColor}] px-4 py-2 rounded-[10px] mt-5`}
                    onPress={() => {
                        if (ref.current) ref.current.close();
                        if (onClose) onClose();
                    }}
                >
                    <Text className="text-black font-rubik-bold">Close</Text>
                </TouchableOpacity>
            </View>
        </RBSheet>
    );
});

export default FeedbackSheet;
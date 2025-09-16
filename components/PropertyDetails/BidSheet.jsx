import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";

const BidSheet = ({
    rbSheetRef,
    windowHeight,
    propertyData,
    formatINR,
    bidAmount,
    setBidAmount,
    bidError,
    setBidError,
    setBidStatus,
    loading,
    handleBidSubmit,
    formatIndianNumber,
}) => {
    return (
        <RBSheet
            ref={rbSheetRef}
            closeOnDragDown={true}
            closeOnPressMask={true}
            height={windowHeight * 0.4}
            customStyles={{
                container: {
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    padding: 20,
                    backgroundColor: "white",
                },
                draggableIcon: {
                    backgroundColor: "#8bc83f",
                },
            }}
        >
            <View className="flex-1">
                <Text className="text-black-300 text-xl font-rubik-bold mb-4">Place Your Bid</Text>
                <View className="mb-4">
                    <Text className="text-black-200 text-sm font-rubik-medium">Current Price</Text>
                    <Text className="text-primary-300 text-lg font-rubik-bold">{formatINR(propertyData.price)}</Text>
                </View>
                <View className="mb-4">
                    <Text className="text-black-200 text-sm font-rubik-medium">Your Bid Amount</Text>
                    <TextInput
                        value={formatIndianNumber(bidAmount)}
                        onChangeText={(text) => {
                            setBidAmount(text);
                            setBidError("");
                            setBidStatus(null);
                        }}
                        placeholder="Enter bid amount"
                        keyboardType="numeric"
                        className="border border-primary-200 rounded-lg p-3 mt-2 text-black-300 text-base font-rubik"
                    />
                    {bidError && <Text className="text-red-500 text-sm mt-1">{bidError}</Text>}
                </View>
                <TouchableOpacity
                    onPress={handleBidSubmit}
                    disabled={loading}
                    className={`flex flex-row items-center justify-center bg-primary-400 py-4 rounded-2xl ${loading ? "opacity-50" : ""}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-lg text-center font-rubik-bold">Submit Bid</Text>
                    )}
                </TouchableOpacity>
            </View>
        </RBSheet>
    );
};

export default BidSheet;
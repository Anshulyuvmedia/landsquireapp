import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity } from "react-native";
import { Picker } from "@react-native-picker/picker"; // Correct Picker import
// import { LineChart } from "react-native-chart-kit";

const PriceHistoryChart = ({ priceHistoryData }) => {
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [selectedYear, setSelectedYear] = useState(""); // Year filter
    const [availableYears, setAvailableYears] = useState([]); // Unique years
    const [tooltip, setTooltip] = useState(null); // Tooltip state
    // console.log("Raw Data:", priceHistoryData);

    useEffect(() => {
        if (Array.isArray(priceHistoryData) && priceHistoryData.length > 0) {
            const years = [...new Set(priceHistoryData.map(item => new Date(item.dateValue).getFullYear()))];
            setAvailableYears(years.sort());
            setSelectedYear(years[0]); // Default to first available year
        }
    }, [priceHistoryData]);

    useEffect(() => {
        if (selectedYear && Array.isArray(priceHistoryData)) {
            let filteredData = priceHistoryData.filter(
                item => new Date(item.dateValue).getFullYear() === selectedYear
            );
    
            // Sort the data by date
            filteredData = filteredData.sort((a, b) => new Date(a.dateValue) - new Date(b.dateValue));
    
            // Format Date as "Jan 25"
            const labels = filteredData.map(item => {
                const date = new Date(item.dateValue);
                return `${date.toLocaleString("en-US", { month: "short" })} ${date.getDate()}`;
            });
    
            // Parse Prices
            const prices = filteredData.map(item => parseFloat(item.priceValue));
    
            // ✅ Reset the data before updating
            setChartData({
                labels: [...labels], // Ensure it's a fresh array
                datasets: [{ data: [...prices] }] // Ensure it's a fresh array
            });
            // console.log("Filtered Data:", filteredData);
            // console.log("Labels:", labels);
            // console.log("Prices:", prices);
    
        } else {
            // ✅ Ensure the chart is cleared if no data
            setChartData({ labels: [], datasets: [] });
        }
    }, [selectedYear, priceHistoryData]);
    



    // ✅ Function to format Y-axis price labels
    const formatPrice = (value) => {
        if (value >= 1e7) return `${(value / 1e7).toFixed(2)}Cr`; // 1 crore+
        if (value >= 1e5) return `${(value / 1e5).toFixed(2)}L`;  // 1 lakh+
        return `${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`; // Below 1 lakh
    };

    // ✅ Function to handle dot press and show tooltip
    const handleDotPress = (index) => {
        const selectedPrice = chartData.datasets[0].data[index];
        const selectedDate = chartData.labels[index];
        setTooltip({ price: selectedPrice, date: selectedDate });

        // Hide tooltip after 2 seconds
        setTimeout(() => setTooltip(null), 2000);
    };

    return (
        <View className=" bg-white rounded-lg">
            <Text className="text-black-300 text-xl font-rubik-bold">Price History</Text>

            {/* Year Filter Dropdown */}
            <View className="flex flex-row align-center justify-end">
                <Text className="mt-5">Select Year:</Text>
                <Picker
                    selectedValue={selectedYear}
                    onValueChange={(itemValue) => setSelectedYear(itemValue)}
                    style={{ height: 50, width: 125 }}
                >
                    {availableYears.map(year => (
                        <Picker.Item key={year} label={year.toString()} value={year} />
                    ))}
                </Picker>
            </View>

            {/* Chart with Tooltips */}
            <ScrollView horizontal>
                {chartData.labels.length > 0 ? (
                    <View>
                        <LineChart
                            data={chartData}
                            width={Dimensions.get("window").width - 20}
                            height={250}
                            yAxisLabel="₹"
                            yAxisSuffix=""
                            yAxisInterval={1}
                            formatYLabel={formatPrice} // ✅ Format price with "Cr" & "L"
                            chartConfig={{
                                backgroundGradientFrom: "#fff",
                                backgroundGradientTo: "#fff",
                                decimalPlaces: 2,
                                color: (opacity = 1) => `rgba(34, 139, 230, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                style: { borderRadius: 10 },
                                propsForDots: {
                                    r: "5",
                                    strokeWidth: "2",
                                    stroke: "#228be6",
                                },
                            }}
                            bezier
                            style={{ borderRadius: 10 }}
                            fromZero
                            onDataPointClick={({ index }) => handleDotPress(index)} // ✅ Handle Dot Click
                        />

                        {/* Tooltip Overlay */}
                        {tooltip && (
                            <View
                                style={{
                                    position: "absolute",
                                    top: 50,
                                    left: 100,
                                    backgroundColor: "rgba(0,0,0,0.7)",
                                    padding: 8,
                                    borderRadius: 5
                                }}
                            >
                                <Text style={{ color: "#fff", fontSize: 14 }}>
                                    {tooltip.date}: {formatPrice(tooltip.price)}
                                </Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <Text className="text-gray-500 text-center">No Data Available for {selectedYear}</Text>
                )}
            </ScrollView>
        </View>
    );
};

export default PriceHistoryChart;

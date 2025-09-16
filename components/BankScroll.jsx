import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import images from '@/constants/images';
import { useRouter } from 'expo-router';

const BankScroll = () => {

    const [bankAgentList, setBankAgentList] = useState([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter(); // Initialize router

    const fetchBankAgentList = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`https://landsquire.in/api/bankagentlist`);
            // console.log('API Response:', response.data);

            if (response.data && response.data.success && Array.isArray(response.data.data)) {
                const apiData = response.data.data.map((bankagent, index) => ({
                    id: bankagent.id, // Generate unique id using index
                    name: bankagent.username ? bankagent.username.split(' ')[0] : 'Bank Agent', // Take first part before space
                    image: bankagent.profile
                        ? bankagent.profile.startsWith('http')
                            ? { uri: bankagent.profile }
                            : { uri: `https://landsquire.in/adminAssets/images/Users/${bankagent.profile}` }
                        : images.avatar, // Use require result directly if local image
                }));
                // console.log('Processed bankagent List:', apiData);
                setBankAgentList(apiData);
            } else {
                console.error('Unexpected API response format:', response.data);
                setBankAgentList([]);
            }
        } catch (error) {
            console.error('Error fetching bank agent data:', error.response ? `${error.response.status} - ${error.response.statusText}` : error.message, error.response ? error.response.data : {});
            setBankAgentList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBankAgentList();
    }, []);

    const renderbankagent = ({ item }) => (

        <TouchableOpacity
            onPress={() => {
                const imageUri = typeof item.image === 'object' && item.image.uri ? item.image.uri : (typeof item.image === 'number' ? images.avatar : item.image);
                router.push({ pathname: `/bank/${item.id}`, params: { name: item.name, image: imageUri } });
            }}
            className="items-center me-3"
        >
            {/* bankagent Profile Picture */}
            <Image
                source={item.image} // Use the object or require result directly
                className="w-16 h-16 rounded-full bg-white shadow-sm"
                style={{ resizeMode: 'cover' }}
                onError={(error) => console.log('Image load error for', item.name, ':', error.nativeEvent.error)}
            />
            {/* bankagent Name */}
            <Text className="mt-2 text-sm font-rubik text-black-300">
                {item.name}
            </Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View className="my-5">
                <ActivityIndicator size="large" color="#8bc83f" />
            </View>
        );
    }
    return (
        <View className="my-5">
            {/* Header Section */}
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-rubik-bold text-black-300">
                    Top Bank Agents
                </Text>
                <TouchableOpacity onPress={() => router.push('bank/allbankagents')}>
                    <Text className="text-base font-rubik text-primary-300">
                        Explore
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Horizontal Scroll of bankagents */}
            <FlatList
                data={bankAgentList}
                renderItem={renderbankagent}
                keyExtractor={(item) => item.id.toString()} // Ensure id is a string
                horizontal
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <Text className="text-black-300 text-center">No bank agents available</Text>
                )}
            />
        </View>
    )
}

export default BankScroll

const styles = StyleSheet.create({})
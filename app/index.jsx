// app/index.js
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, Image, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import images from '@/constants/images';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

export default function Index() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem("userToken");
                const userData = await AsyncStorage.getItem("userData");
                // console.log('token userData', token, userData);
                if (token && userData) {
                    const user = JSON.parse(userData);
                    const userType = user?.user_type?.toLowerCase();

                    if (userType === "user") {
                        // console.log('1');
                        router.replace("/mapview");
                    } else if (userType === "broker" || userType === "bankagent") {
                        // console.log('2');
                        router.replace("/(root)/(tabs)/home");
                    } else {
                        // console.log('3');
                        router.replace("/(auth)/signin");
                    }
                } else {
                    // console.log('4');
                    router.replace("/(auth)/signin");
                }
            } catch (err) {
                console.error("Auth check failed:", err);
                router.replace("/(auth)/signin");
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <Image
                    source={images.applogo}
                    style={styles.applogo}
                    resizeMode="cover"
                />
                <ActivityIndicator size="large" color="#8bc83f" />
                <Text className="mt-3">Assets are loading...</Text>
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    applogo: { width: scale(100), height: scale(100), borderRadius: moderateScale(100), marginTop: 10, },
})
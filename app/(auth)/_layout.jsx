import { Stack, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthLayout = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const [userType, setUserType] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                const userData = await AsyncStorage.getItem('userData');
                const parsedUserData = userData ? JSON.parse(userData) : null;

                if (token && parsedUserData?.id) {
                    setIsAuthenticated(true);
                    setUserType(parsedUserData?.user_type?.toLowerCase());
                } else {
                    setIsAuthenticated(false);
                    setUserType(null);
                }
            } catch (err) {
                console.error('Auth check failed:', err);
                setIsAuthenticated(false);
                setUserType(null);
            }
        };

        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        return null; // Wait for auth check
    }

    if (isAuthenticated) {
        if (userType === 'user') {
            return <Redirect href="/mapview" />;
        } else if (userType === 'broker' || userType === 'bankagent') {
            return <Redirect href="/(root)/(tabs)/home" />;
        }
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
            }}
        >
            <Stack.Screen name="signin" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
        </Stack>
    );
};

export default AuthLayout;
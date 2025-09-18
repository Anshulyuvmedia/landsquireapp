import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useRootNavigation } from 'expo-router';
import { UserProvider } from '../context/UserContext';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../constants/i18n';
import './globals.css';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';

export default function RootLayout() {
    const [fontsLoaded, error] = useFonts({
        'NotoSerifDevanagari': require('../assets/fonts/NotoSerifDevanagari-Regular.ttf'),
        'Rubik-Bold': require('../assets/fonts/Rubik-Bold.ttf'),
        'Rubik-ExtraBold': require('../assets/fonts/Rubik-ExtraBold.ttf'),
        'Rubik-Medium': require('../assets/fonts/Rubik-Medium.ttf'),
        'Rubik-Light': require('../assets/fonts/Rubik-Light.ttf'),
        'Rubik-Regular': require('../assets/fonts/Rubik-Regular.ttf'),
        'Rubik-SemiBold': require('../assets/fonts/Rubik-SemiBold.ttf'),
    });

    const [appIsReady, setAppIsReady] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(null);
    const router = useRouter();
    const rootNavigation = useRootNavigation();

    useEffect(() => {
        const checkAuthSession = async () => {
            try {
                await SplashScreen.preventAutoHideAsync();

                if (fontsLoaded || error) {
                    if (error) {
                        console.error('Font loading error:', error);
                    }

                    const savedLanguage = await AsyncStorage.getItem('appLanguage');
                    if (savedLanguage) {
                        await i18n.changeLanguage(savedLanguage);
                    }

                    const token = await AsyncStorage.getItem('userToken');
                    const userData = await AsyncStorage.getItem('userData');
                    const parsedUserData = userData ? JSON.parse(userData) : null;

                    if (!token || !parsedUserData?.id) {
                        await AsyncStorage.removeItem('userData');
                        await AsyncStorage.removeItem('userToken');
                        setIsAuthenticated(false);
                    } else {
                        setIsAuthenticated(true);
                    }
                }
            } catch (error) {
                console.error('Error during authentication check:', error);
                setIsAuthenticated(false);
            } finally {
                setAppIsReady(true);
                await SplashScreen.hideAsync();
            }
        };

        checkAuthSession();
    }, [fontsLoaded, error]);

    useEffect(() => {
        if (appIsReady && isAuthenticated !== null && rootNavigation?.isReady()) {
            if (isAuthenticated) {
                router.replace('/(root)/(tabs)/home');
            } else {
                router.replace('/(auth)/signin');
            }
        }
        SystemUI.setBackgroundColorAsync('#fafafa');
    }, [appIsReady, isAuthenticated, rootNavigation]);

    if (!appIsReady) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <StatusBar style='dark' />
                <UserProvider>
                    <SafeAreaView style={{ flex: 1 }}>
                        <Stack screenOptions={{ headerShown: false }} />
                    </SafeAreaView>
                </UserProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
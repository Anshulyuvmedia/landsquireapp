// app/_layout.js
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Slot, useRouter, useRootNavigation } from 'expo-router';
import { UserProvider } from '../context/UserContext';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../constants/i18n';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import './globals.css';

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
                // console.log('RootLayout: Starting auth check');
                await SplashScreen.preventAutoHideAsync();

                if (fontsLoaded || error) {
                    if (error) {
                        console.error('RootLayout: Font loading error:', error);
                    }

                    const savedLanguage = await AsyncStorage.getItem('appLanguage');
                    if (savedLanguage) {
                        // console.log('RootLayout: Setting language:', savedLanguage);
                        await i18n.changeLanguage(savedLanguage);
                    }

                    const token = await AsyncStorage.getItem('userToken');
                    const userData = await AsyncStorage.getItem('userData');
                    const parsedUserData = userData ? JSON.parse(userData) : null;

                    if (!token || !parsedUserData?.id) {
                        // console.log('RootLayout: No token or user ID, clearing storage');
                        await AsyncStorage.removeItem('userData');
                        await AsyncStorage.removeItem('userToken');
                        setIsAuthenticated(false);
                    } else {
                        // console.log('RootLayout: User authenticated');
                        setIsAuthenticated(true);
                    }
                }
            } catch (error) {
                console.error('RootLayout: Error during auth check:', error);
                setIsAuthenticated(false);
            } finally {
                // console.log('RootLayout: App is ready');
                setAppIsReady(true);
                await SplashScreen.hideAsync();
            }
        };
        SystemUI.setBackgroundColorAsync('#fafafa');

        checkAuthSession();
    }, [fontsLoaded, error]);

    // useEffect(() => {
        // if (appIsReady && isAuthenticated !== null && rootNavigation?.isReady()) {
        //     // console.log('RootLayout: Navigation ready, navigating to:', isAuthenticated ? '/(root)/(tabs)/home' : '/(auth)/signin');
        //     router.replace(isAuthenticated ? '/(root)/(tabs)/mapview' : '/(auth)/signin');
        // } else {
        //     // console.log('RootLayout: Navigation not ready or app not initialized');
        // }
    // }, [appIsReady, isAuthenticated, rootNavigation]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <StatusBar style="dark" />
                <UserProvider>
                    <SafeAreaView style={{ flex: 1 }}>
                        <Slot />
                    </SafeAreaView>
                </UserProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
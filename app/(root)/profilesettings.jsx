// app/(root)/(tabs)/settings.js
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Switch, RefreshControl } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import images from '@/constants/images';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/context/UserContext';

const ProfileSettings = () => {
    const [userData, setUserData] = useState(null);
    const [fetchLoading, setFetchLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();
    const navigation = useNavigation();
    const [image, setImage] = useState(images.avatar);
    const { t, i18n } = useTranslation();
    const { userType, userData: contextUserData, loading: contextLoading } = useUser();


    const handleLogout = () => {
        AsyncStorage.clear()
            .then(() => {
                // console.log('Dashboard: Navigating to /signin');
                // Alert.alert(t('logout'), t('logoutMessage'));
                router.replace('/signin');
            })
            .catch((error) => {
                console.error('Dashboard: Error during logout:', error);
            });
    };


    const handleNavigate = (path) => {
        // console.log(`Dashboard: Navigating to ${path}`);
        navigation.navigate(path);
    };

    const handleBack = () => {
        if (navigation.canGoBack()) {
            // console.log('Dashboard: Navigating back');
            navigation.goBack();
        } else {
            // console.log('Dashboard: Cannot go back, navigating to home');
            router.navigate('/(root)/(tabs)/home');
        }
    };

    const changeLanguage = async (lang) => {
        try {
            await i18n.changeLanguage(lang);
            await AsyncStorage.setItem('appLanguage', lang);
        } catch (error) {
            console.error('Error changing language:', error);
        }
    };

    // useEffect(() => {
    //   console.log('Dashboard: Navigation state:', navigation.getState());
    // }, [navigation]);

    React.useLayoutEffect(() => {
        if (userData?.name) {
            router.setParams?.({ title: userData.name + "'s " + t('dashboard') });
        } else {
            router.setParams?.({ title: t('dashboard') });
        }
    }, [userData?.name, t]);

    const links = [
        { path: '/privacypolicy', label: 'Privacy Policy', icon: 'policy' },
        { path: '/termsandconditions', label: 'Terms and Conditions', icon: 'description' },
        { path: '/userandagentagreement', label: 'User and Agent Agreement', icon: 'handshake' },
        { path: '/cookiespolicy', label: 'Cookies Policy', icon: 'cookie' },
        { path: '/contentandlistingguidelines', label: 'Content and Listing Guidelines', icon: 'list' },
        { path: '/dataretentionanddeletionpolicy', label: 'Data Retention and Deletion Policy', icon: 'delete' },
    ];

    const MenuItem = ({ icon, title, onPress, textColor = '#4B5563' }) => (
        <TouchableOpacity
            onPress={onPress}
            className="flex-row justify-between items-center py-4 px-3 bg-white rounded-lg mb-1.5 shadow-sm"
            activeOpacity={0.7}
        >
            <View className="flex-row flex-1">
                <MaterialIcons name={icon} size={moderateScale(18, 0.3)} color={textColor} />
                <Text
                    className={`ml-2.5 text-lg ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} ${textColor === '#4B5563' ? 'text-primary-300' : 'text-danger'}`}
                >
                    {title}
                </Text>
            </View>
            <MaterialIcons name="chevron-right" size={moderateScale(25, 0.3)} color={textColor} />
        </TouchableOpacity>
    );

    if (contextLoading || fetchLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' }}>
                <ActivityIndicator size="large" color="#234F68" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#fafafa]">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: verticalScale(60), paddingHorizontal: scale(12) }}
            >
                <View>
                    <View className="flex-row items-center justify-between my-3">
                        <Text
                            className={`text-xl ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-bold' : 'font-rubik-bold'} text-primary-300`}
                        >
                            {t('Settings')}
                        </Text>
                        <TouchableOpacity
                            onPress={handleBack}
                            className="bg-primary-200 rounded-full p-3"
                            activeOpacity={0.7}
                        >
                            <MaterialIcons name="arrow-back" size={moderateScale(20, 0.3)} color="#4B5563" />
                        </TouchableOpacity>
                    </View>


                    <View className="mb-3">
                        <View className="flex-row items-center justify-between py-2.5 px-3 bg-white rounded-lg mb-1.5 shadow-sm">
                            <View className="flex-row items-center">
                                <MaterialIcons name="language" size={moderateScale(18, 0.3)} color="#234F68" />
                                <Text
                                    className={`ml-2.5 text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'}`}
                                >
                                    {t('changeLanguage')}
                                </Text>
                            </View>
                            <View className="flex-row items-center">
                                <Text
                                    className={`mr-2 text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} ${i18n.language === 'en' ? 'text-primary-300' : 'text-black-300'}`}
                                >
                                    EN
                                </Text>
                                <Switch
                                    value={i18n.language === 'hi'}
                                    onValueChange={(value) => changeLanguage(value ? 'hi' : 'en')}
                                    trackColor={{ false: '#234F681A', true: '#234F68' }}
                                    thumbColor="#FFFFFF"
                                    ios_backgroundColor="#234F681A"
                                />
                                <Text
                                    className={`ml-2 text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} ${i18n.language === 'hi' ? 'text-primary-300' : 'text-black-300'}`}
                                >
                                    HI
                                </Text>
                            </View>
                        </View>
                    </View>
                    <MenuItem
                        icon="settings-suggest"
                        title={t('editProfile')}
                        onPress={() => handleNavigate('editprofile')}
                    />
                    <View className="mb-3">
                        <MenuItem
                            icon="logout"
                            title={t('logout')}
                            onPress={handleLogout}
                            textColor="#F75555"
                        />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

export default ProfileSettings;
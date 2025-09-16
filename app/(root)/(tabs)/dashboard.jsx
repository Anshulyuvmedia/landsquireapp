import { View, Text, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator, Switch, RefreshControl } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import images from '@/constants/images';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const [image, setImage] = useState(images.avatar);
  const { t, i18n } = useTranslation();

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (!storedUserData) {
        await AsyncStorage.removeItem('userData');
        router.push('/signin');
        return;
      }

      const parsedUserData = JSON.parse(storedUserData);
      if (!parsedUserData || !parsedUserData.id) {
        await AsyncStorage.removeItem('userData');
        router.push('/signin');
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      // console.log('token: ',token);
      const response = await axios.get(`https://landsquire.in/api/userprofile?id=${parsedUserData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.data) {
        const apiData = response.data.data;
        setUserData(apiData);
        setImage(
          apiData.profile
            ? apiData.profile.startsWith('http')
              ? apiData.profile
              : `https://landsquire.in/adminAssets/images/Users/${apiData.profile}`
            : images.avatar
        );
      } else {
        console.error('Unexpected API response format:', response.data);
        setImage(images.avatar);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        router.push('/signin');
      }
      setImage(images.avatar);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert(t('logout'), t('logoutMessage'));
      router.push('/signin');
    } catch (error) {
      console.error('Error during logout:', error);
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
      className="flex-row items-center py-4 px-3 bg-white rounded-lg mb-1.5 shadow-sm"
      activeOpacity={0.7}
    >
      <MaterialIcons name={icon} size={moderateScale(18, 0.3)} color={textColor} />
      <Text
        className={`ml-2.5 text-lg ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} ${textColor === '#000' ? 'text-danger' : textColor === '#234F68' ? 'text-primary-300' : 'text-black-300'}`}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-primary-100">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: verticalScale(60), paddingHorizontal: scale(12) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#234F68']}
            tintColor="#234F68"
          />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator
            size="large"
            color="#234F68"
            style={{ marginTop: verticalScale(150) }}
          />
        ) : (
          <View>
            {/* Header */}
            <View className="flex-row items-center justify-between my-3">
              <Text
                className={`text-xl ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-bold' : 'font-rubik-bold'} text-primary-300`}
              >
                {t('dashboard')}
              </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-primary-200 rounded-full p-1.5"
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={moderateScale(20, 0.3)} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* User Profile Card */}
            <View className="bg-white rounded-lg p-3 mb-3 shadow-sm">
              <View className="flex-row items-center">
                <Image
                  source={typeof image === 'string' ? { uri: image } : image}
                  className="w-12 h-12 rounded-full border-1.5 border-primary-200"
                />
                <View className="ml-3 flex-1">
                  <Text
                    className={`text-xl ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-bold' : 'font-rubik-bold'} text-black-300 capitalize`}
                  >
                    {userData?.username || 'User'}
                  </Text>
                  <Text
                    className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} text-black-300 `}
                  >
                    {t('email')}: {userData?.email || 'N/A'}
                  </Text>
                  <View className="flex-row justify-between items-end mt-0.75">
                    <View>
                      <Text
                        className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} text-black-300 capitalize`}
                      >
                        {t('mobile')}: {userData?.mobilenumber || 'N/A'}
                      </Text>
                      <Text
                        className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} text-black-300 capitalize`}
                      >
                        {t('role')}: {userData?.user_type
                          ? (userData.user_type === 'bankagent'
                            ? 'Bank Agent'
                            : userData.user_type.charAt(0).toUpperCase() + userData.user_type.slice(1))
                          : 'N/A'}

                      </Text>
                      <Text
                        className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} text-black-300 capitalize`}
                      >
                        {t('city')}: {userData?.city || 'N/A'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => router.push('/dashboard/editprofile')}
                      className="bg-primary-200 px-3 py-1.5 rounded-md"
                    >
                      <Text
                        className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-medium' : 'font-rubik-medium'} text-primary-300`}
                      >
                        {t('editProfile')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Settings Section */}
            <View className="mb-3">
              {userData?.user_type != 'user' && (
                <MenuItem
                  icon="support-agent"
                  title='CRM'
                  onPress={() => router.push('/CRM/crmportal')}
                />
              )}

              <MenuItem
                icon="notifications-none"
                title={t('notifications')}
                onPress={() => router.push('/notifications')}
              />
              {userData?.user_type != 'bankagent' && (
                <MenuItem
                  icon="attach-money"
                  title={t('applyforloan')}
                  onPress={() => router.push('/loanenquiry')}
                />
              )}
              {/* {userData?.user_type != 'bankagent' && (
                <MenuItem
                  icon="house-siding"
                  title={t('myProperties')}
                  onPress={() => router.push('/myassets/myproperties')}
                />
              )} */}
              {userData?.user_type != 'bankagent' && (
                <MenuItem
                  icon="house-siding"
                  title="Rented Property"
                  onPress={() => router.push('/Rent/rentscreen')}
                />
              )}

              {userData?.user_type == 'bankagent' && (
                <MenuItem
                  icon="checklist-rtl"
                  title={t('Loan Leads')}
                  onPress={() => router.push('/dashboard/loanleads')}
                />
              )}


              {/* Language Toggle */}
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

            {/* Logout Section */}
            <View className="mb-3">
              <MenuItem
                icon="logout"
                title={t('logout')}
                onPress={handleLogout}
                textColor="#F75555"
              />
            </View>

            {/* Policies Section (Commented Out) */}
            {/* <View className="bg-white rounded-lg p-3 shadow-sm">
              <Text
                className={`text-base ${i18n.language === 'hi' ? 'font-noto-serif-devanagari-bold' : 'font-rubik-bold'} text-black-300 mb-2 px-1.5`}
              >
                {t('policies') || 'Policies'}
              </Text>
              {links.map(({ path, label, icon }, index) => (
                <MenuItem
                  key={index}
                  icon={icon}
                  title={label}
                  onPress={() => router.push(path)}
                  textColor="#4B5563"
                />
              ))}
            </View> */}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default Dashboard;
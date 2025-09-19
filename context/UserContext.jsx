// context/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userType, setUserType] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                console.log('UserContext: Fetching user data');
                const storedUserData = await AsyncStorage.getItem('userData');
                const parsedUserData = storedUserData ? JSON.parse(storedUserData) : null;

                if (!parsedUserData || !parsedUserData.id) {
                    console.log('UserContext: No valid user data');
                    setUserType(null);
                    setUserData(null);
                    setLoading(false);
                    return;
                }

                const token = await AsyncStorage.getItem('userToken');
                const response = await axios.get(`https://landsquire.in/api/userprofile?id=${parsedUserData.id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.data && response.data.data) {
                    const apiData = response.data.data;
                    setUserType(apiData.user_type || null);
                    setUserData(apiData);
                    console.log('UserContext: User data fetched and cached');
                } else {
                    console.log('UserContext: Unexpected API response format');
                    setUserType(null);
                    setUserData(null);
                }
            } catch (error) {
                console.error('UserContext: Error fetching user data:', error);
                setUserType(null);
                setUserData(null);
            } finally {
                console.log('UserContext: Setting loading to false');
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    return (
        <UserContext.Provider value={{ userType, userData, loading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
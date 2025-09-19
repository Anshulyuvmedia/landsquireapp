// context/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userType, setUserType] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserData = async () => {
        try {
            const storedUserData = await AsyncStorage.getItem('userData');
            const parsedUserData = storedUserData ? JSON.parse(storedUserData) : null;

            if (!parsedUserData || !parsedUserData.id) {
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
            } else {
                setUserType(null);
                setUserData(null);
            }
        } catch (error) {
            console.error('UserContext: Error fetching user data:', error);
            setUserType(null);
            setUserData(null);
        } finally {
            setLoading(false);
        }
    };

    const updateUser = async (user, token) => {
        try {
            await AsyncStorage.setItem('userToken', token);
            await AsyncStorage.setItem('userData', JSON.stringify(user));
            setUserType(user.user_type || null);
            setUserData(user);
        } catch (e) {
            console.error("updateUser error:", e);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    return (
        <UserContext.Provider value={{ userType, userData, loading, fetchUserData, updateUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
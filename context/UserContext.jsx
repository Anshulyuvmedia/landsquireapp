import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [userType, setUserType] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userData = await AsyncStorage.getItem('userData');
                // console.log('Raw userData at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), ':', userData);
                const parsedPropertyData = userData ? JSON.parse(userData) : null;
                if (!parsedPropertyData?.id) {
                    console.error('User data or ID missing at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
                    setUserType(null);
                } else {
                    const newUserType = parsedPropertyData.user_type || null;
                    console.log('userType', newUserType);
                    setUserType(newUserType);
                }
            } catch (error) {
                console.error('Error fetching user data at', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), error);
                setUserType(null);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    return (
        <UserContext.Provider value={{ userType, loading }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
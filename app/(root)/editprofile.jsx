import {
    StyleSheet,
    Text,
    View,
    Image,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import images from '@/constants/images';
import icons from '@/constants/icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router, useNavigation } from 'expo-router';
import axios from 'axios';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RBSheet from 'react-native-raw-bottom-sheet';
import { Ionicons, Octicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getUUIDSync } from '@/utils/uuid';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Constants from 'expo-constants';
import { useUser } from '@/context/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Utility functions for image and document handling
const parseProfileImage = (profile) => {
    if (typeof profile === 'number') {
        profile = String(profile);
    }
    if (profile && profile !== 'null' && profile !== 'undefined') {
        return profile.startsWith('http')
            ? profile
            : `https://landsquire.in/adminAssets/images/Users/${profile}`;
    }
    return images.avatar;
};

const parseCompanyDocs = (companyDoc) => {
    if (typeof companyDoc === 'string' && companyDoc.trim()) {
        return [{ uri: companyDoc, name: companyDoc }];
    } else if (Array.isArray(companyDoc)) {
        return companyDoc
            .map((doc) => (typeof doc === 'string' ? { uri: doc, name: doc } : doc))
            .filter((doc) => doc.uri && doc.name);
    }
    return [];
};

// Error Boundary
class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    resetError = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'red', fontSize: 18 }}>Error: {this.state.error?.message}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={this.resetError}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const EditProfile = () => {
    const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY || '';
    const [image, setImage] = useState(null);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [bankName, setBankName] = useState('');
    const [usertype, setUsertype] = useState('');
    const [companyDocs, setCompanyDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState(null);
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [sheetMessage, setSheetMessage] = useState({ type: '', title: '', message: '' });
    const [suggestions, setSuggestions] = useState([]);
    const [message, setMessage] = useState({ type: '', title: '', text: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [sessionToken, setSessionToken] = useState('');

    const sheetRef = useRef();
    const { loading: contextLoading, userData: contextUserData, updateUser } = useUser();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    // Initialize sessionToken
    useEffect(() => {
        try {
            setSessionToken(getUUIDSync());
        } catch (error) {
            console.error('EditProfile: Failed to generate UUID:', error);
            setSheetMessage({ type: 'error', title: 'Error', message: 'Failed to initialize session.' });
            sheetRef.current?.open();
        }
    }, []);

    // Fetch and initialize profile data
    useEffect(() => {
        const initializeProfile = async () => {
            if (contextLoading) return;

            try {
                setLoading(true);

                if (contextUserData) {
                    setUserId(contextUserData.id || null);
                    setUsername(contextUserData.username || '');
                    setUsertype(contextUserData.user_type || '');
                    setEmail(contextUserData.email || '');
                    setSearchTerm(contextUserData.city || '');
                    setCity(contextUserData.city || '');
                    setState(contextUserData.state || '');
                    setPhoneNumber(contextUserData.mobilenumber || '');
                    setCompanyName(contextUserData.company_name || '');
                    setBankName(contextUserData.bankname || '');
                    setImage(parseProfileImage(contextUserData.profile));
                    setCompanyDocs(parseCompanyDocs(contextUserData.company_document));
                    return;
                }

                const userData = await AsyncStorage.getItem('userData');
                const parsedUserData = userData ? JSON.parse(userData) : null;
                if (!parsedUserData?.id) {
                    setSheetMessage({ type: 'error', title: 'Error', message: 'No valid user data found.' });
                    sheetRef.current?.open();
                    return;
                }

                const token = await AsyncStorage.getItem('userToken');
                if (!token) {
                    setSheetMessage({ type: 'error', title: 'Error', message: 'Authentication token not found.' });
                    sheetRef.current?.open();
                    return;
                }

                const response = await axios.get(`https://landsquire.in/api/userprofile?id=${parsedUserData.id}`, {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                });

                const data = response.data.data || {};
                setUserId(data.id || null);
                setUsername(data.username || '');
                setUsertype(data.user_type || '');
                setEmail(data.email || '');
                setSearchTerm(data.city || '');
                setCity(data.city || '');
                setState(data.state || '');
                setPhoneNumber(data.mobilenumber || '');
                setCompanyName(data.company_name || '');
                setBankName(data.bankname || '');
                setImage(parseProfileImage(data.profile));
                setCompanyDocs(parseCompanyDocs(data.company_document));
            } catch (error) {
                console.error('EditProfile: initializeProfile error:', error);
                setSheetMessage({ type: 'error', title: 'Error', message: error.message || 'Failed to fetch profile data.' });
                sheetRef.current?.open();
            } finally {
                setLoading(false);
            }
        };

        initializeProfile();
    }, [contextLoading, contextUserData]);

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                setSheetMessage({ type: 'error', title: 'Permission Denied', message: 'Please grant access to photos.' });
                sheetRef.current?.open();
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                setImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('EditProfile: pickImage error:', error);
            setSheetMessage({ type: 'error', title: 'Error', message: 'Failed to pick image.' });
            sheetRef.current?.open();
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled) return;

            const { mimeType, uri, name } = result.assets[0];
            if (!['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'].includes(mimeType)) {
                setSheetMessage({ type: 'error', title: 'Invalid File', message: 'Please select PDF or image (PNG/JPG/JPEG).' });
                sheetRef.current?.open();
                return;
            }

            setCompanyDocs([{ uri, name, mimeType }]);
            setSheetMessage({ type: 'success', title: 'File Added', message: `${name} added successfully.` });
            sheetRef.current?.open();
        } catch (error) {
            console.error('EditProfile: pickDocument error:', error);
            setSheetMessage({ type: 'error', title: 'Error', message: 'Failed to pick document.' });
            sheetRef.current?.open();
        }
    };

    const openFileInBrowser = async (fileName) => {
        try {
            if (!fileName || typeof fileName !== 'string') {
                setSheetMessage({ type: 'error', title: 'Error', message: 'Invalid file.' });
                sheetRef.current?.open();
                return;
            }
            const fileUrl = `https://landsquire.in/adminAssets/images/Users/${fileName}`;
            await Linking.openURL(fileUrl);
        } catch (error) {
            console.error('EditProfile: openFileInBrowser error:', error);
            setSheetMessage({ type: 'error', title: 'Error', message: 'Could not open file.' });
            sheetRef.current?.open();
        }
    };

    const validateInputs = () => {
        if (!username.trim()) {
            setSheetMessage({ type: 'error', title: 'Validation Error', message: 'Username is required.' });
            sheetRef.current?.open();
            return false;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setSheetMessage({ type: 'error', title: 'Validation Error', message: 'Valid email is required.' });
            sheetRef.current?.open();
            return false;
        }
        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
            setSheetMessage({ type: 'error', title: 'Validation Error', message: 'Valid 10-digit phone number is required.' });
            sheetRef.current?.open();
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateInputs()) return;

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            if (!token || !userId) {
                throw new Error('Missing token or user ID.');
            }

            const formData = new FormData();
            formData.append('name', username);
            formData.append('email', email);
            formData.append('mobile', phoneNumber);
            formData.append('city', city);
            formData.append('state', state);
            formData.append('company_name', companyName || '');
            formData.append('bankname', bankName || '');

            if (image && image.startsWith('file://')) {
                formData.append('myprofileimage', { uri: image, name: 'profile.jpg', type: 'image/jpeg' });
            }

            if (companyDocs.length > 0) {
                const doc = companyDocs[0];
                if (doc.uri && doc.uri.startsWith('file://')) {
                    formData.append('company_document', {
                        uri: doc.uri,
                        name: doc.name || 'document.pdf',
                        type: doc.mimeType || 'application/pdf',
                    });
                }
            }

            const response = await axios.post(`https://landsquire.in/api/updateuserprofile/${userId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            if (response.data.success) {
                const updatedUser = response.data.data || {};
                await updateUser(updatedUser, token); // Assumes updateUser is provided by UserContext

                setUsername(updatedUser.username || '');
                setEmail(updatedUser.email || '');
                setPhoneNumber(updatedUser.mobilenumber || '');
                setCity(updatedUser.city || '');
                setState(updatedUser.state || '');
                setCompanyName(updatedUser.company_name || '');
                setBankName(updatedUser.bankname || '');
                setUsertype(updatedUser.user_type || '');
                setImage(parseProfileImage(updatedUser.profile));
                setCompanyDocs(parseCompanyDocs(updatedUser.company_document));

                setSheetMessage({ type: 'success', title: 'Success', message: 'Profile updated!' });
                sheetRef.current?.open();
            } else {
                throw new Error(response.data.message || 'Server error.');
            }
        } catch (error) {
            console.error('EditProfile: handleSubmit error:', error);
            setSheetMessage({ type: 'error', title: 'Update Failed', message: error.message || 'Try again later.' });
            sheetRef.current?.open();
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = useCallback((text) => {
        setSearchTerm(text);
        setCity(text);
        if (text.length > 2) {
            fetchSuggestions(text);
        } else {
            setSuggestions([]);
        }
    }, [sessionToken]);

    const fetchSuggestions = async (input) => {
        if (!GOOGLE_MAPS_API_KEY) {
            setMessage({ type: 'error', title: 'Error', text: 'Google Maps API key is missing.' });
            return;
        }

        try {
            const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
                params: {
                    input,
                    components: 'country:IN',
                    types: '(cities)',
                    key: GOOGLE_MAPS_API_KEY,
                    sessiontoken: sessionToken,
                },
            });

            if (response.data.status === 'OK') {
                setSuggestions(response.data.predictions || []);
            } else {
                setSuggestions([]);
                setMessage({ type: 'error', title: 'Error', text: response.data.error_message || 'Failed to fetch suggestions.' });
            }
        } catch (error) {
            console.error('EditProfile: fetchSuggestions error:', error);
            setSuggestions([]);
            setMessage({ type: 'error', title: 'Error', text: 'Search failed.' });
        }
    };

    const handleSelect = async (placeId) => {
        if (!GOOGLE_MAPS_API_KEY) {
            setMessage({ type: 'error', title: 'Error', text: 'Google Maps API key is missing.' });
            return;
        }

        try {
            const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
                params: {
                    place_id: placeId,
                    fields: 'address_components,formatted_address',
                    key: GOOGLE_MAPS_API_KEY,
                    sessiontoken: sessionToken,
                },
            });

            if (response.data.status === 'OK') {
                const components = response.data.result.address_components || [];
                let selectedCity = '';
                let selectedState = '';

                components.forEach((comp) => {
                    if (comp.types.includes('locality') || comp.types.includes('sublocality')) {
                        selectedCity = comp.long_name;
                    }
                    if (comp.types.includes('administrative_area_level_1')) {
                        selectedState = comp.long_name;
                    }
                });

                if (selectedCity && selectedState) {
                    setCity(selectedCity);
                    setState(selectedState);
                    setSearchTerm(selectedCity);
                    setSuggestions([]);
                    setSessionToken(getUUIDSync());
                } else {
                    setMessage({ type: 'error', title: 'Error', text: 'Could not extract city/state.' });
                }
            } else {
                setMessage({ type: 'error', title: 'Error', text: response.data.error_message || 'Failed to fetch details.' });
            }
        } catch (error) {
            console.error('EditProfile: handleSelect error:', error);
            setMessage({ type: 'error', title: 'Error', text: 'Selection failed.' });
        }
    };

    const handleBack = () => {
        try {
            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                router.navigate('/(root)/(tabs)/settings');
            }
        } catch (error) {
            console.error('EditProfile: handleBack error:', error);
            setSheetMessage({ type: 'error', title: 'Navigation Error', message: 'Failed to go back.' });
            sheetRef.current?.open();
        }
    };

    const getDataArray = () => {
        const baseData = [
            { type: 'profileImage', id: 'profileImage' },
            { type: 'input', id: 'username' },
            { type: 'input', id: 'email' },
            { type: 'input', id: 'phoneNumber' },
            { type: 'input', id: 'city' },
            { type: 'message', id: 'message' },
            { type: 'suggestions', id: 'suggestions' },
            { type: 'input', id: 'state' },
        ];

        if (usertype === 'bankagent') {
            baseData.push({ type: 'input', id: 'bankName' });
        } else if (usertype === 'broker') {
            baseData.push({ type: 'input', id: 'companyName' });
            baseData.push({ type: 'companyDocs', id: 'companyDocs' });
        }

        return baseData;
    };

    const renderItem = useCallback(
        ({ item }) => {
            switch (item.type) {
                case 'profileImage':
                    return (
                        <View style={styles.profileImageContainer}>
                            <Image source={image ? { uri: image } : images.avatar} style={styles.profileImage} resizeMode="cover" />
                            <TouchableOpacity onPress={pickImage} style={styles.editIconContainer}>
                                <Feather name="edit" size={24} color="#1F4C6B" style={styles.inputIcon} />
                            </TouchableOpacity>
                            <Text style={styles.usernameText} className="capitalize">{username || 'Unknown'}</Text>
                            <Text style={styles.roleText} className="capitalize">
                                {usertype === 'bankagent' ? 'Bank Agent' : usertype || 'User'}
                            </Text>
                        </View>
                    );
                case 'input':
                    if (item.id === 'username') {
                        return (
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor="#555"
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="Username"
                                />
                            </View>
                        );
                    } else if (item.id === 'email') {
                        return (
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#1F4C6B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor="#555"
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Email Address"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={false}
                                />
                                <Octicons name="lock" size={20} color="gray" style={styles.inputIcon} />
                            </View>
                        );
                    } else if (item.id === 'phoneNumber') {
                        return (
                            <View style={styles.inputContainer}>
                                <Octicons name="device-mobile" size={20} color="#1F4C6B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor="#555"
                                    value={phoneNumber}
                                    onChangeText={setPhoneNumber}
                                    placeholder="Phone Number"
                                    keyboardType="phone-pad"
                                    editable={false}
                                />
                                <Octicons name="lock" size={20} color="gray" style={styles.inputIcon} />
                            </View>
                        );
                    } else if (item.id === 'city') {
                        return (
                            <View style={styles.inputContainer}>
                                <Ionicons name="location-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor="#555"
                                    value={searchTerm}
                                    onChangeText={handleSearch}
                                    placeholder="City"
                                />
                            </View>
                        );
                    } else if (item.id === 'state') {
                        return (
                            <View style={styles.inputContainer}>
                                <Ionicons name="map-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor="#555"
                                    value={state}
                                    placeholder="State"
                                    editable={false}
                                />
                            </View>
                        );
                    } else if (item.id === 'bankName' && usertype === 'bankagent') {
                        return (
                            <View style={styles.inputContainer}>
                                <MaterialCommunityIcons name="bank-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor="#555"
                                    value={bankName}
                                    onChangeText={setBankName}
                                    placeholder="Bank Name"
                                />
                            </View>
                        );
                    } else if (item.id === 'companyName' && usertype === 'broker') {
                        return (
                            <View style={styles.inputContainer}>
                                <Ionicons name="business-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor="#555"
                                    value={companyName}
                                    onChangeText={setCompanyName}
                                    placeholder="Company Name"
                                />
                            </View>
                        );
                    }
                    return null;
                case 'suggestions':
                    return suggestions.length > 0 ? (
                        <FlatList
                            data={suggestions}
                            keyExtractor={(item) => item.place_id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelect(item.place_id)}>
                                    <Text style={styles.suggestionText}>{item.description}</Text>
                                </TouchableOpacity>
                            )}
                            style={styles.suggestionsList}
                            initialNumToRender={5}
                            windowSize={5}
                        />
                    ) : null;
                case 'companyDocs':
                    if (usertype === 'broker') {
                        return (
                            <>
                                <Text style={styles.label}>Company Document</Text>
                                {companyDocs.length > 0 ? (
                                    companyDocs.map((doc, index) => {
                                        const fileName = doc?.name || 'Unknown';
                                        const displayFileName = fileName.length > 15 ? `${fileName.substring(0, 15)}...` : fileName;
                                        const fileExtension = fileName.split('.').pop() || '';
                                        return (
                                            <View key={index} style={styles.docContainer}>
                                                <Image
                                                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/337/337946.png' }}
                                                    style={styles.docThumbnail}
                                                    resizeMode="contain"
                                                />
                                                <Text style={styles.docText}>{displayFileName}.{fileExtension}</Text>
                                                <TouchableOpacity
                                                    onPress={() => openFileInBrowser(doc?.name)}
                                                    style={styles.viewDocButton}
                                                >
                                                    <Text style={styles.viewDocText}>View</Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })
                                ) : (
                                    <Text style={styles.noDocText}>No document available</Text>
                                )}
                                <TouchableOpacity onPress={pickDocument} style={styles.uploadButton}>
                                    <Text style={styles.uploadText}>Change Company Document</Text>
                                </TouchableOpacity>
                            </>
                        );
                    }
                    return null;
                case 'message':
                    return message.text ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{message.title}: {message.text}</Text>
                        </View>
                    ) : null;
                default:
                    return null;
            }
        },
        [image, username, usertype, email, phoneNumber, searchTerm, state, bankName, companyName, companyDocs, suggestions, message]
    );

    if (contextLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' }}>
                <ActivityIndicator size="large" color="#1F4C6B" />
            </View>
        );
    }

    return (
        <ErrorBoundary>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Image source={icons.backArrow} style={styles.backIcon} resizeMode="contain" />
                    </TouchableOpacity>
                    <Text style={styles.headerText} className="capitalize">
                        Edit {usertype === 'bankagent' ? 'Bank Agent' : usertype || 'User'} Profile
                    </Text>
                    <View style={styles.placeholder} />
                </View>

                <RBSheet
                    ref={sheetRef}
                    closeOnDragDown
                    closeOnPressMask
                    customStyles={{
                        container: {
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            padding: 20,
                            backgroundColor: sheetMessage.type === 'success' ? '#E6F3E6' : '#FFE6E6',
                            minHeight: 200,
                        },
                        draggableIcon: { backgroundColor: '#1F4C6B' },
                    }}
                >
                    <View style={[styles.sheetContent, { marginBottom: insets.bottom }]}>
                        <Text style={[styles.sheetTitle, { color: sheetMessage.type === 'success' ? 'green' : 'red' }]}>
                            {sheetMessage.title}
                        </Text>
                        <Text style={styles.sheetMessage}>{sheetMessage.message}</Text>
                        <TouchableOpacity
                            style={[styles.sheetButton, { backgroundColor: sheetMessage.type === 'success' ? '#8BC83F' : '#FF4444' }]}
                            onPress={() => sheetRef.current?.close()}
                        >
                            <Text style={styles.sheetButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </RBSheet>

                {loading ? (
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <ActivityIndicator size="large" color="#1F4C6B" />
                        <Text style={{ marginTop: 10, fontFamily: 'Rubik-Regular' }}>Loading...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={getDataArray()}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.scrollContainer}
                        initialNumToRender={10}
                        windowSize={5}
                        ListFooterComponent={
                            <View style={styles.footerContainer}>
                                <TouchableOpacity onPress={handleSubmit} style={styles.submitButton} disabled={loading}>
                                    <Text style={styles.submitButtonText}>{loading ? 'Updating...' : 'Update Profile'}</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
            </View>
        </ErrorBoundary>
    );
};

export default EditProfile;

// Updated styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: moderateScale(16),
        paddingVertical: verticalScale(10),
    },
    backButton: {
        backgroundColor: '#e5e7eb',
        borderRadius: moderateScale(20),
        padding: moderateScale(8),
    },
    backIcon: {
        width: moderateScale(20),
        height: moderateScale(20),
    },
    headerText: {
        fontSize: scale(20),
        fontFamily: 'Rubik-Bold',
        color: '#1F4C6B',
    },
    placeholder: {
        width: moderateScale(40),
    },
    loadingIndicator: {
        marginTop: verticalScale(50),
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: moderateScale(16),
        paddingBottom: verticalScale(20),
    },
    profileImageContainer: {
        alignItems: 'center',
        marginVertical: verticalScale(20),
    },
    profileImage: {
        width: moderateScale(100),
        height: moderateScale(100),
        borderRadius: moderateScale(50),
        borderWidth: 2,
        borderColor: '#1F4C6B',
    },
    editIconContainer: {
        position: 'absolute',
        bottom: verticalScale(60),
        right: '35%',
        borderRadius: moderateScale(15),
        padding: moderateScale(5),
        backgroundColor: '#e5e7eb',
    },
    usernameText: {
        fontSize: scale(18),
        fontFamily: 'Rubik-Bold',
        color: '#1F4C6B',
        marginTop: verticalScale(10),
    },
    roleText: {
        fontSize: scale(16),
        fontFamily: 'Rubik-Regular',
        color: '#555',
        marginTop: verticalScale(5),
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: moderateScale(10),
        marginBottom: verticalScale(10),
        padding: moderateScale(10),
    },
    inputIcon: {
        marginHorizontal: moderateScale(10),
    },
    input: {
        flex: 1,
        height: verticalScale(45),
        paddingHorizontal: moderateScale(10),
        fontFamily: 'Rubik-Regular',
        color: '#333',
        fontSize: scale(14),
    },
    label: {
        fontSize: scale(16),
        fontFamily: 'Rubik-Medium',
        color: '#1F4C6B',
        marginVertical: verticalScale(5),
    },
    docContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: moderateScale(5),
        padding: moderateScale(10),
        marginBottom: verticalScale(10),
    },
    docThumbnail: {
        width: moderateScale(40),
        height: moderateScale(40),
        marginRight: moderateScale(10),
    },
    docText: {
        flex: 1,
        fontFamily: 'Rubik-Regular',
        color: '#333',
        fontSize: scale(14),
    },
    viewDocButton: {
        padding: moderateScale(5),
    },
    viewDocText: {
        color: '#1F4C6B',
        fontFamily: 'Rubik-Medium',
        fontSize: scale(14),
        textDecorationLine: 'underline',
    },
    noDocText: {
        fontFamily: 'Rubik-Regular',
        color: '#555',
        fontSize: scale(14),
        marginBottom: verticalScale(10),
    },
    uploadButton: {
        backgroundColor: '#e5e7eb',
        borderRadius: moderateScale(5),
        padding: moderateScale(10),
        alignItems: 'center',
        marginBottom: verticalScale(20),
    },
    uploadText: {
        color: '#1F4C6B',
        fontFamily: 'Rubik-Medium',
        fontSize: scale(14),
    },
    submitButton: {
        backgroundColor: '#8BC83F',
        borderRadius: moderateScale(10),
        paddingVertical: verticalScale(14),
        alignItems: 'center',
        marginVertical: verticalScale(20),
    },
    submitButtonText: {
        fontSize: scale(16),
        fontFamily: 'Rubik-Medium',
        color: 'white',
    },
    retryButton: {
        backgroundColor: '#1F4C6B',
        borderRadius: moderateScale(10),
        paddingVertical: verticalScale(10),
        paddingHorizontal: moderateScale(20),
        marginTop: verticalScale(10),
    },
    retryButtonText: {
        fontSize: scale(16),
        fontFamily: 'Rubik-Medium',
        color: 'white',
    },
    sheetContent: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    sheetTitle: {
        fontSize: scale(18),
        fontFamily: 'Rubik-Bold',
        marginBottom: verticalScale(10),
    },
    sheetMessage: {
        fontSize: scale(14),
        fontFamily: 'Rubik-Regular',
        color: '#333',
        textAlign: 'center',
        marginBottom: verticalScale(20),
    },
    sheetButton: {
        borderRadius: moderateScale(10),
        paddingVertical: verticalScale(10),
        paddingHorizontal: moderateScale(20),
    },
    sheetButtonText: {
        fontSize: scale(16),
        fontFamily: 'Rubik-Medium',
        color: 'white',
    },
    suggestionsList: {
        backgroundColor: '#f4f2f7',
        borderRadius: moderateScale(10),
        maxHeight: verticalScale(200),
        width: '100%',
        marginBottom: verticalScale(10),
    },
    suggestionItem: {
        padding: moderateScale(10),
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    suggestionText: {
        fontFamily: 'Rubik-Regular',
        color: '#555',
        fontSize: scale(12),
    },
    errorContainer: {
        backgroundColor: '#FEE2E2',
        padding: moderateScale(10),
        borderRadius: moderateScale(10),
        marginVertical: verticalScale(10),
    },
    errorText: {
        color: '#B91C1C',
        fontSize: scale(14),
        fontFamily: 'Rubik-Regular',
    },
    footerContainer: {
        paddingHorizontal: moderateScale(16),
    },
});
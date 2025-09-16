import { StyleSheet, Text, View, Image, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import images from '@/constants/images';
import icons from '@/constants/icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import axios from 'axios';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RBSheet from 'react-native-raw-bottom-sheet';
import { Ionicons, Octicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import Constants from 'expo-constants';
import { FlatList } from 'react-native'; // Import FlatList explicitly

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
    const [sessionToken, setSessionToken] = useState(uuidv4());
    const sheetRef = useRef();

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            const userData = await AsyncStorage.getItem('userData');
            const parsedUserData = userData ? JSON.parse(userData) : null;
            if (!parsedUserData || !parsedUserData.id) {
                await AsyncStorage.removeItem('userData');
                router.push('/signin');
                return;
            }
            const token = await AsyncStorage.getItem('userToken');

            const response = await axios.get(`https://landsquire.in/api/userprofile?id=${parsedUserData.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = response.data.data;

            setUserId(data.id);
            setUsername(data.username);
            setUsertype(data.user_type);
            setEmail(data.email);
            setSearchTerm(data.city || '');
            setCity(data.city || '');
            setState(data.state || '');
            setPhoneNumber(data.mobilenumber);
            setCompanyName(data.company_name || '');
            setBankName(data.bankname || '');
            setCompanyDocs(data.company_document ? [{ uri: data.company_document, name: data.company_document }] : []);

            let profileImage = data.profile;
            if (typeof profileImage === 'number') {
                profileImage = profileImage.toString();
            }

            if (typeof profileImage === 'string' && profileImage.trim() !== '' && profileImage !== 'null' && profileImage !== 'undefined') {
                profileImage = profileImage.startsWith('http')
                    ? profileImage
                    : `https://landsquire.in/adminAssets/images/Users/${profileImage}`;
            } else {
                profileImage = images.avatar;
            }

            setImage(profileImage);
        } catch (error) {
            console.error('Error fetching profile data:', error);
            setSheetMessage({
                type: 'error',
                title: 'Error',
                message: 'Failed to fetch profile data.',
            });
            sheetRef.current.open();
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
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
                setSheetMessage({
                    type: 'error',
                    title: 'Invalid File',
                    message: 'Please select a PDF or an image file (PNG, JPG, JPEG).',
                });
                sheetRef.current.open();
                return;
            }

            setCompanyDocs([{ uri, name, mimeType }]);

            setSheetMessage({
                type: 'success',
                title: 'File Added',
                message: `${name} has been successfully added.`,
            });
            sheetRef.current.open();
        } catch (error) {
            console.error('Document Picker Error:', error);
            setSheetMessage({
                type: 'error',
                title: 'Error',
                message: 'An error occurred while selecting a document.',
            });
            sheetRef.current.open();
        }
    };

    const openFileInBrowser = async (fileName) => {
        try {
            if (!fileName) {
                setSheetMessage({
                    type: 'error',
                    title: 'Error',
                    message: 'File not found.',
                });
                sheetRef.current.open();
                return;
            }

            const fileUrl = `https://landsquire.in/adminAssets/images/Users/${fileName}`;
            await Linking.openURL(fileUrl);
        } catch (error) {
            console.error('Error opening file:', error);
            setSheetMessage({
                type: 'error',
                title: 'Error',
                message: 'Could not open the file.',
            });
            sheetRef.current.open();
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const formData = new FormData();
            formData.append('name', username);
            formData.append('email', email);
            formData.append('mobile', phoneNumber);
            formData.append('city', city);
            formData.append('state', state);
            formData.append('company_name', companyName || '');
            formData.append('bankname', bankName || '');

            if (image && image.startsWith('file://')) {
                formData.append('myprofileimage', {
                    uri: image,
                    name: 'profile.jpg',
                    type: 'image/jpeg',
                });
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

            const response = await axios.post(
                `https://landsquire.in/api/updateuserprofile/${userId}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                }
            );

            if (response.data.success) {
                setSheetMessage({
                    type: 'success',
                    title: 'Success',
                    message: 'Profile updated successfully!',
                });
                sheetRef.current.open();
                await fetchProfileData();
            } else {
                throw new Error(response.data.message || 'Unexpected server response.');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setSheetMessage({
                type: 'error',
                title: 'Update Failed',
                message: error.response?.data?.message || 'Could not update profile. Try again later.',
            });
            sheetRef.current.open();
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearchTerm(text);
        setCity(text);
        if (text.length > 2) {
            fetchSuggestions(text);
        } else {
            setSuggestions([]);
        }
    };

    const fetchSuggestions = async (input) => {
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
                setSuggestions(response.data.predictions);
            } else {
                setSuggestions([]);
                setMessage({
                    type: 'error',
                    title: 'Error',
                    text: response.data.error_message || 'Failed to fetch suggestions.',
                });
            }
        } catch (error) {
            console.error('Fetch Suggestions Error:', error);
            setSuggestions([]);
            setMessage({
                type: 'error',
                title: 'Error',
                text: 'An unexpected error occurred during search.',
            });
        }
    };

    const handleSelect = async (placeId) => {
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
                const components = response.data.result.address_components;
                let selectedCity = '';
                let selectedState = '';

                components.forEach(comp => {
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
                    setSessionToken(uuidv4());
                } else {
                    setMessage({
                        type: 'error',
                        title: 'Error',
                        text: 'Could not extract city or state from selection.',
                    });
                }
            } else {
                setMessage({
                    type: 'error',
                    title: 'Error',
                    text: response.data.error_message || 'Failed to fetch place details.',
                });
            }
        } catch (error) {
            console.error('Handle Select Error:', error);
            setMessage({
                type: 'error',
                title: 'Error',
                text: 'An unexpected error occurred during selection.',
            });
        }
    };

    // Data structure for FlatList
    const renderItem = ({ item }) => {
        switch (item.type) {
            case 'profileImage':
                return (
                    <View style={styles.profileImageContainer}>
                        <Image
                            source={image ? { uri: image } : images.avatar}
                            style={styles.profileImage}
                            resizeMode="cover"
                        />
                        <TouchableOpacity onPress={pickImage} style={styles.editIconContainer}>
                            <Feather name="edit" size={24} color="#1F4C6B" style={styles.inputIcon} />
                        </TouchableOpacity>
                        <Text style={styles.usernameText} className="capitalize">{username}</Text>
                        <Text style={styles.roleText} className="capitalize">{usertype == 'bankagent' ? 'Bank Agent' : usertype}</Text>
                    </View>
                );
            case 'input':
                if (item.id === 'username') {
                    return (
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
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
                            <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={() => handleSelect(item.place_id)}
                            >
                                <Text style={styles.suggestionText}>{item.description}</Text>
                            </TouchableOpacity>
                        )}
                        style={styles.suggestionsList}
                    />
                ) : null;
            case 'companyDocs':
                if (usertype === 'broker') {
                    return (
                        <>
                            <Text style={styles.label}>Company Document</Text>
                            {companyDocs.length > 0 ? (
                                companyDocs.map((doc, index) => {
                                    const fileName = typeof doc === 'string' ? doc : doc.name;
                                    const displayFileName = fileName.length > 15 ? `${fileName.substring(0, 15)}...` : fileName;
                                    const fileExtension = fileName.split('.').pop();

                                    return (
                                        <View key={index} style={styles.docContainer}>
                                            <Image
                                                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/337/337946.png' }}
                                                style={styles.docThumbnail}
                                                resizeMode="contain"
                                            />
                                            <Text style={styles.docText}>{displayFileName}.{fileExtension}</Text>
                                            <TouchableOpacity
                                                onPress={() => openFileInBrowser(typeof doc === 'string' ? doc : doc.name)}
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
    };

    const data = [
        { type: 'profileImage', id: 'profileImage' },
        { type: 'input', id: 'username' },
        { type: 'input', id: 'email' },
        { type: 'input', id: 'phoneNumber' },
        { type: 'input', id: 'city' },
        { type: 'message', id: 'message' },
        { type: 'suggestions', id: 'suggestions' },
        { type: 'input', id: 'state' },
        { type: 'input', id: 'bankName' },
        { type: 'input', id: 'companyName' },
        { type: 'companyDocs', id: 'companyDocs' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image source={icons.backArrow} style={styles.backIcon} resizeMode="contain" />
                </TouchableOpacity>
                <Text style={styles.headerText} className="capitalize">Edit {usertype == 'bankagent' ? 'Bank Agent' : usertype} Profile</Text>
                <View style={styles.placeholder} />
            </View>

            <RBSheet
                ref={sheetRef}
                closeOnDragDown={true}
                closeOnPressMask={true}
                customStyles={{
                    container: {
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        padding: 20,
                        backgroundColor: sheetMessage.type === 'success' ? '#E6F3E6' : '#FFE6E6',
                    },
                    draggableIcon: {
                        backgroundColor: '#1F4C6B',
                    },
                }}
                height={200}
            >
                <View style={styles.sheetContent}>
                    <Text style={[styles.sheetTitle, { color: sheetMessage.type === 'success' ? 'green' : 'red' }]}>
                        {sheetMessage.title}
                    </Text>
                    <Text style={styles.sheetMessage}>{sheetMessage.message}</Text>
                    <TouchableOpacity
                        style={[styles.sheetButton, { backgroundColor: sheetMessage.type === 'success' ? '#8BC83F' : '#FF4444' }]}
                        onPress={() => sheetRef.current.close()}
                    >
                        <Text style={styles.sheetButtonText}>OK</Text>
                    </TouchableOpacity>
                </View>
            </RBSheet>

            {loading ? (
                <View>
                    <ActivityIndicator size="large" color="#1F4C6B" style={styles.loadingIndicator} />
                    <Text className="text-center">Loading...</Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.scrollContainer}
                    ListFooterComponent={
                        <View className="px-4">
                            <TouchableOpacity onPress={handleSubmit} style={styles.submitButton} disabled={loading}>
                                <Text style={styles.submitButtonText}>
                                    {loading ? 'Updating...' : 'Update Profile'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
};

export default EditProfile;

// Styles remain unchanged
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    backButton: {
        backgroundColor: '#e5e7eb',
        borderRadius: 20,
        padding: 8,
    },
    backIcon: {
        width: 20,
        height: 20,
    },
    headerText: {
        fontSize: 20,
        fontFamily: 'Rubik-Bold',
        color: '#1F4C6B',
    },
    placeholder: {
        width: 40,
    },
    loadingIndicator: {
        marginTop: 50,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    profileImageContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#1F4C6B',
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 60,
        right: '35%',
        borderRadius: 15,
        padding: 5,
    },
    usernameText: {
        fontSize: 18,
        fontFamily: 'Rubik-Bold',
        color: '#1F4C6B',
        marginTop: 10,
    },
    roleText: {
        fontSize: 16,
        fontFamily: 'Rubik-Regular',
        color: '#555',
        marginTop: 5,
    },
    formContainer: {
        marginTop: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 10,
        marginBottom: 10,
        padding: 10,
    },
    inputIcon: {
        marginLeft: 10,
    },
    input: {
        flex: 1,
        height: 45,
        paddingHorizontal: 10,
        fontFamily: 'Rubik-Regular',
        color: '#333',
    },
    label: {
        fontSize: 16,
        fontFamily: 'Rubik-Medium',
        color: '#1F4C6B',
        marginVertical: 5,
    },
    docContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
    },
    docThumbnail: {
        width: 40,
        height: 40,
        marginRight: 10,
    },
    docText: {
        flex: 1,
        fontFamily: 'Rubik-Regular',
        color: '#333',
    },
    viewDocButton: {
        padding: 5,
    },
    viewDocText: {
        color: '#1F4C6B',
        fontFamily: 'Rubik-Medium',
        textDecorationLine: 'underline',
    },
    noDocText: {
        fontFamily: 'Rubik-Regular',
        color: '#555',
        marginBottom: 10,
    },
    uploadButton: {
        backgroundColor: '#e5e7eb',
        borderRadius: 5,
        padding: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    uploadText: {
        color: '#1F4C6B',
        fontFamily: 'Rubik-Medium',
    },
    submitButton: {
        backgroundColor: '#8BC83F',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginVertical: 20,
    },
    submitButtonText: {
        fontSize: 16,
        fontFamily: 'Rubik-Medium',
        color: 'white',
    },
    sheetContent: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    sheetTitle: {
        fontSize: 18,
        fontFamily: 'Rubik-Bold',
        marginBottom: 10,
    },
    sheetMessage: {
        fontSize: 14,
        fontFamily: 'Rubik-Regular',
        color: '#333',
        textAlign: 'center',
        marginBottom: 20,
    },
    sheetButton: {
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    sheetButtonText: {
        fontSize: 16,
        fontFamily: 'Rubik-Medium',
        color: 'white',
    },
    suggestionsList: {
        backgroundColor: '#fff',
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
        fontSize: scale(14),
    },
    errorContainer: {
        backgroundColor: '#FEE2E2',
        padding: 10,
        borderRadius: 10,
        marginVertical: 10,
    },
    errorText: {
        color: '#B91C1C',
        fontSize: 14,
        fontFamily: 'Rubik-Regular',
    },
});
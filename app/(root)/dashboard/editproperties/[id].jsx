import { Image, StyleSheet, Text, ScrollView, TouchableOpacity, View, TextInput, FlatList, Modal, Platform, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import icons from '@/constants/icons';
import { ProgressSteps, ProgressStep } from 'react-native-progress-steps';
import * as ImagePicker from 'expo-image-picker';
import RNPickerSelect from 'react-native-picker-select';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from "react-native-maps";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import Constants from "expo-constants";
import 'react-native-get-random-values';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { Ionicons, MaterialCommunityIcons, Feather, AntDesign, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const Editproperty = () => {
    const { id } = useLocalSearchParams();
    const navigation = useNavigation();
    const [sessionToken, setSessionToken] = useState(uuidv4());

    const GOOGLE_MAPS_API_KEY = Constants.expoConfig.extra.GOOGLE_MAPS_API_KEY;
    const [step1Data, setStep1Data] = useState({ property_name: '', description: '', nearbylocation: '' });
    const [step2Data, setStep2Data] = useState({ approxrentalincome: '', historydate: [], price: '' });
    const [step3Data, setStep3Data] = useState({ bathroom: '', floor: '', city: '', officeaddress: '', bedroom: '' });
    const [isValid, setIsValid] = useState(false);
    const [loading, setLoading] = useState(false);
    const [propertyData, setPropertyData] = useState([]);
    const [propertyDocuments, setPropertyDocuments] = useState([]);
    const [masterPlanDoc, setMasterPlanDoc] = useState([]);
    const [errors, setErrors] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState("unpublished");
    const [publishRequest, setPublishRequest] = useState(0);
    const [rejectionNote, setRejectionNote] = useState('');
    const [mainImage, setMainImage] = useState(null);
    const [amenity, setAmenity] = useState([]);
    const [amenities, setAmenities] = useState([]);
    const [successVisible, setSuccessVisible] = useState(false);
    const [errorVisible, setErrorVisible] = useState(false);
    const [historyPrice, setHistoryPrice] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [show, setShow] = useState(false);
    const [region, setRegion] = useState({
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
    });
    const [coordinates, setCoordinates] = useState({
        latitude: "",
        longitude: "",
    });
    const [fullAddress, setFullAddress] = useState("");
    const [errorField, setErrorField] = useState(null);
    const [videos, setVideos] = useState([]);
    const [galleryImages, setGalleryImages] = useState([]);
    // Use useRef for RBSheet
    const successSheetRef = useRef(null);
    const errorSheetRef = useRef();
    const confirmDeleteRef = useRef(null);
    const [isEditable, setIsEditable] = useState(true); // Track if form is editable
    const buttonPreviousTextStyle = {
        paddingHorizontal: 20,
        paddingVertical: 5,
        borderRadius: 25,
        backgroundColor: '#234F68',
        color: 'white',
        marginTop: 10, // Add margin to prevent overlap
    };
    const buttonNextTextStyle = {
        paddingHorizontal: 20,
        paddingVertical: 5,
        borderRadius: 25,
        backgroundColor: '#8bc83f',
        color: 'white',
        marginTop: 10, // Add margin to prevent overlap
    };
    const buttonFinishTextStyle = {
        paddingHorizontal: 20,
        paddingVertical: 5,
        borderRadius: 25,
        backgroundColor: '#8bc83f',
        color: 'white',
        marginTop: 10, // Align with next button
    };
    const publishrequeststatus = [
        { label: "Save Without Approval", value: "0" },
        { label: "Send for Approval", value: "1" },
    ];
    const [landArea, setLandArea] = useState("");
    const [selectedUnit, setSelectedUnit] = useState("sqft");

    const units = [
        { label: 'sqft', value: 'sqft' },
        { label: 'sqm', value: 'sqm' },
        { label: 'yards', value: 'yards' },
        { label: 'bigha', value: 'bigha' },
        { label: 'acre', value: 'acre' },
    ];
    const [visibleData, setVisibleData] = useState(step2Data.historydate.slice(0, 10));
    const [currentIndex, setCurrentIndex] = useState(10);
    const [categoryData, setCategoryData] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState(null); // 'mainImage', 'galleryImages', or 'video'

    const [selectedSubCategory, setSelectedSubCategory] = useState('');
    const [selectedPropertyFor, setSelectedPropertyFor] = useState('');

    const [suggestions, setSuggestions] = useState([]);
    const [message, setMessage] = useState({ type: '', title: '', text: '' });
    const [searchTerm, setSearchTerm] = useState('');
    // State for tracking invalid fields
    const [step1Errors, setStep1Errors] = useState({ property_name: false, description: false, nearbylocation: false });
    const [step2Errors, setStep2Errors] = useState({ approxrentalincome: false, historydate: false, price: false });
    const [step3Errors, setStep3Errors] = useState({ bathroom: false, floor: false, city: false, officeaddress: false, bedroom: false });
    const [step4Errors, setStep4Errors] = useState({ category: false, mainImage: false, galleryImages: false, coordinates: false, documents: false });

    // RBSheet ref
    const rbSheetRef = useRef();
    // State for RBSheet message
    const [sheetMessage, setSheetMessage] = useState({ title: '', message: '', type: 'error' });


    const subcategoryOptions = {
        Agriculture: [
            { label: 'Plot', value: 'Plot' },
            { label: 'House', value: 'House' },
        ],
        Approved: [
            { label: 'Plot', value: 'Plot' },
            { label: 'House', value: 'House' },
            { label: 'Apartment', value: 'Apartment' },
        ],
        Commercial: [
            { label: 'Plot', value: 'Plot' },
            { label: 'Land', value: 'Land' },
            { label: 'Shop', value: 'Shop' },
            { label: 'Office', value: 'Office' },
            { label: 'Other', value: 'Other' },
        ],
    };

    const propertyfor = [
        { label: 'Sell', value: 'Sell' },
        { label: 'Rent', value: 'Rent' },
    ];


    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`https://landsquire.in/api/get-categories`);
            if (response.data?.categories) {
                setCategoryData(response.data.categories);
                // console.log('categoryData', response.data.categories);
            } else {
                console.error("Unexpected API response format:", response.data);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
        if (step2Data.historydate.length > 0) {
            setVisibleData(step2Data.historydate.slice(0, currentIndex));
        }
    }, [step2Data.historydate]);

    const loadMore = () => {
        const nextIndex = currentIndex + 10;
        setVisibleData(step2Data.historydate.slice(0, nextIndex));
        setCurrentIndex(nextIndex);
    };

    const validateStep = (step) => {
        let isValid = true;
        let message = '';
        let title = '';

        if (step === 1) {
            const newErrors = {
                property_name: !step1Data?.property_name,
                description: !step1Data?.description,
                nearbylocation: !step1Data?.nearbylocation,
                purpose: !selectedPropertyFor,
                category: !selectedCategory,
                subcategory: !selectedSubCategory,
                mainImage: !mainImage,
            };
            setStep1Errors(newErrors);
            if (Object.values(newErrors).some(error => error)) {
                isValid = false;
                title = 'Step 1 Error';
                message = [
                    newErrors.property_name ? 'Please Enter Property Name.' : '',
                    newErrors.description ? 'Please Enter Description' : '',
                    newErrors.nearbylocation ? 'Please enter atleast one landmarks.' : '',
                    newErrors.category ? 'Please select category.' : '',
                    newErrors.subcategory ? 'Please select sub category.' : '',
                    newErrors.mainImage ? 'Please upload at least one property image.' : '',
                ].filter(msg => msg).join('\n');
            }
        }

        if (step === 2) {
            const newErrors = {
                approxrentalincome: !step2Data?.approxrentalincome,
                // historydate: step2Data?.historydate.length === 0,
                price: !step2Data?.price,
            };
            setStep2Errors(newErrors);
            if (Object.values(newErrors).some(error => error)) {
                isValid = false;
                title = 'Step 2 Error';
                message = 'Approx Rental Income, Price, and at least one History Date are required.';
                message = [
                    newErrors.approxrentalincome ? 'Please enter approx rental income.' : '',
                    newErrors.price ? 'Please enter current property price.' : '',
                    // newErrors.historydate ? 'Please enter price history' : '',
                ].filter(msg => msg).join('\n');
            }
        }

        if (step === 3) {
            const newErrors = {
                amenities: amenities.length < 1,
                // floor: !step3Data?.floor,
                // bathroom: !step3Data?.bathroom,
                // bedroom: !step3Data?.bedroom,
                city: !step3Data?.city,
                officeaddress: !step3Data?.officeaddress,
                landArea: !landArea,
                fullAddress: !fullAddress,
            };
            setStep3Errors(newErrors);
            if (Object.values(newErrors).some(error => error)) {
                isValid = false;
                title = 'Step 3 Error';
                message = [
                    newErrors.amenities ? 'Please enter amenities.' : '',
                    // newErrors.floor ? 'Please enter no. of floors' : '',
                    // newErrors.bathroom ? 'Please enter no. of bathroom.' : '',
                    // newErrors.bedroom ? 'Please enter no. of bathroom.' : '',
                    newErrors.landArea ? 'Please enter land area.' : '',
                    newErrors.city ? 'Please enter city.' : '',
                    newErrors.officeaddress ? 'Please enter Property address.' : '',
                    newErrors.fullAddress ? 'Please enter location on map' : '',
                ].filter(msg => msg).join('\n');
            }
        }

        if (step === 4) {
            const newErrors = {
                galleryImages: galleryImages.length < 3, // ✅ corrected to match message (at least 2)
                // videos: videos.length < 1,
                // propertyDocuments: propertyDocuments.length < 1,
                // masterPlanDoc: masterPlanDoc.length < 1,
            };

            setStep4Errors(newErrors);

            if (Object.values(newErrors).some(error => error)) {
                isValid = false;
                title = 'Step 4 Error';
                message = [
                    newErrors.galleryImages ? 'Please upload at least 3 gallery images.' : '',
                    // newErrors.videos ? 'Please upload at least 1 video.' : '',
                    // newErrors.propertyDocuments ? 'Please upload at least 1 property document.' : '',
                    // newErrors.masterPlanDoc ? 'Please upload a master plan document.' : '',
                ].filter(msg => msg).join('\n');
            }
        }


        if (!isValid) {
            setErrors(true);
            setSheetMessage({ title, message, type: 'error' });
            rbSheetRef.current.open();
        } else {
            setErrors(false);
        }

        return isValid;
    };

    const onNextStep = (step) => {
        if (!validateStep(step)) {
            setErrors(true);
        } else {
            setErrors(false);
        }
    };

    const requestPermissions = async (useCamera = false) => {
        if (useCamera) {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                setErrorField('Sorry, we need camera permissions to make this work!');
                setErrorVisible(true);
                return false;
            }
        }
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            setErrorField('Sorry, we need camera roll permissions to make this work!');
            setErrorVisible(true);
            return false;
        }
        return true;
    };
    const openSourceModal = (type) => {
        setModalType(type);
        setModalVisible(true);
    };

    const updateFullAddress = async (latitude, longitude) => {
        try {
            const response = await axios.get(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
            );
            if (response.data.results && response.data.results.length > 0) {
                setFullAddress(response.data.results[0].formatted_address);
            } else {
                setFullAddress("Address not found");
            }
        } catch (error) {
            console.error("Error fetching address:", error);
            setFullAddress("Unable to retrieve address");
        }
    };

    const handleAddAmenity = () => {
        if (amenity.trim() !== '') {
            setAmenities([...amenities, amenity.trim()]);
            setAmenity('');
        }
    };

    const pickMainImage = async (source) => {
        setModalVisible(false);
        if (source === 'camera') {
            if (!(await requestPermissions(true))) return;
            let result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });
            if (!result?.canceled && result.assets?.length) {
                setMainImage(result.assets[0].uri);
            }
        } else {
            if (!(await requestPermissions())) return;
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
            });
            if (!result?.canceled && result.assets?.length) {
                setMainImage(result.assets[0].uri);
            }
        }
    };

    const pickGalleryImages = async (source) => {
        setModalVisible(false);
        if (source === 'camera') {
            if (!(await requestPermissions(true))) return;
            let result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.5,
            });
            if (!result?.canceled && result.assets?.length) {
                setGalleryImages(prevImages => [...prevImages, result.assets[0].uri]);
            }
        } else {
            if (!(await requestPermissions())) return;
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.5,
            });
            if (!result?.canceled && result.assets?.length) {
                const selectedImages = result.assets.map(image => image.uri);
                setGalleryImages(prevImages => [...prevImages, ...selectedImages]);
            }
        }
    };

    const pickVideo = async (source) => {
        setModalVisible(false);
        const defaultThumbnail = typeof icons.videofile === "number" ? Image.resolveAssetSource(icons.videofile).uri : icons.videofile;
        if (source === 'camera') {
            if (!(await requestPermissions(true))) return;
            let result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 0.5,
            });
            if (!result?.canceled && result.assets?.length) {
                setVideos(prevVideos => [
                    ...prevVideos,
                    {
                        id: result.assets[0].uri,
                        uri: result.assets[0].uri,
                        thumbnailImages: defaultThumbnail,
                    },
                ]);
            }
        } else {
            if (!(await requestPermissions())) return;
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsMultipleSelection: true,
            });
            if (!result?.canceled && result.assets?.length) {
                const selectedVideos = result.assets.map(video => ({
                    id: video.uri,
                    uri: video.uri,
                    thumbnailImages: defaultThumbnail,
                }));
                setVideos(prevVideos => [...new Set([...prevVideos, ...selectedVideos])]);
            }
        }
    };

    const handleDateChange = (event, date) => {
        setShow(false);
        if (date) {
            const formattedDate = date.toLocaleDateString("en-GB");
            setSelectedDate(formattedDate);
        }
    };

    const formatDate = (dateString) => {
        const [day, month, year] = dateString.split("/");
        return `${year}-${month}-${day}`;
    };

    const addPriceHistory = () => {
        if (selectedDate && historyPrice) {
            const newHistoryEntry = {
                dateValue: formatDate(selectedDate),
                priceValue: historyPrice
            };
            setStep2Data((prevData) => {
                const updatedHistory = [newHistoryEntry, ...prevData.historydate];
                return { ...prevData, historydate: updatedHistory };
            });
            setSelectedDate('');
            setHistoryPrice('');
        }
    };

    const removePriceHistory = (index) => {
        setStep2Data((prevData) => {
            const updatedHistory = prevData.historydate.filter((_, i) => i !== index);
            return { ...prevData, historydate: updatedHistory };
        });
        setVisibleData((prevData) => prevData.filter((_, i) => i !== index));
    };

    const pickDocument = async () => {
        let result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            multiple: true,
        });

        if (!result.canceled) {
            const selectedDocuments = Array.isArray(result.assets) ? result.assets : [result];
            const newDocuments = selectedDocuments.map(doc => ({
                uri: doc.uri,
                name: doc.name || 'Unnamed Document',
                thumbnail: 'https://cdn-icons-png.flaticon.com/512/337/337946.png',
            }));
            setPropertyDocuments(prevDocs => [...prevDocs, ...newDocuments]);
        }
    };

    const pickMasterPlan = async () => {
        let result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            multiple: true,
        });

        if (!result.canceled) {
            const selectedDocuments = Array.isArray(result.assets) ? result.assets : [result];
            const newDocuments = selectedDocuments.map(doc => ({
                uri: doc.uri,
                name: doc.name || 'Unnamed Document',
                thumbnail: doc.mimeType.startsWith('image') ? doc.uri : 'https://cdn-icons-png.flaticon.com/512/337/337946.png',
            }));
            setMasterPlanDoc(prevDocs => [...prevDocs, ...newDocuments]);
        }
    };

    const handlePlaceSelect = (data, details = null) => {
        if (details?.geometry?.location) {
            const { lat, lng } = details.geometry.location;
            setFullAddress(details.formatted_address);
            setRegion({
                latitude: lat,
                longitude: lng,
                latitudeDelta: 0.015,
                longitudeDelta: 0.0121,
            });
            setCoordinates({
                latitude: parseFloat(lat) ?? 0,
                longitude: parseFloat(lng) ?? 0,
            });
        }
    };

    const removeGalleryImage = async (index, imageUri) => {
        setGalleryImages(prevImages => prevImages.filter((_, i) => i !== index));
        if (imageUri.startsWith("http")) {
            try {
                await axios.post("https://landsquire.in/api/deletefile", {
                    property_id: propertyData.id,
                    file_type: "gallery",
                    file_path: imageUri.replace("https://landsquire.in/", ""),
                });
            } catch (error) {
                console.error("Failed to delete image:", error);
            }
        }
    };

    const removeVideo = async (index, videoUri) => {
        setVideos(prevVideos => prevVideos.filter((_, i) => i !== index));
        if (videoUri.startsWith("http")) {
            try {
                await axios.post("https://landsquire.in/api/deletefile", {
                    property_id: propertyData.id,
                    file_type: "video",
                    file_path: videoUri.replace("https://landsquire.in/", ""),
                });
            } catch (error) {
                console.error("Failed to delete video:", error);
            }
        }
    };

    const removeDocument = async (index, docUri) => {
        setPropertyDocuments(prevDocs => prevDocs.filter((_, i) => i !== index));
        if (docUri.startsWith("http")) {
            try {
                await axios.post("https://landsquire.in/api/deletefile", {
                    property_id: propertyData.id,
                    file_type: "document",
                    file_path: docUri.replace("https://landsquire.in/", ""),
                });
            } catch (error) {
                console.error("Failed to delete document:", error);
            }
        }
    };

    const removeMasterPlan = async (index, docUri) => {
        setMasterPlanDoc(prevDocs => prevDocs.filter((_, i) => i !== index));
        if (docUri.startsWith("http")) {
            try {
                await axios.post("https://landsquire.in/api/deletefile", {
                    property_id: propertyData.id,
                    file_type: "masterplan",
                    file_path: docUri.replace("https://landsquire.in/", ""),
                });
            } catch (error) {
                console.error("Failed to delete master plan document:", error);
            }
        }
    };

    const handleMapPress = (e) => {
        if (!e?.nativeEvent?.coordinate) return;
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setRegion({
            latitude,
            longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.0121,
        });
        setCoordinates({
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
        });
    };

    const getUserData = async () => {
        try {
            const userData = await AsyncStorage.getItem('userData');
            const userToken = await AsyncStorage.getItem('userToken');
            return {
                userData: userData ? JSON.parse(userData) : null,
                userToken: userToken ? userToken : null
            };
        } catch (error) {
            console.error("Error fetching user data:", error);
            return null;
        }
    };

    const handleDeleteProperty = async () => {
        confirmDeleteRef.current.close();
        setLoading(true);
        try {
            const { userData, userToken } = await getUserData();
            if (!userData || !userToken) {
                throw new Error("User is not authenticated. Token missing.");
            }
            const { id: userId } = userData;


            const response = await axios.post(`https://landsquire.in/api/deletelisting`, { property_id: id, roleid: userId, }, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${userToken}`
                },
            });
            // console.log('response', response);
            if (response.status === 200 && !response.data.error) {
                setSuccessVisible(true);
            } else {
                setErrorField(response.data.message || "Unknown error");
                setErrorVisible(true);
            }
        } catch (error) {
            console.error('handleDeleteProperty error:', error);
            setErrorField(error.message || "Failed to delete property");
            setErrorVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmission = async () => {
        const isStepValid = validateStep(4); // Validate step 4 explicitly
        if (isStepValid) {
            await handleSubmit(); // Only call handleSubmit if validation passes
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const { userData, userToken } = await getUserData();
            if (!userData || !userToken) {
                throw new Error("User is not authenticated. Token missing.");
            }
            const propertyId = propertyData?.id ?? id;
            const { id: userId, user_type } = userData;

            const formData = new FormData();
            [step1Data, step2Data, step3Data].forEach(data => {
                Object.entries(data).forEach(([key, value]) => {
                    if (value !== null && value !== undefined && !formData.has(key)) {
                        formData.append(key, value);
                    }
                });
            });

            formData.append("landarea", landArea && selectedUnit ? `${landArea} ${selectedUnit}` : "");
            formData.append("category", selectedCategory ?? "");
            formData.append("subcategory", selectedSubCategory ?? "");
            formData.append("propertyfor", selectedPropertyFor ?? "");
            formData.append("status", "unpublished");
            formData.append("publishrequest", publishRequest ?? "");
            formData.append("roleid", userId ?? "");
            formData.append("usertype", user_type ?? "");
            formData.append("amenities", amenities ? JSON.stringify(amenities) : "[]");
            // formData.append("historydate", step2Data?.historydate ? JSON.stringify(step2Data.historydate) : "[]");
            formData.append("location", coordinates ? JSON.stringify({
                Latitude: coordinates.latitude,
                Longitude: coordinates.longitude,
            }) : "{}");

            if (mainImage && !mainImage.startsWith("http")) {
                const fileType = mainImage.split('.').pop();
                formData.append("thumbnailImages", {
                    uri: mainImage,
                    name: `thumbnail.${fileType}`,
                    type: `image/${fileType}`,
                });
            }

            galleryImages.forEach((imageUri, index) => {
                if (!imageUri.startsWith("http")) {
                    const fileType = imageUri.split('.').pop();
                    formData.append(`galleryImages[${index}]`, {
                        uri: imageUri,
                        type: `image/${fileType}`,
                        name: `gallery-${index}.${fileType}`,
                    });
                }
            });

            videos.forEach((video, index) => {
                if (video?.uri && !video.uri.startsWith("http")) {
                    const fileType = video.uri.split('.').pop();
                    formData.append(`propertyvideos[${index}]`, {
                        uri: video.uri,
                        type: video.type || `video/${fileType}`,
                        name: `video-${index}.${fileType}`,
                    });
                }
            });

            propertyDocuments.forEach((doc, index) => {
                if (doc?.uri && !doc.uri.startsWith("http")) {
                    const fileType = doc.uri.split('.').pop();
                    formData.append(`documents[${index}]`, {
                        uri: doc.uri,
                        type: `application/${fileType}`,
                        name: `document-${index}.${fileType}`,
                    });
                }
            });

            masterPlanDoc.forEach((doc, index) => {
                if (doc?.uri && !doc.uri.startsWith("http")) {
                    const fileType = doc.uri.split('.').pop()?.toLowerCase() || "pdf";
                    formData.append("masterplandocument", {
                        uri: doc.uri,
                        type: fileType === "pdf" ? "application/pdf" : `image/${fileType}`,
                        name: `masterplan-${index}.${fileType}`,
                    });
                }
            });

            const fileData = {
                galleryImages: galleryImages.filter(img => !img.startsWith("http")),
                propertyvideos: videos.filter(vid => vid.uri && !vid.uri.startsWith("http")),
                thumbnailImages: mainImage && !mainImage.startsWith("http") ? [mainImage] : [],
                documents: propertyDocuments.filter(doc => doc.uri && !doc.uri.startsWith("http")),
                masterplandocument: masterPlanDoc.filter(doc => doc.uri && !doc.uri.startsWith("http")),
            };
            formData.append("fileData", JSON.stringify(fileData));
            console.log('formdata', formData);
            const response = await axios.post(`https://landsquire.in/api/updatelisting/${propertyId}`, formData, {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "multipart/form-data; charset=utf-8",
                    "Authorization": `Bearer ${userToken}`
                },
            });

            console.log('API response:', response.data);
            if (response.status === 200 && !response.data.error) {
                setSuccessVisible(true);
            } else {
                setErrorField(response.data.message || "Unknown error");
                setErrorVisible(true);
            }
        } catch (error) {
            console.error('handleSubmit error:', error);
            setErrorField(error.message || "Failed to update property");
            setErrorVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const fetchPropertyData = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');  

            setLoading(true);
            const response = await axios.get(`https://landsquire.in/api/property-details/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (response.data) {
                const apiData = response.data.details;
                setPropertyData(apiData);

                setStep1Data({
                    property_name: apiData.property_name || '',
                    description: apiData.discription || '',
                    nearbylocation: apiData.nearbylocation || '',
                });

                setStep2Data({
                    approxrentalincome: apiData.approxrentalincome || '',
                    historydate: apiData.historydate || '',
                    price: apiData.price || '',
                });

                setStep3Data({
                    bathroom: apiData.bathroom || '',
                    bedroom: apiData.bedroom || '',
                    floor: apiData.floor || '',
                    city: apiData.city || '',
                    officeaddress: apiData.address || '',
                });

                if (apiData.squarefoot) {
                    const [area, unit] = apiData.squarefoot.split(' ');
                    setLandArea(area || '');
                    setSelectedUnit(unit || '');
                } else {
                    setLandArea('');
                    setSelectedUnit('');
                }

                setSelectedCategory(apiData.category || '');
                setSelectedSubCategory(apiData.subcategory || '');
                setSelectedPropertyFor(apiData.propertyfor || '');
                setSelectedStatus(apiData.status || '');
                setPublishRequest(apiData.publishrequest || '');
                setRejectionNote(apiData.updaterejectnote || '');

                if (apiData?.publishrequest === '1') {
                    setIsEditable(false);
                    setErrorField('This property is already sent for approval. You cannot make further changes until the approval process is complete.');
                    setErrorVisible(true); // This will trigger the useEffect to open the RBSheet
                } else {
                    setIsEditable(true);
                }

                const fetchedAmenities = apiData.amenties || apiData.amenities || [];
                let parsedAmenities = fetchedAmenities;
                if (typeof fetchedAmenities === "string") {
                    try {
                        parsedAmenities = JSON.parse(fetchedAmenities);
                    } catch (error) {
                        console.error("Error parsing amenities:", error);
                        parsedAmenities = [];
                    }
                }
                if (Array.isArray(parsedAmenities)) {
                    setAmenities([...parsedAmenities]);
                }

                if (apiData.maplocations) {
                    try {
                        const locationData = JSON.parse(apiData.maplocations);
                        const latitude = parseFloat(locationData.Latitude);
                        const longitude = parseFloat(locationData.Longitude);
                        if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
                            setCoordinates({ latitude, longitude });
                            setRegion({
                                latitude,
                                longitude,
                                latitudeDelta: 0.015,
                                longitudeDelta: 0.0121,
                            });
                            await updateFullAddress(latitude, longitude);
                        } else {
                            console.error("Invalid latitude or longitude values");
                        }
                    } catch (error) {
                        console.error("Error parsing map locations:", error);
                    }
                }

                if (apiData.gallery) {
                    try {
                        let galleryArray = typeof apiData.gallery === 'string' ? JSON.parse(apiData.gallery) : apiData.gallery;
                        const galleryImages = galleryArray.map(img =>
                            img.startsWith('http') ? img : `https://landsquire.in/${img}`
                        );
                        setGalleryImages(galleryImages);
                    } catch (error) {
                        console.error("Error processing gallery images:", error);
                    }
                }

                if (apiData.videos) {
                    try {
                        let galleryVideos = typeof apiData.videos === 'string' ? JSON.parse(apiData.videos) : apiData.videos;
                        const defaultThumbnail = typeof icons.videofile === "number"
                            ? Image.resolveAssetSource(icons.videofile).uri
                            : icons.videofile;
                        const videoObjects = galleryVideos.map(video => ({
                            id: video,
                            uri: video.startsWith('http') ? video : `https://landsquire.in/${video}`,
                            thumbnailImages: defaultThumbnail,
                        }));
                        setVideos(videoObjects);
                    } catch (error) {
                        console.error("Error processing videos:", error);
                    }
                }

                if (apiData.documents) {
                    try {
                        let propertyDocuments = typeof apiData.documents === 'string'
                            ? JSON.parse(apiData.documents)
                            : apiData.documents;
                        setPropertyDocuments(
                            propertyDocuments.map(uri => ({
                                uri: uri.startsWith('http') ? uri : `https://landsquire.in/${uri}`,
                                name: uri.split('/').pop() || 'Unnamed Document',
                                thumbnail: 'https://cdn-icons-png.flaticon.com/512/337/337946.png',
                            }))
                        );
                    } catch (error) {
                        console.error("Error processing documents:", error);
                    }
                }

                if (apiData.masterplandoc) {
                    try {
                        let masterPlanDocs = Array.isArray(apiData.masterplandoc)
                            ? apiData.masterplandoc
                            : [apiData.masterplandoc];
                        setMasterPlanDoc(
                            masterPlanDocs.map(filePath => ({
                                uri: filePath.startsWith('http') ? filePath : `https://landsquire.in/${filePath}`,
                                name: filePath.split('/').pop() || 'Unnamed Document',
                                thumbnail: filePath.endsWith('.pdf')
                                    ? 'https://cdn-icons-png.flaticon.com/512/337/337946.png'
                                    : `https://landsquire.in/${filePath}`,
                            }))
                        );
                    } catch (error) {
                        console.error("Error processing masterplandoc:", error);
                    }
                }

                // let priceHistoryData = apiData.pricehistory;
                // if (typeof priceHistoryData === "string") {
                //     try {
                //         priceHistoryData = JSON.parse(priceHistoryData);
                //     } catch (error) {
                //         console.error("Error parsing pricehistory:", error);
                //         priceHistoryData = [];
                //     }
                // }
                // if (Array.isArray(priceHistoryData)) {
                //     priceHistoryData.sort((a, b) => new Date(b.dateValue) - new Date(a.dateValue));
                //     setStep2Data((prevData) => ({
                //         ...prevData,
                //         historydate: priceHistoryData.map(item => ({
                //             dateValue: item.dateValue,
                //             priceValue: item.priceValue.toString(),
                //         })),
                //     }));
                // }

                if (apiData.thumbnail) {
                    setMainImage(
                        apiData.thumbnail.startsWith('http')
                            ? apiData.thumbnail
                            : `https://landsquire.in/adminAssets/images/Listings/${apiData.thumbnail}`
                    );
                }
            }
        } catch (error) {
            console.error('Error fetching property data:', error);
            setErrorField('Failed to fetch property data');
            setErrorVisible(true); // This will trigger the useEffect to open the RBSheet
        } finally {
            setLoading(false);
        }
    };

    // Lifecycle and navigation debugging
    // useEffect(() => {
    //     console.log('Editproperty component mounted');
    //     console.log('Success RBSheet mounted, ref:', successSheetRef.current);
    //     console.log('Error RBSheet mounted, ref:', errorSheetRef.current);
    //     return () => {
    //         console.log('Editproperty component unmounted');
    //         console.log('Success RBSheet unmounted');
    //         console.log('Error RBSheet unmounted');
    //     };
    // }, []);

    // Navigation state listener
    useEffect(() => {
        const unsubscribe = navigation.addListener('state', (e) => {
            // console.log('Navigation state changed:', e.data);
        });
        return unsubscribe;
    }, [navigation]);

    // Open RBSheet when state changes
    useEffect(() => {
        if (successVisible && successSheetRef.current) {
            // console.log('Opening success sheet via useEffect, ref:', successSheetRef.current);
            successSheetRef.current.open();
        } else if (successVisible) {
            console.log('Success sheet ref is null when trying to open via useEffect');
        }
    }, [successVisible]);

    useEffect(() => {
        if (errorVisible && errorSheetRef.current) {
            // console.log('Opening error sheet, ref:', errorSheetRef.current);
            errorSheetRef.current.open();
        } else if (errorVisible) {
            // console.log('Error sheet ref is null, retrying...');
            // Retry opening the sheet after a short delay
            const timer = setTimeout(() => {
                if (errorSheetRef.current) {
                    console.log('Retrying to open error sheet, ref:', errorSheetRef.current);
                    errorSheetRef.current.open();
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [errorVisible]);

    useEffect(() => {
        if (id) {
            fetchPropertyData();
        }
    }, [id]);

    if (loading) {
        return <ActivityIndicator size="large" color="#8bc83f" style={{ marginTop: 400 }} />;
    }

    if (!propertyData) {
        return <ActivityIndicator size="large" color="#8bc83f" style={{ marginTop: 400 }} />;
    }

    const formatINR = (amount) => {
        if (!amount) return '₹0';
        const num = Number(amount);
        if (num >= 1e7) {
            return '₹' + (num / 1e7).toFixed(2).replace(/\.00$/, '') + ' Cr';
        } else if (num >= 1e5) {
            return '₹' + (num / 1e5).toFixed(2).replace(/\.00$/, '') + ' Lakh';
        }
        return '₹' + num.toLocaleString('en-IN');
    };

    // Utility function to format number in Indian style (e.g., 10,00,000)
    const formatIndianNumber = (number) => {
        if (!number) return '';
        const numStr = number.toString().replace(/[^0-9]/g, ''); // Remove non-numeric characters
        // If number is less than 1,000, no formatting needed
        if (numStr.length <= 3) return numStr;
        const lastThree = numStr.slice(-3);
        const otherNumbers = numStr.slice(0, -3);
        const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        return `${formattedOther},${lastThree}`;
    };

    const handleDelete = () => {
        if (confirmDeleteRef.current) {
            confirmDeleteRef.current.open();
        }
    };

    const handleContactSupport = () => {
        // Placeholder for contact support functionality
        // Replace with actual navigation or API call to contact support
        // console.log('Contacting support...');
        router.back();
        // Example: router.push('/contact-support');
        // Or open an email client, phone call, or support ticket API
    };



    const handleSearch = (text) => {
        setSearchTerm(text);
        setStep3Data({ ...step3Data, city: text }); // Sync city with input
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
            // console.log('API Response:', response.data); // Debug the response
            if (response.data.status === 'OK') {
                setSuggestions(response.data.predictions);
            } else {
                setSuggestions([]);
                setMessage({
                    type: 'error',
                    title: 'Error',
                    text: response.data.error_message || 'Failed to fetch suggestions.',
                });
                console.error('API Error:', response.data.error_message);
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
            // console.log('Place Details Response:', response.data); // Debug the response
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
                if (selectedCity) {
                    setStep3Data({ ...step3Data, city: selectedCity });
                    setSearchTerm(selectedCity);
                    setSuggestions([]);
                    setSessionToken(uuidv4()); // Reset session token after selection
                } else {
                    setMessage({
                        type: 'error',
                        title: 'Error',
                        text: 'Could not extract city from selection.',
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

    return (
        <View style={{ backgroundColor: '#fafafa', height: '100%', paddingHorizontal: 20 }}>
            {/* Test button for debugging */}
            {/* <TouchableOpacity
                style={{ backgroundColor: '#28a745', padding: 10, borderRadius: 10, marginTop: 20 }}
                onPress={() => {
                    console.log('Test opening success sheet, ref:', successSheetRef.current);
                    if (successSheetRef.current) {
                        successSheetRef.current.open();
                    } else {
                        console.log('Success sheet ref is null');
                    }
                }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Test Success Sheet</Text>
            </TouchableOpacity> */}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 18, marginRight: 10, textAlign: 'center', fontFamily: 'Rubik-Bold', color: '#234F68' }}>
                    Edit Property
                </Text>
                <TouchableOpacity
                    onPress={() => {
                        // console.log('Back button pressed');
                        router.back();
                    }}
                    style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 50, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                    <Image source={icons.backArrow} style={{ width: 20, height: 20 }} />
                </TouchableOpacity>
            </View>

            {/* Property Card */}
            <View className="justify-between items-center mt-2 p-3 rounded-3xl flex-row bg-primary-100">
                <View className='flex-row justify-between items-center'>
                    {mainImage && <Image source={{ uri: mainImage }} style={styles.image} />}
                    <View className='ms-2 flex-1'>
                        <View className="flex-row items-center justify-between mt-1">
                            <Text className="font-rubik-medium text-base">{step1Data.property_name}</Text>
                            <View style={styles.statusContainer}>
                                <View style={[styles.statusDot, { backgroundColor: selectedStatus?.toLowerCase() === 'published' ? '#28A745' : '#DC3545', },]} />
                                <Text style={[styles.statusText,]}>
                                    {selectedStatus?.toLowerCase() === 'published' ? 'Active' : 'Inactive'}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center justify-between mt-1">
                            <View className="flex-row">
                                <Ionicons name="location-outline" size={16} color="#234F68" />
                                <Text className="text-base font-rubik text-black ml-1">
                                    {step3Data.city}
                                </Text>
                            </View>
                            {/* <TouchableOpacity onPress={handleDelete} className="bg-red-600 rounded-3xl px-3">
                                <Text className="text-base font-rubik text-white">
                                    <AntDesign name="delete" size={14} color="white" /> Delete
                                </Text>
                            </TouchableOpacity> */}

                        </View>
                        <View className="flex-row items-center justify-between mt-1">
                            <Text className="text-base font-rubik text-black-300">
                                {formatINR(step2Data.price)}
                            </Text>
                            <View className="bg-primary-300 rounded-3xl px-3">
                                <Text className="text-base font-rubik text-white">
                                    {selectedCategory} - {selectedSubCategory}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {publishRequest === '2' && (
                <View className="bg-red-50 border border-red-600 rounded-xl p-4 mt-3 flex-row items-start space-x-3">
                    {/* Icon */}
                    <MaterialIcons name="error-outline" size={24} color="#DC2626" />

                    {/* Text Content */}
                    <View className="flex-1">
                        <Text className="text-red-700 font-semibold text-base mb-1">
                            Update Request Rejected
                        </Text>
                        <Text className="text-red-600 text-sm leading-5">
                            {rejectionNote || "Your update request has been rejected by admin."}
                        </Text>
                    </View>
                </View>
            )}

            {/* Conditional Rendering Based on isEditable */}
            {!isEditable ? (
                <View style={styles.pendingContainer}>
                    <Image source={icons.alertWarning} style={{ width: 100, height: 100 }} />
                    <Text style={styles.pendingTitle}>Pending for Approval</Text>
                    <Text style={styles.pendingMessage}>
                        This property is currently under review. You cannot make changes until the approval process is complete.
                    </Text>
                    <TouchableOpacity
                        style={styles.contactButton}
                        onPress={handleContactSupport}
                    >
                        <Text style={styles.contactButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.container}>

                    <ProgressSteps>
                        <ProgressStep label="General"
                            nextBtnTextStyle={buttonNextTextStyle}
                            nextBtnText="Next"
                            previousBtnText="Back"
                            onNext={() => onNextStep(1)}
                            errors={errors}
                        >

                            {/* select status */}
                            <View style={styles.stepContent}>
                                <Text style={styles.label}>Send request</Text>
                                <View style={styles.pickerContainer}>
                                    <RNPickerSelect
                                        onValueChange={(value) => setPublishRequest(value)}
                                        items={publishrequeststatus}
                                        value={publishRequest} // ✅ Ensures the default value is selected
                                        style={pickerSelectStyles}
                                        placeholder={{ label: 'Choose an option...', value: null }}
                                    />
                                </View>
                                {!isEditable && (
                                    <Text style={{ color: 'red', marginTop: 10 }}>
                                        This property is pending approval. No further changes can be made until approved.
                                    </Text>
                                )}
                            </View>


                            <View style={styles.stepContent}>
                                <Text style={[styles.label, step1Errors.property_name && { color: 'red' }]}>Property Title</Text>
                                <View style={styles.inputContainer}>
                                    <AntDesign name="home" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter property name"
                                        value={step1Data.property_name}
                                        onChangeText={text => setStep1Data({ ...step1Data, property_name: text })}
                                    />
                                </View>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={[styles.label, step1Errors.description && { color: 'red' }]}>Property Description</Text>
                                <TextInput
                                    style={styles.textarea}
                                    value={step1Data.description}
                                    onChangeText={text => setStep1Data({ ...step1Data, description: text })}
                                    maxLength={120}
                                    placeholder="Enter property description..."
                                    multiline
                                    numberOfLines={5}
                                />
                            </View>

                            <View style={styles.stepContent}>
                                <Text style={[styles.label, step1Errors.mainImage && { color: 'red' }]}>Property Thumbnail</Text>
                                <View className="flex-row items-center">
                                    <TouchableOpacity onPress={() => openSourceModal('mainImage')} style={styles.dropbox}>
                                        <Ionicons name="image-outline" size={24} color="#234F68" style={styles.inputIcon} />
                                        <Text style={{ marginStart: 10 }}>Upload Thumbnail</Text>
                                    </TouchableOpacity>
                                    {mainImage && <Image source={{ uri: mainImage }} style={styles.image} />}
                                </View>
                            </View>

                            <View style={styles.stepContent}>
                                <Text style={[styles.label, step1Errors.purpose && { color: 'red' }]}>Select Purpose</Text>
                                <View style={styles.categoryContainer}>
                                    {Array.isArray(propertyfor) &&
                                        propertyfor.map((item, index) => (
                                            <TouchableOpacity
                                                key={index} // using index since your array doesn’t have `id`
                                                style={[
                                                    styles.categoryButton,
                                                    selectedPropertyFor === item.value && styles.categoryButtonSelected,
                                                ]}
                                                onPress={() => setSelectedPropertyFor(item.value)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.categoryText,
                                                        selectedPropertyFor === item.value && styles.categoryTextSelected,
                                                    ]}
                                                >
                                                    {item.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                </View>


                                <Text style={[styles.label, step1Errors.category && { color: 'red' }]}>Select Category</Text>
                                <View style={styles.categoryContainer}>
                                    {Array.isArray(categoryData) &&
                                        categoryData.map((category) => (
                                            <TouchableOpacity
                                                key={category.id}
                                                style={[
                                                    styles.categoryButton,
                                                    selectedCategory === category.label && styles.categoryButtonSelected,
                                                ]}
                                                onPress={() => {
                                                    setSelectedCategory(category.label);
                                                    setSelectedSubCategory(null); // reset subcategory when category changes
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.categoryText,
                                                        selectedCategory === category.label && styles.categoryTextSelected,
                                                    ]}
                                                >
                                                    {category.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                </View>

                                {/* Show subcategory only when category is selected */}
                                {selectedCategory && (
                                    <>
                                        <Text style={[styles.label, step1Errors.subcategory && { color: 'red' }]}>Select Sub Category</Text>
                                        <View style={styles.categoryContainer}>
                                            {Array.isArray(subcategoryOptions[selectedCategory]) &&
                                                subcategoryOptions[selectedCategory].map((subcategory) => (
                                                    <TouchableOpacity
                                                        key={subcategory.value}
                                                        style={[
                                                            styles.categoryButton,
                                                            selectedSubCategory === subcategory.value &&
                                                            styles.categoryButtonSelected,
                                                        ]}
                                                        onPress={() => setSelectedSubCategory(subcategory.value)}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.categoryText,
                                                                selectedSubCategory === subcategory.value &&
                                                                styles.categoryTextSelected,
                                                            ]}
                                                        >
                                                            {subcategory.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                        </View>
                                    </>
                                )}
                            </View>


                            <View style={styles.stepContent}>
                                <Text style={[styles.label, step1Errors.nearbylocation && { color: 'red' }]}>Near By Locations</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="trail-sign-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter near by locations..."
                                        value={step1Data.nearbylocation}
                                        onChangeText={text => setStep1Data({ ...step1Data, nearbylocation: text })}
                                    />
                                </View>
                            </View>
                        </ProgressStep>

                        <ProgressStep label="Price"
                            nextBtnText="Next"
                            previousBtnText="Back"
                            nextBtnTextStyle={buttonNextTextStyle}
                            previousBtnTextStyle={buttonPreviousTextStyle}
                            onNext={() => onNextStep(2)}
                            errors={errors}
                        >
                            <View style={styles.stepContent}>
                                <Text style={[styles.label, step2Errors.approxrentalincome && { color: 'red' }]}>Approx Rental Income</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="pricetag-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="Enter approx rental income"
                                        value={formatIndianNumber(step2Data.approxrentalincome)}
                                        onChangeText={text => {
                                            const numericText = text.replace(/[^0-9]/g, '');
                                            setStep2Data(prevState => ({ ...prevState, approxrentalincome: numericText }));
                                        }}
                                    />
                                </View>
                            </View>

                            <View style={styles.stepContent}>
                                <Text style={[styles.label, step2Errors.price && { color: 'red' }]}>Current Property Price</Text>
                                <View style={styles.inputContainer}>
                                    <FontAwesome name="rupee" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="Enter current price"
                                        value={formatIndianNumber(step2Data.price)}
                                        onChangeText={text => {
                                            const numericText = text.replace(/[^0-9]/g, '');
                                            setStep2Data(prevState => ({ ...prevState, price: numericText }));
                                        }}
                                    />
                                </View>
                            </View>

                            {/* <View style={styles.stepContent}>
                                <View className='flex-row justify-between items-center'>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={[styles.label, step2Errors.historydate && { color: 'red' }]}>Historical Price</Text>
                                        <View style={styles.inputContainer}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Historical Price"
                                                value={formatIndianNumber(historyPrice)}
                                                keyboardType="numeric"
                                                onChangeText={text => {
                                                    const numericText = text.replace(/[^0-9]/g, '');
                                                    setHistoryPrice(numericText);
                                                }}
                                            />
                                        </View>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.label, step2Errors.historydate && { color: 'red' }]}>Historical Date</Text>
                                        <View style={styles.inputContainer}>
                                            <TouchableOpacity onPress={() => setShow(true)}>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="DD-MM-YYYY"
                                                    value={selectedDate}
                                                    editable={false}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                        {show && (
                                            <DateTimePicker
                                                value={new Date()}
                                                mode="date"
                                                display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                                                onChange={handleDateChange}
                                            />
                                        )}
                                    </View>
                                    <TouchableOpacity onPress={addPriceHistory}>
                                        <Image source={icons.addicon} style={styles.addBtn} />
                                    </TouchableOpacity>
                                </View>
                                {step2Data.historydate.length > 0 && (
                                    <View style={{ flexGrow: 1, minHeight: 1, marginTop: 10 }}>
                                        <FlatList
                                            data={visibleData}
                                            keyExtractor={(item, index) => index.toString()}
                                            nestedScrollEnabled={true}
                                            contentContainerStyle={{
                                                flexGrow: 1,
                                                borderWidth: 1,
                                                borderColor: '#c7c7c7',
                                                borderRadius: 10,
                                            }}
                                            ListHeaderComponent={
                                                <Text className="text-center font-rubik-bold my-2 border-b border-gray-300">
                                                    Price Data for Graph
                                                </Text>
                                            }
                                            renderItem={({ item, index }) => (
                                                <View style={styles.tableRow}>
                                                    <Text style={styles.tableCell}>
                                                        Rs. {parseInt(item.priceValue).toLocaleString()}
                                                    </Text>
                                                    <Text style={styles.tableCell}>{item.dateValue}</Text>
                                                    <TouchableOpacity onPress={() => removePriceHistory(index)}>
                                                        <Text style={styles.removeBtn}>❌</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        />
                                        {currentIndex < step2Data.historydate.length && (
                                            <TouchableOpacity onPress={loadMore} style={styles.addButton}>
                                                <Text style={styles.addButtonText}>View More</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View> */}

                        </ProgressStep>

                        <ProgressStep label="Details"
                            nextBtnText="Next"
                            previousBtnText="Back"
                            nextBtnTextStyle={buttonNextTextStyle}
                            previousBtnTextStyle={buttonPreviousTextStyle}
                            onNext={() => onNextStep(3)}
                            errors={errors}
                        >
                            <View style={styles.stepContent}>
                                <View className='flex flex-row items-center'>
                                    <Text style={[styles.label, step3Errors.amenities && { color: 'red' }]}>Features & Amenities</Text>
                                </View>
                                <View className='flex flex-row align-center'>
                                    <View className='flex-grow'>
                                        <View style={styles.inputContainer}>
                                            <MaterialIcons name="pool" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Enter to Add Amenities"
                                                value={amenity}
                                                onChangeText={setAmenity}
                                                onSubmitEditing={handleAddAmenity}
                                            />
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => handleAddAmenity()}>
                                        <Image source={icons.addicon} style={styles.addBtn} />
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", }}>
                                    <FlatList
                                        data={amenities}
                                        keyExtractor={(item, index) => index.toString()}
                                        horizontal
                                        nestedScrollEnabled
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ flexDirection: "row", alignItems: "center" }}
                                        renderItem={({ item }) => (
                                            <View style={styles.amenityItem}>
                                                <Text className="font-rubik-bold px-2 capitalize text-nowrap text-green-600">{item}</Text>
                                                <TouchableOpacity onPress={() => setAmenities(amenities.filter(a => a !== item))}>
                                                    <Text style={styles.removeBtn}>❌</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    />
                                </View>
                            </View>

                            {(selectedSubCategory !== 'Plot' && selectedSubCategory !== 'Land') && (
                                <View style={styles.stepContent}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <View style={{ flex: 1, marginRight: 5 }}>
                                            <Text style={[styles.label, step3Errors.floor && { color: 'red' }]}>Floor</Text>
                                            <View style={styles.inputContainer}>
                                                <MaterialCommunityIcons name="floor-plan" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                                <TextInput style={styles.input} placeholder="Floor" keyboardType="numeric" value={step3Data.floor} onChangeText={text => setStep3Data({ ...step3Data, floor: text })} />
                                            </View>
                                        </View>
                                        <View style={{ flex: 1, marginRight: 5 }}>
                                            <Text style={[styles.label, step3Errors.bathroom && { color: 'red' }]}>Bathroom</Text>
                                            <View style={styles.inputContainer}>
                                                <MaterialCommunityIcons name="bathtub-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                                <TextInput style={styles.input} placeholder="Bathroom" keyboardType="numeric" value={step3Data.bathroom} onChangeText={text => setStep3Data({ ...step3Data, bathroom: text })} />
                                            </View>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.label, step3Errors.bedroom && { color: 'red' }]}>Bedroom</Text>
                                            <View style={styles.inputContainer}>
                                                <MaterialCommunityIcons name="bed-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                                <TextInput style={styles.input} placeholder="Bedrooms" keyboardType="numeric" value={step3Data.bedroom} onChangeText={text => setStep3Data({ ...step3Data, bedroom: text })} />
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}

                            <View style={styles.stepContent}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View style={{ flex: 1, }}>
                                        <Text style={[styles.label, step3Errors.landArea && { color: 'red' }]}>Land Area</Text>
                                        <View style={styles.inputContainer}>
                                            <MaterialIcons name="zoom-out-map" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                            <TextInput style={styles.input} placeholder="Land area" keyboardType="numeric" value={landArea} onChangeText={(value) => setLandArea(value)} />
                                            <View style={styles.unitpickerContainer}>
                                                <RNPickerSelect
                                                    onValueChange={(value) => setSelectedUnit(value)}
                                                    items={units}
                                                    value={selectedUnit}
                                                    style={pickerSelectStyles}
                                                    placeholder={{ label: 'Choose an unit...', value: null }}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.stepContent}>
                                <View style={{ flex: 1, marginLeft: 5 }}>
                                    <Text style={[styles.label, step3Errors.city && { color: 'red' }]}>City</Text>
                                    <View style={styles.inputContainer}>
                                        <MaterialCommunityIcons name="city-variant-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                        <TextInput style={styles.input} placeholder="Enter City" onChangeText={handleSearch} value={step3Data.city} />
                                    </View>
                                </View>
                                {message.text && (
                                    <View style={styles.errorContainer}>
                                        <Text style={styles.errorText}>{message.title}: {message.text}</Text>
                                    </View>
                                )}
                                {suggestions.length > 0 && (
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
                                )}
                                <Text style={[styles.label, step3Errors.officeaddress && { color: 'red' }]}>Property Address</Text>
                                <TextInput
                                    style={styles.textarea}
                                    placeholder="Enter complete address"
                                    value={step3Data.officeaddress}
                                    onChangeText={text => setStep3Data({ ...step3Data, officeaddress: text })}
                                    multiline
                                    numberOfLines={5}
                                    maxLength={120}
                                />
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={[styles.label, step3Errors.fullAddress && { color: 'red' }]}>Find Location on Google Map</Text>
                                <View style={styles.inputContainer}>
                                    <MaterialCommunityIcons name="map-marker-radius-outline" size={24} color="#1F4C6B" style={styles.inputIcon} />
                                    <GooglePlacesAutocomplete
                                        placeholder="Locate your property"
                                        fetchDetails={true}
                                        onPress={handlePlaceSelect}
                                        onFail={(error) => console.error("GooglePlacesAutocomplete Error:", error)}
                                        query={{
                                            key: GOOGLE_MAPS_API_KEY,
                                            language: "en",
                                        }}
                                        styles={{
                                            textInput: styles.mapTextInput,
                                            container: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 15 },
                                            listView: { backgroundColor: "#fff", borderRadius: 10, marginTop: 5 },
                                        }}
                                        debounce={400}
                                    />
                                </View>
                                <View>
                                    <Text className='text-base'>Location: {fullAddress || "Not available"}</Text>
                                </View>
                                <Text style={{ marginTop: 10, fontWeight: "bold" }}>Pin Location on Map</Text>
                                <Text style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>
                                    Tap on the map or drag the marker to set the property location.
                                </Text>
                                <View>
                                    <MapView
                                        style={{ height: 150, borderRadius: 10 }}
                                        region={{
                                            latitude: region.latitude || 20.5937,
                                            longitude: region.longitude || 78.9629,
                                            latitudeDelta: region.latitudeDelta || 0.015,
                                            longitudeDelta: region.longitudeDelta || 0.0121,
                                        }}
                                        moveOnMarkerPress={false}
                                        onPress={async (e) => {
                                            const { latitude, longitude } = e.nativeEvent.coordinate;
                                            setCoordinates({ latitude, longitude });
                                            setRegion((prevRegion) => ({
                                                ...prevRegion,
                                                latitude,
                                                longitude,
                                            }));
                                            await updateFullAddress(latitude, longitude);
                                        }}
                                    >
                                        {(coordinates.latitude && coordinates.longitude) && (
                                            <Marker
                                                coordinate={{
                                                    latitude: parseFloat(coordinates.latitude),
                                                    longitude: parseFloat(coordinates.longitude),
                                                }}
                                                draggable
                                                onDragEnd={async (e) => {
                                                    const { latitude, longitude } = e.nativeEvent.coordinate;
                                                    setCoordinates({ latitude, longitude });
                                                    setRegion((prevRegion) => ({
                                                        ...prevRegion,
                                                        latitude,
                                                        longitude,
                                                    }));
                                                    await updateFullAddress(latitude, longitude);
                                                }}
                                            />
                                        )}
                                    </MapView>
                                    {/* <View className='flex-col bg-primary-100 rounded-lg mt-2 p-2'>
                                    <Text className='font-rubik-medium'>Latitude: {coordinates.latitude || "Not set"}</Text>
                                    <Text className='font-rubik-medium'>Longitude: {coordinates.longitude || "Not set"}</Text>
                                </View> */}
                                </View>
                            </View>
                        </ProgressStep>

                        <ProgressStep label="Files"
                            finishBtnText="Save"
                            previousBtnText="Back"
                            // nextBtnTextStyle={buttonNextTextStyle}
                            previousBtnTextStyle={buttonPreviousTextStyle}
                            nextBtnTextStyle={buttonFinishTextStyle}
                            onSubmit={handleFormSubmission}>


                            <View style={styles.stepContent}>

                                {/* upload gallery */}
                                <Text style={[styles.label, step4Errors.galleryImages && { color: 'red' }]}>Property Gallery</Text>
                                <View style={{ flexGrow: 1, minHeight: 1 }}>
                                    <FlatList
                                        data={galleryImages}
                                        horizontal
                                        keyExtractor={(item, index) => index.toString()}
                                        nestedScrollEnabled={true}
                                        contentContainerStyle={styles.fileContainer}
                                        renderItem={({ item, index }) => (
                                            <View style={styles.thumbnailBox} className="border border-gray-300">
                                                <Image source={{ uri: item }} style={styles.thumbnail} />
                                                <Text className="text-center font-rubik-bold">Image: {index + 1}</Text>

                                                <TouchableOpacity
                                                    onPress={() => removeGalleryImage(index, item)}
                                                    style={styles.deleteButton}>
                                                    <Text className="text-white">X</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    />
                                </View>
                                <TouchableOpacity onPress={() => openSourceModal('galleryImages')} style={styles.dropbox}>
                                    <Ionicons name="images-outline" size={24} color="#234F68" style={styles.inputIcon} />
                                    <Text style={{ textAlign: 'center' }}>Pick property images</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Upload video */}
                            <View style={[styles.label, step4Errors.videos && { color: 'red' }]}>
                                <Text style={styles.label}>Upload Videos</Text>
                                <View style={{ flexGrow: 1, minHeight: 1 }}>
                                    <FlatList
                                        data={videos}
                                        horizontal
                                        keyExtractor={(item) => item.id.toString()}
                                        nestedScrollEnabled={true}
                                        contentContainerStyle={styles.fileContainer}
                                        renderItem={({ item, index }) => (
                                            <View style={styles.thumbnailBox} className="border border-gray-300">
                                                <Image
                                                    source={{ uri: `${item.thumbnailImages}?update=${new Date().getTime()}` }}
                                                    style={styles.thumbnail}
                                                />
                                                <Text className="text-center font-rubik-bold">Video {index + 1}</Text>

                                                <TouchableOpacity
                                                    onPress={() => removeVideo(index, item.uri)}
                                                    style={styles.deleteButton}
                                                >
                                                    <Text className="text-white">X</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    />
                                </View>

                                <TouchableOpacity onPress={() => openSourceModal('video')} style={styles.dropbox}>
                                    <FontAwesome name="file-video-o" size={24} color="#234F68" style={styles.inputIcon} />
                                    <Text style={{ textAlign: 'center' }}>Pick property videos</Text>
                                </TouchableOpacity>

                            </View>

                            {/* upload doc */}
                            <View style={[styles.label, step4Errors.propertyDocuments && { color: 'red' }]}>
                                <Text style={styles.label}>Upload Property Documents</Text>
                                <View style={{ flexGrow: 1, minHeight: 1 }}>
                                    <FlatList
                                        data={propertyDocuments}
                                        horizontal
                                        nestedScrollEnabled={true}
                                        keyExtractor={(_, index) => index.toString()}
                                        contentContainerStyle={styles.fileContainer}
                                        renderItem={({ item, index }) => (
                                            <View style={styles.thumbnailBox} className="border border-gray-300">
                                                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                                                <Text className="text-center font-rubik-bold">Doc {index + 1}</Text>

                                                <TouchableOpacity
                                                    onPress={() => removeDocument(index, item.uri)}
                                                    style={styles.deleteButton}>
                                                    <Text className="text-white">X</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    />
                                </View>
                                <TouchableOpacity onPress={pickDocument} style={styles.dropbox}>
                                    <FontAwesome name="file-pdf-o" size={24} color="#234F68" style={styles.inputIcon} />
                                    <Text style={{ textAlign: 'center' }}>Pick property documents</Text>
                                </TouchableOpacity>
                            </View>

                            {/* upload marster plan */}
                            <View style={styles.stepContent}>
                                <Text style={[styles.label, step4Errors.masterPlanDoc && { color: 'red' }]}>Upload Property Master Plan</Text>
                                <View style={{ flexGrow: 1, minHeight: 1 }}>
                                    <FlatList
                                        data={masterPlanDoc}
                                        horizontal
                                        nestedScrollEnabled={true}
                                        keyExtractor={(_, index) => index.toString()}
                                        contentContainerStyle={styles.fileContainer}
                                        renderItem={({ item, index }) => (
                                            <View style={styles.thumbnailBox} className="border border-gray-300">
                                                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                                                <Text className="text-center font-rubik-bold">Plan {index + 1}</Text>

                                                <TouchableOpacity
                                                    onPress={() => removeMasterPlan(index, item.uri)}
                                                    style={styles.deleteButton}>
                                                    <Text className="text-white">X</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    />
                                </View>
                                <TouchableOpacity onPress={pickMasterPlan} style={styles.dropbox}>
                                    <MaterialCommunityIcons name="floor-plan" size={24} color="#234F68" style={styles.inputIcon} />
                                    <Text style={{ textAlign: 'center' }}>Pick property Floor Plan</Text>
                                </TouchableOpacity>
                            </View>
                        </ProgressStep>
                    </ProgressSteps>
                </View>
            )}

            {loading && (
                <View className='absolute bottom-28 z-40 right-16'>
                    <ActivityIndicator />
                </View>
            )}

            {/* Success RBSheet */}
            <RBSheet
                ref={successSheetRef}
                closeOnDragDown={true}
                closeOnPressMask={true}
                customStyles={{
                    container: {
                        backgroundColor: '#f4f2f7',
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        padding: 20,
                    },
                }}
                height={300}
                openDuration={250}
            >
                <View style={{ alignItems: 'center' }}>
                    {/* <Ionicons name="checkmark-circle" size={50} color="#28a745" /> */}
                    <Image source={icons.alertSuccess} style={{ width: 100, height: 100 }} />
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#28a745', marginTop: 10 }}>
                        Success
                    </Text>
                    <Text style={{ fontSize: 16, textAlign: 'center', marginTop: 10 }}>
                        Process successfull!
                    </Text>
                    <TouchableOpacity
                        style={{ backgroundColor: '#28a745', padding: 10, borderRadius: 10, marginTop: 20 }}
                        onPress={() => {
                            setSuccessVisible(false);
                            if (successSheetRef.current) successSheetRef.current.close();
                            router.push('/myassets');
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                    </TouchableOpacity>
                </View>
            </RBSheet>

            {/* Error RBSheet */}
            <RBSheet
                ref={errorSheetRef}
                closeOnDragDown={true}
                closeOnPressMask={true}
                customStyles={{
                    container: {
                        backgroundColor: '#f4f2f7',
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        padding: 20,
                    },
                }}
                height={errorField ? 300 : 200}
                openDuration={250}
            >
                <View style={{ alignItems: 'center' }}>
                    {/* <Ionicons name="close-circle" size={50} color="#dc3545" /> */}
                    <Image source={icons.alertDanger} style={{ width: 100, height: 100 }} />
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#dc3545', marginTop: 10 }}>
                        Error
                    </Text>
                    <Text style={{ fontSize: 16, textAlign: 'center', marginTop: 10 }}>
                        {errorField && typeof errorField === 'string' && !errorField.includes('Failed')
                            ? `Please fill the ${errorField} field.`
                            : errorField || 'An error occurred. Please try again.'}
                    </Text>

                    <TouchableOpacity
                        style={{ backgroundColor: '#dc3545', padding: 10, borderRadius: 10, marginTop: 10 }}
                        onPress={() => {
                            setErrorVisible(false);
                            if (errorSheetRef.current) errorSheetRef.current.close();
                        }}
                    >
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Close</Text>
                    </TouchableOpacity>
                </View>
            </RBSheet>

            {/* Confirm Delete RBSheet */}
            <RBSheet
                ref={confirmDeleteRef}
                closeOnDragDown={true}
                closeOnPressMask={true}
                customStyles={{
                    container: {
                        backgroundColor: '#f4f2f7',
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        padding: 20,
                    },
                }}
                height={300}
                openDuration={250}
            >
                <View style={{ alignItems: 'center' }}>
                    <Image source={icons.alertWarning} style={{ width: 100, height: 100 }} />
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'red', marginTop: 10 }}>
                        Warning
                    </Text>
                    <Text style={{ fontSize: 16, textAlign: 'center', marginTop: 10 }}>
                        Are you sure you want to delete this property? This action cannot be undone.
                    </Text>
                    <View style={{ flexDirection: 'row', marginTop: 20 }}>
                        <TouchableOpacity
                            style={{ backgroundColor: '#6c757d', padding: 10, borderRadius: 10, marginRight: 10 }}
                            onPress={() => {
                                if (confirmDeleteRef.current) confirmDeleteRef.current.close();
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{ backgroundColor: '#dc3545', padding: 10, borderRadius: 10 }}
                            onPress={handleDeleteProperty}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </RBSheet>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {modalType === 'video' ? 'Select Video Source' : 'Select Image Source'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                                <Text style={styles.modalCloseText}>×</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalContent}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.modalOption}
                                onPress={() => {
                                    if (modalType === 'mainImage') pickMainImage('camera');
                                    else if (modalType === 'galleryImages') pickGalleryImages('camera');
                                    else if (modalType === 'video') pickVideo('camera');
                                }}
                            >
                                <View style={styles.modalOptionBackground}>
                                    <Ionicons name="camera-outline" size={40} color="#fff" style={styles.modalOptionIcon} />
                                    <Text style={styles.modalOptionText}>Camera</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.modalOption}
                                onPress={() => {
                                    if (modalType === 'mainImage') pickMainImage('gallery');
                                    else if (modalType === 'galleryImages') pickGalleryImages('gallery');
                                    else if (modalType === 'video') pickVideo('gallery');
                                }}
                            >
                                <View style={styles.modalOptionBackground}>
                                    <Ionicons name="images-outline" size={40} color="#fff" style={styles.modalOptionIcon} />
                                    <Text style={styles.modalOptionText}>Gallery</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <RBSheet
                ref={rbSheetRef}
                animationType="slide"
                height={400}
                openDuration={300}
                closeOnDragDown={true}
                closeOnPressMask={true}
                customStyles={{
                    container: styles.sheetContainer,
                    draggableIcon: styles.draggableIcon,
                }}
                onClose={() => {
                    if (sheetMessage.type === 'success') {
                        resetForm();
                        router.back();
                    }
                }}
            >
                <View style={styles.sheetHeader}>
                    <Text style={[
                        styles.sheetTitle,
                        { color: sheetMessage.type === 'success' ? '#4CAF50' : '#F44336' }
                    ]}>
                        {sheetMessage.title}
                    </Text>
                    <TouchableOpacity
                        style={styles.sheetCloseButton}
                        onPress={() => rbSheetRef.current.close()}
                    >
                        <Feather name="x" size={24} color="#234F68" />
                    </TouchableOpacity>
                </View>
                <View style={styles.sheetContent}>
                    <Feather
                        name={sheetMessage.type === 'success' ? 'check-circle' : 'alert-circle'}
                        size={48}
                        color={sheetMessage.type === 'success' ? '#4CAF50' : '#F44336'}
                        style={styles.sheetIcon}
                    />
                    <Text style={styles.sheetMessageText}>{sheetMessage.message}</Text>
                    <TouchableOpacity
                        style={[
                            styles.sheetActionButton,
                            { backgroundColor: sheetMessage.type === 'success' ? '#4CAF50' : '#F44336' }
                        ]}
                        onPress={() => {
                            rbSheetRef.current.close();
                            if (sheetMessage.type === 'success') {
                                resetForm();
                                router.back();
                            }
                        }}
                    >
                        <Text style={styles.sheetActionButtonText}>
                            {sheetMessage.type === 'success' ? 'Continue' : 'Try Again'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </RBSheet>
        </View>
    );
};

export default Editproperty;

// Styles remain unchanged
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    stepContent: {
        borderWidth: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        borderColor: '#f4f2f7',
        padding: 10,
        marginBottom: 10,
    },
    fileContainer: {
        padding: 5,
        backgroundColor: '#fff',
        flexDirection: 'row',
        display: 'flex',
    },
    deleteButton: {
        paddingHorizontal: 7,
        color: 'white',
        borderWidth: 1,
        borderRadius: 7,
        borderColor: 'red',
        marginLeft: 10,
        backgroundColor: 'red',
        width: 25,
        position: 'absolute',
        top: 0,
        right: 0,
    },
    label: {
        fontSize: 16,
        marginHorizontal: 5,
        marginTop: 10,
        fontWeight: 'bold',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 15,
        marginBlock: 10,
        padding: 10,
    },
    inputIcon: { marginEnd: 10 },
    input: {
        flex: 1,
        height: 45,
        paddingHorizontal: 10,
        fontFamily: 'Rubik-Regular',
        color: '#000',
    },
    amenityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 50,
        marginRight: 5,
        marginBottom: 5,
        backgroundColor: '#f3f4f6',
        borderColor: 'green',
        borderWidth: 1,
    },
    removeBtn: {
        color: 'red',
        fontWeight: 'bold',
        fontSize: 12,
        marginEnd: 5,
        marginTop: 0,
    },
    addBtn: {
        width: 40,
        height: 40,
        marginStart: 10,
        marginTop: 15,
    },
    mapTextInput: {
        width: '100%',
        height: 50,
        backgroundColor: "#f3f4f6",
    },
    editor: {
        flex: 1,
        padding: 0,
        borderColor: 'gray',
        borderWidth: 1,
        marginHorizontal: 30,
        marginVertical: 5,
        backgroundColor: 'white',
    },
    textarea: {
        textAlignVertical: 'top',
        height: 110,
        fontSize: 14,
        marginTop: 10,
        paddingTop: 10,
        borderRadius: 15,
        color: '#000',
        padding: 15,
        backgroundColor: '#f3f4f6',
    },
    image: {
        width: 75,
        height: 75,
        borderRadius: 10,
    },
    thumbnail: {
        width: 73,
        height: 70,
        borderRadius: 10,
    },
    thumbnailBox: {
        width: 75,
        height: 95,
        borderRadius: 10,
        marginRight: 10,
    },
    dropbox: {
        height: 80,
        padding: 5,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#234F68',
        backgroundColor: '#f3f4f6',
        borderRadius: 10,
        marginTop: 5,
        marginRight: 10,
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    map: {
        width: '100%',
        height: 150,
        marginTop: 10
    },
    addButton: {
        backgroundColor: '#234F68',
        padding: 10,
        marginTop: 10,
        borderRadius: 5
    },
    addButtonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold'
    },
    tableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10
    },
    tableCell: {
        flex: 1,
        textAlign: 'center',
        borderEnd: 1,
        borderColor: '#c7c7c7',
        fontWeight: 600,
    },
    unitpickerContainer: {
        width: 110,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
    },
    pickerContainer: {
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#f3f4f6',
        marginTop: 10,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '400',
        color: '#4A5568',
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        marginVertical: 10,
        paddingHorizontal: 5,
    },
    categoryButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        margin: 5,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    categoryButtonSelected: {
        backgroundColor: '#1F4C6B',
        borderColor: '#1F4C6B',
    },
    categoryText: {
        fontSize: 14,
        color: '#000',
        textAlign: 'center',
    },
    categoryTextSelected: {
        color: '#fff',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Rubik-Bold',
        color: '#234F68',
    },
    modalCloseButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#f4f2f7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCloseText: {
        fontSize: 20,
        color: '#234F68',
        fontWeight: 'bold',
    },
    modalContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalOption: {
        flex: 1,
        marginHorizontal: 10,
    },
    modalOptionBackground: {
        backgroundColor: '#234F68',
        borderRadius: 15,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOptionIcon: {
        marginBottom: 10,
    },
    modalOptionText: {
        fontSize: 16,
        fontFamily: 'Rubik-Regular',
        color: '#fff',
    },
    sheetContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    draggableIcon: {
        backgroundColor: '#D3D3D3',
        width: 40,
        height: 5,
        borderRadius: 3,
        marginVertical: 10,
        alignSelf: 'center',
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    sheetTitle: {
        fontSize: 20,
        fontFamily: 'Rubik-Bold',
        color: '#234F68',
    },
    sheetCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F4F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetContent: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    sheetIcon: {
        marginBottom: 16,
    },
    sheetMessageText: {
        fontSize: 16,
        fontFamily: 'Rubik-Regular',
        color: '#333333',
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    sheetActionButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '80%',
        alignItems: 'center',
    },
    sheetActionButtonText: {
        fontSize: 16,
        fontFamily: 'Rubik-Medium',
        color: '#FFFFFF',
    },
    pendingContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        maxWidth: 400,
        margin: 20,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.1,
        // shadowRadius: 4,
        // elevation: 2, // For Android shadow
    },
    pendingTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginVertical: 16,
        textAlign: 'center',
    },
    pendingMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 24, // Line height is approximated for React Native
    },
    contactButton: {
        backgroundColor: '#007bff',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 6,
    },
    contactButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    suggestionsList: { backgroundColor: '#fff', borderRadius: moderateScale(10), maxHeight: verticalScale(200), width: '100%', marginBottom: verticalScale(10) },
    suggestionItem: { padding: moderateScale(10), borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    suggestionText: { fontFamily: 'Rubik-Regular', color: '#555', fontSize: scale(14) },
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

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingHorizontal: 10,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        color: 'black',
        paddingRight: 30,
    },
    inputAndroid: {
        fontSize: 16,
        paddingHorizontal: 10,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
        color: 'black',
        paddingRight: 30,
    },


});
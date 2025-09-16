import { View, ActivityIndicator, ScrollView, RefreshControl, Dimensions, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSharedValue, withSpring } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import * as Linking from "expo-linking";
import PropertyHeader from "../../../components/PropertyDetails/PropertyHeader";
import PropertyDescription from "../../../components/PropertyDetails/PropertyDescription";
import PropertyGallery from "../../../components/PropertyDetails/PropertyGallery";
import PropertyVideos from "../../../components/PropertyDetails/PropertyVideos";
import PropertyMap from "../../../components/PropertyDetails/PropertyMap";
import MasterPlanSection from "../../../components/PropertyDetails/MasterPlanSection";
import LightboxModal from "../../../components/PropertyDetails/LightboxModal";
import images from "@/constants/images";
import { v4 as uuidv4 } from 'uuid';
import BottomBar from "../../../components/PropertyDetails/BottomBar";
import FeedbackSheet from "../../../components/PropertyDetails/FeedbackSheet";

const ProjectDetails = () => {
    const projectId = useLocalSearchParams().id;
    const windowHeight = Dimensions.get("window").height;
    const windowWidth = Dimensions.get("window").width;
    const [projectData, setProjectData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [projectThumbnail, setProjectThumbnail] = useState(images.avatar);
    const [projectGallery, setProjectGallery] = useState([]);
    const [videoUrls, setVideoUrls] = useState([]);
    const [masterPlanDocs, setMasterPlanDocs] = useState([]);
    const [isPdf, setIsPdf] = useState(false);
    const [isLightboxVisible, setIsLightboxVisible] = useState(false);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
    const [coordinates, setCoordinates] = useState('');
    const [region, setRegion] = useState({
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });
    const [totalVisits, setTotalVisits] = useState('');
    const [loggedinUserId, setLoggedinUserId] = useState(null); // Add state for loggedinUserId
    const navigation = useNavigation();
    const videoRef = useRef(null);
    const lightboxRef = useRef(null);
    const rbSheetRef = useRef(null);
    const successSheetRef = useRef(null);
    const errorSheetRef = useRef(null);
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);

    // Fetch logged-in user ID
    const fetchUserData = async () => {
        try {
            const userData = await AsyncStorage.getItem("userData");
            const parsedUserData = userData ? JSON.parse(userData) : null;
            setLoggedinUserId(parsedUserData?.id || null);
            console.log('Logged-in User ID:', parsedUserData?.id);
        } catch (error) {
            console.error('Error fetching user data:', error);
            setLoggedinUserId(null);
        }
    };

    // Parse project coordinates to set map region
    const parseProjectCoordinates = (coordinatesStr) => {
        try {
            const coords = JSON.parse(coordinatesStr);
            if (!Array.isArray(coords) || coords.length === 0) {
                return { centroid: { latitude: 20.5937, longitude: 78.9629 }, polygon: [] };
            }
            const polygon = coords.map(c => ({
                latitude: parseFloat(c.lat || c.latitude),
                longitude: parseFloat(c.lng || c.longitude),
            })).filter(c => !isNaN(c.latitude) && !isNaN(c.longitude));
            if (polygon.length === 0) {
                return { centroid: { latitude: 20.5937, longitude: 78.9629 }, polygon: [] };
            }
            let latSum = 0, lngSum = 0;
            polygon.forEach(c => {
                latSum += c.latitude;
                lngSum += c.longitude;
            });
            const centroid = {
                latitude: latSum / polygon.length,
                longitude: lngSum / polygon.length,
            };
            return { centroid, polygon };
        } catch (error) {
            console.error('Error parsing project coordinates:', error);
            return { centroid: { latitude: 20.5937, longitude: 78.9629 }, polygon: [] };
        }
    };

    const fetchProjectData = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem('userToken');

            const response = await axios.get(`https://landsquire.in/api/fetchproject/${projectId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });

            if (response.data && response.data.projectData) {
                const apiData = response.data.projectData;
                setProjectData(apiData);
                // console.log('Project Data:', apiData); // Debug log

                // Set thumbnail
                const thumbnail = apiData.thumbnail;
                const thumbnailUri =
                    thumbnail && typeof thumbnail === "string"
                        ? thumbnail.startsWith("http")
                            ? thumbnail
                            : `https://landsquire.in/adminAssets/images/Projects/${thumbnail}`
                        : images.avatar;
                setProjectThumbnail(thumbnailUri);

                // Set gallery
                let galleryImages = [];
                try {
                    if (apiData.gallery && typeof apiData.gallery === "string" && apiData.gallery.trim()) {
                        const parsedGallery = JSON.parse(apiData.gallery);
                        galleryImages = Array.isArray(parsedGallery)
                            ? parsedGallery.map((image) => ({
                                id: Math.random().toString(36).substring(2, 11),
                                image:
                                    typeof image === "string" && image.startsWith("http")
                                        ? image
                                        : `https://landsquire.in/${image.replace(/\\/g, "/")}` || images.avatar,
                            }))
                            : [];
                    }
                } catch (error) {
                    setError("Error parsing gallery images: " + error.message);
                    console.error("Gallery parsing error:", error);
                    galleryImages = [];
                }
                setProjectGallery(galleryImages);

                // Set master plan document
                if (apiData.document) {
                    const fileUrl = `https://landsquire.in/adminAssets/images/Projects/${apiData.document}`;
                    setIsPdf(fileUrl.toLowerCase().endsWith(".pdf"));
                    setMasterPlanDocs([fileUrl]);
                } else {
                    setMasterPlanDocs([]);
                }

                // Set coordinates and region for map
                if (apiData.coordinates && typeof apiData.coordinates === "string" && apiData.coordinates.trim()) {
                    try {
                        JSON.parse(apiData.coordinates);
                        const { centroid, polygon } = parseProjectCoordinates(apiData.coordinates);
                        setCoordinates(apiData.coordinates);
                        setRegion({
                            latitude: centroid.latitude || 20.5937,
                            longitude: centroid.longitude || 78.9629,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        });
                    } catch (error) {
                        console.error('Invalid coordinates JSON:', apiData.coordinates, error);
                        setCoordinates('');
                        setRegion({
                            latitude: 20.5937,
                            longitude: 78.9629,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        });
                    }
                } else {
                    setCoordinates('');
                    setRegion({
                        latitude: 20.5937,
                        longitude: 78.9629,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    });
                }

                // Note: Videos, amenities, price history, and broker data are not available in project data
                setVideoUrls([]);
            } else {
                setError("Unexpected API response format or project not found.");
            }
        } catch (error) {
            setError(`Error fetching project data: ${error.message}`);
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const trackVisitor = async (projectId) => {
        try {
            let visitorToken = await AsyncStorage.getItem('visitor_token');
            if (!visitorToken) {
                visitorToken = uuidv4();
                await AsyncStorage.setItem('visitor_token', visitorToken);
            }

            const userData = await AsyncStorage.getItem("userData");
            const parsedUserData = userData ? JSON.parse(userData) : null;
            const userId = parsedUserData?.id || null;
            const token = await AsyncStorage.getItem('userToken');

            const visitData = {
                property_id: projectId,
                user_id: userId,
                visitor_token: visitorToken,
                details: {
                    user_agent: "ReactNativeApp",
                },
            };

            const response = await axios.post(
                "https://landsquire.in/api/trackvisit",
                visitData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'User-Agent': 'LandSquireApp/1.0 (React Native)',
                    },
                }
            );

            if (response.data?.data?.visitor_token) {
                await AsyncStorage.setItem('current_visitor_token', response.data.data.visitor_token.toString());

                const countResponse = await axios.get(
                    `https://landsquire.in/api/getVisitorCount/${projectId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'User-Agent': 'LandSquireApp/1.0 (React Native)',
                        },
                    }
                );

                if (countResponse.data?.count) {
                    setTotalVisits(countResponse.data.count);
                }
            }
        } catch (error) {
            console.error("Error tracking visitor:", error.message);
        }
    };

    const handleEnquiry = async (isBid = false) => {
        try {
            setLoading(true);

            const userData = await AsyncStorage.getItem("userData");
            const parsedUserData = userData ? JSON.parse(userData) : null;
            const userId = parsedUserData?.id;
            if (!userId) {
                errorSheetRef.current?.open();
                return;
            }

            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                errorSheetRef.current?.open();
                return;
            }

            const enquiryData = {
                customername: parsedUserData.username || "",
                phone: parsedUserData.mobilenumber || "",
                email: parsedUserData.email || "",
                usercity: parsedUserData.city || "",
                city: projectData.city || "",
                state: projectData.address || "",
                propertytype: projectData.category || "",
                propertyid: projectId,
                userid: parsedUserData.id,
                brokerid: projectData.roleid || "",
                form_type: "project",
                bidamount: isBid ? (bidAmount?.toString().replace(/,/g, "") || "") : "",
            };

            const response = await axios.post(
                "https://landsquire.in/api/sendenquiry",
                enquiryData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.status === 200 && !response.data.error) {
                if (rbSheetRef.current) {
                    rbSheetRef.current.close();
                }

                setTimeout(() => {
                    if (successSheetRef.current) {
                        console.log('Opening success sheet');
                        successSheetRef.current.open();
                    }
                }, 300);
            } else {
                if (rbSheetRef.current) {
                    rbSheetRef.current.close();
                }

                setTimeout(() => {
                    if (errorSheetRef.current) {
                        console.log('Opening error sheet');
                        errorSheetRef.current.open();
                    }
                }, 300);
            }
        } catch (error) {
            console.error("Error submitting enquiry:", error.message);
            if (rbSheetRef.current) {
                rbSheetRef.current.close();
            }

            setTimeout(() => {
                if (errorSheetRef.current) {
                    console.log('Opening error sheet');
                    errorSheetRef.current.open();
                }
            }, 300);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData(); // Fetch loggedinUserId
        fetchProjectData();
        trackVisitor(projectId);
    }, [projectId]);

    const onRefresh = () => {
        setRefreshing(true);
        setError(null);
        fetchProjectData();
        trackVisitor(projectId);
    };

    const openLightbox = (index) => {
        const totalMedia = (projectGallery?.length || 0) + videoUrls.length;
        if (index >= 0 && index < totalMedia) {
            setSelectedMediaIndex(index);
            setIsLightboxVisible(true);
            scale.value = 1;
            savedScale.value = 1;
        }
    };

    const closeLightbox = () => {
        if (videoRef.current) {
            videoRef.current.pauseAsync().catch(() => { });
        }
        setIsLightboxVisible(false);
        setSelectedMediaIndex(0);
        scale.value = 1;
        savedScale.value = 1;
    };

    const navigateLightbox = (direction) => {
        const totalMedia = (projectGallery?.length || 0) + videoUrls.length;
        const newIndex = selectedMediaIndex + direction;
        if (newIndex >= 0 && newIndex < totalMedia) {
            setSelectedMediaIndex(newIndex);
            scale.value = withSpring(1);
            savedScale.value = 1;
            if (videoRef.current) {
                videoRef.current.pauseAsync().catch(() => { });
            }
        }
    };

    const getMediaAtIndex = (index) => {
        const totalMedia = (projectGallery?.length || 0) + videoUrls.length;
        if (index >= 0 && index < totalMedia) {
            const allMedia = [...(projectGallery || []), ...videoUrls];
            const media = allMedia[index];
            return media?.image || media?.url || null;
        }
        return null;
    };

    if (loading || !projectData) {
        return <ActivityIndicator size="large" color="#8bc83f" className="mt-[400px]" />;
    }

    return (
        <View className="pb-24">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32, backgroundColor: "#fafafa" }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#8bc83f"]}
                        tintColor="#8bc83f"
                        progressViewOffset={50}
                    />
                }
            >
                {error && <Text className="text-red-500 text-sm mt-2 px-5">{error}</Text>}
                <PropertyHeader
                    propertyThumbnail={projectThumbnail}
                    isProject={true}
                    propertyData={{
                        ...projectData,
                        property_name: projectData.projecttitle,
                        status: projectData.status,
                    }}
                    loggedinUserId={loggedinUserId}
                />
                <PropertyDescription description={projectData.discription} />
                <PropertyGallery
                    propertyGallery={projectGallery}
                    windowWidth={windowWidth}
                    openLightbox={openLightbox}
                />
                <PropertyVideos
                    videoUrls={videoUrls}
                    windowWidth={windowWidth}
                    openLightbox={openLightbox}
                    selectedMediaIndex={selectedMediaIndex}
                    propertyGalleryLength={projectGallery?.length || 0}
                />
                <PropertyMap
                    coordinates={coordinates}
                    region={region}
                    address={projectData.address || "Project Location"}
                    isProject={true}
                />
                <MasterPlanSection masterPlanDocs={masterPlanDocs} />
            </ScrollView>
            <LightboxModal
                isLightboxVisible={isLightboxVisible}
                closeLightbox={closeLightbox}
                navigateLightbox={navigateLightbox}
                getMediaAtIndex={getMediaAtIndex}
                selectedMediaIndex={selectedMediaIndex}
                propertyGallery={projectGallery}
                videoUrls={videoUrls}
                windowWidth={windowWidth}
                windowHeight={windowHeight}
                videoRef={videoRef}
                scale={scale}
                savedScale={savedScale}
            />
            <BottomBar
                isProject={true}
                propertyData={projectData}
                loggedinUserId={loggedinUserId}
                rbSheetRef={rbSheetRef}
                handleEnquiry={handleEnquiry}
                formatINR={(price) => price ? `₹${parseFloat(price).toLocaleString('en-IN')}` : 'Price not available'}
            />
            <FeedbackSheet
                ref={successSheetRef}
                type="success"
                message="Enquiry submitted successfully!"
                height={350}
            />
            <FeedbackSheet
                ref={errorSheetRef}
                type="error"
                message="An error occurred while submitting the enquiry. Please try again."
                height={350}
                onClose={() => {
                    setError("");
                }}
            />
        </View>
    );
};

export default ProjectDetails;
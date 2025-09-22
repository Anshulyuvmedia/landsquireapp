import { View, ActivityIndicator, ScrollView, RefreshControl, Dimensions, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSharedValue, withSpring } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import * as Linking from "expo-linking";
import PropertyHeader from "../../../components/PropertyDetails/PropertyHeader";
import PropertyDetailsSection from "../../../components/PropertyDetails/PropertyDetailsSection";
import PropertyDescription from "../../../components/PropertyDetails/PropertyDescription";
import PropertyGallery from "../../../components/PropertyDetails/PropertyGallery";
import PropertyVideos from "../../../components/PropertyDetails/PropertyVideos";
import BrokerCard from "../../../components/PropertyDetails/BrokerCard";
import NearbyInfo from "../../../components/PropertyDetails/NearbyInfo";
import AmenitiesList from "../../../components/PropertyDetails/AmenitiesList";
import PropertyMap from "../../../components/PropertyDetails/PropertyMap";
import MasterPlanSection from "../../../components/PropertyDetails/MasterPlanSection";
// import PriceHistorySection from "../../../components/PropertyDetails/PriceHistorySection";
import LightboxModal from "../../../components/PropertyDetails/LightboxModal";
import BottomBar from "../../../components/PropertyDetails/BottomBar";
import BidSheet from "../../../components/PropertyDetails/BidSheet";
import FeedbackSheet from "../../../components/PropertyDetails/FeedbackSheet";
import images from "@/constants/images";
import icons from "@/constants/icons";
import { getUUIDSync } from '@/utils/uuid';

const PropertyDetails = () => {
    const propertyId = useLocalSearchParams().id;
    const windowHeight = Dimensions.get("window").height;
    const windowWidth = Dimensions.get("window").width;
    const [propertyData, setPropertyData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [propertyThumbnail, setPropertyThumbnail] = useState(images.avatar);
    const [propertyGallery, setPropertyGallery] = useState([]);
    const [videoUrls, setVideoUrls] = useState([]);
    const [loggedinUserId, setLoggedinUserId] = useState("");
    const [amenities, setAmenities] = useState([]);
    const [priceHistoryData, setPriceHistoryData] = useState([]);
    const [masterPlanDocs, setMasterPlanDocs] = useState([]);
    const [isPdf, setIsPdf] = useState(false);
    const [isLightboxVisible, setIsLightboxVisible] = useState(false);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
    const [bidAmount, setBidAmount] = useState("");
    const [bidError, setBidError] = useState("");
    const [bidStatus, setBidStatus] = useState(null);
    const [bidBtn, setBidBtn] = useState("");
    const [brokerData, setBrokerData] = useState(null);
    const videoRef = useRef(null);
    const lightboxRef = useRef(null);
    const rbSheetRef = useRef(null);
    const successSheetRef = useRef(null);
    const errorSheetRef = useRef(null);
    const [coordinates, setCoordinates] = useState({ latitude: "", longitude: "" });
    const [region, setRegion] = useState({
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
    });
    const navigation = useNavigation();
    const [totalVisits, setTotalVisits] = useState('');
    // Pinch-to-zoom state
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);

    const handleEditPress = (id) => {
        if (propertyData?.propertyfor?.toLowerCase() === "rent") {
            router.push(`/Rent/editrentproperty/${id}`);
        } else {
            router.push(`/dashboard/editproperties/${id}`);
        }
    };

    const openWhatsApp = (phoneNumber) => {
        if (!phoneNumber) {
            setError("Invalid phone number.");
            return;
        }
        const cleanedNumber = phoneNumber.replace(/\D/g, "");
        const appUrl = `whatsapp://send?phone=${cleanedNumber}`;
        const webUrl = `https://wa.me/${cleanedNumber}`;
        Linking.openURL(appUrl).catch(() => {
            Linking.openURL(webUrl).catch(() => {
                setError("Unable to open WhatsApp.");
            });
        });
    };

    const handleCall = (phoneNumber) => {
        if (!phoneNumber) {
            setError("Invalid phone number.");
            return;
        }
        const cleanedNumber = phoneNumber.replace(/\D/g, "");
        const url = `tel:${cleanedNumber}`;
        Linking.openURL(url).catch(() => {
            setError("Unable to make a call.");
        });
    };

    const handleEnquiry = async (isBid = false) => {
        try {
            setLoading(true);
            setBidStatus(null);

            const parsedUserData = JSON.parse(await AsyncStorage.getItem("userData"));
            const userId = parsedUserData?.id;
            if (!userId) {
                setBidStatus({ type: "error", message: "User not logged in." });
                return;
            }

            const enquiryData = {
                customername: parsedUserData.username || "",
                phone: parsedUserData.mobilenumber || "",
                email: parsedUserData.email || "",
                usercity: parsedUserData.city || "",
                city: propertyData.city || "",
                state: propertyData.address || "",
                propertytype: propertyData.category || "",
                propertyid: propertyId,
                userid: parsedUserData.id,
                brokerid: propertyData.roleid || "",
                form_type: "broker" || "",
                // 👇 Only include bidamount if this is a bid
                bidamount: isBid ? (bidAmount?.toString().replace(/,/g, "") || "") : "",
            };

            const response = await axios.post("https://landsquire.in/api/sendenquiry", enquiryData);

            // console.log("response:", response.data);

            if (response.status === 200 && !response.data.error) {
                setBidStatus({
                    type: "success",
                    message: isBid ? "Bid submitted successfully!" : "Enquiry submitted successfully!"
                });

                // Close bid/enquiry sheet if open
                if (rbSheetRef.current) {
                    rbSheetRef.current.close();
                }

                // Open success sheet after a short delay
                setTimeout(() => {
                    if (successSheetRef.current) {
                        successSheetRef.current.open();
                    }
                }, 300);
            } else {
                setBidStatus({ type: "error", message: "Failed to submit. Please try again." });

                if (rbSheetRef.current) {
                    rbSheetRef.current.close();
                }

                setTimeout(() => {
                    if (errorSheetRef.current) {
                        errorSheetRef.current.open();
                    }
                }, 300);
            }

        } catch (error) {
            setBidStatus({ type: "error", message: "An error occurred. Please try again." });
            if (rbSheetRef.current) {
                rbSheetRef.current.close();
                errorSheetRef.current.open();
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchPropertyData = async (propertyId) => {
        try {
            setLoading(true);
            setError(null);
            const parsedUserData = JSON.parse(await AsyncStorage.getItem("userData"));
            const token = await AsyncStorage.getItem('userToken');
            setLoggedinUserId(parsedUserData?.id || "");
            // console.log('before sending id ', propertyId);

            const response = await axios.get(`https://landsquire.in/api/property-details/${propertyId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });
            if (response.data && response.data.details) {
                const apiData = response.data.details;
                setPropertyData(apiData);
                // console.log(apiData.bidstatus);
                setBidBtn(apiData.bidstatus)

                const thumbnail = apiData.thumbnail;
                const thumbnailUri =
                    thumbnail && typeof thumbnail === "string"
                        ? thumbnail.startsWith("http")
                            ? thumbnail
                            : `https://landsquire.in/adminAssets/images/Listings/${thumbnail}`
                        : images.avatar;
                setPropertyThumbnail(thumbnailUri);
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
                setPropertyGallery(galleryImages);
                let parsedVideos = [];
                try {
                    if (apiData.videos && typeof apiData.videos === "string" && apiData.videos.trim()) {
                        parsedVideos = JSON.parse(apiData.videos);
                        if (!Array.isArray(parsedVideos)) {
                            console.warn("Parsed videos is not an array:", parsedVideos);
                            parsedVideos = [];
                        }
                    } else if (Array.isArray(apiData.videos)) {
                        parsedVideos = apiData.videos;
                    } else {
                        console.warn("No valid videos data:", apiData.videos);
                        parsedVideos = [];
                    }
                    parsedVideos = parsedVideos.map((video, index) => {
                        const videoUrl =
                            typeof video === "string" && video.startsWith("http")
                                ? video
                                : `https://landsquire.in/${video.replace(/\\/g, "/")}` || "";
                        if (!videoUrl) {
                            console.warn(`Invalid video URL at index ${index}:`, video);
                        }
                        return {
                            id: `video-${index}`,
                            url: videoUrl,
                            title: `Video ${index + 1}`,
                            thumbnail: images.videoPlaceholder || icons.videofile,
                        };
                    });
                } catch (error) {
                    setError("Error parsing videos: " + error.message);
                    console.error("Video parsing error:", error, "Raw videos data:", apiData.videos);
                    parsedVideos = [];
                }
                setVideoUrls(parsedVideos);
                let parsedAmenities = [];
                try {
                    parsedAmenities = apiData.amenties ? JSON.parse(apiData.amenties) : [];
                } catch (error) {
                    setError("Error parsing amenities: " + error.message);
                    console.error("Amenities parsing error:", error);
                }
                setAmenities(parsedAmenities);
                let priceHistory = [];
                try {
                    priceHistory = apiData.pricehistory ? JSON.parse(apiData.pricehistory) : [];
                } catch (error) {
                    setError("Error parsing price history: " + error.message);
                    console.error("Price history parsing error:", error);
                }
                setPriceHistoryData(Array.isArray(priceHistory) ? priceHistory : []);
                if (apiData.maplocations) {
                    try {
                        const locationData = JSON.parse(apiData.maplocations);
                        const latitude = parseFloat(locationData.Latitude);
                        const longitude = parseFloat(locationData.Longitude);
                        if (latitude && longitude) {
                            setCoordinates({ latitude, longitude });
                            setRegion({ latitude, longitude, latitudeDelta: 0.015, longitudeDelta: 0.0121 });
                        }
                    } catch (error) {
                        setError("Error parsing map locations: " + error.message);
                        console.error("Map locations parsing error:", error);
                    }
                }
                if (apiData.masterplandoc) {
                    const fileUrl = `https://landsquire.in/adminAssets/images/Listings/${apiData.masterplandoc}`;
                    setIsPdf(fileUrl.toLowerCase().endsWith(".pdf"));
                    setMasterPlanDocs([fileUrl]);
                } else {
                    setMasterPlanDocs([]);
                }
                const brokerDataFromApi = response.data.brokerdata && response.data.brokerdata.length > 0 ? response.data.brokerdata[0] : null;
                setBrokerData(brokerDataFromApi);
                if (!brokerDataFromApi) {
                    console.warn("No broker data available for this property.");
                }
            } else {
                setError("Unexpected API response format or property not found.");
            }
        } catch (error) {
            setError(`Error fetching property data: ${error.message}`);
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const trackVisitor = async (propertyId) => {
        try {
            // Check for existing visitor token
            let visitorToken = await AsyncStorage.getItem('visitor_token');
            if (!visitorToken) {
                visitorToken = getUUIDSync();
                await AsyncStorage.setItem('visitor_token', visitorToken);
            }

            const userData = await AsyncStorage.getItem("userData");
            const parsedUserData = userData ? JSON.parse(userData) : null;
            const userId = parsedUserData?.id || null;
            const token = await AsyncStorage.getItem('userToken');

            // console.log('propertyId', propertyId)
            const visitData = {
                property_id: propertyId,
                user_id: userId,
                visitor_token: visitorToken, // 🔥 send visitor token
                details: {
                    user_agent: "ReactNativeApp",
                },
            };
            // console.log(visitData);
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
            // console.log('response data after visit', response.data.data.visitor_token);

            if (response.data?.data?.visitor_token) {
                await AsyncStorage.setItem('current_visitor_token', response.data.data.visitor_token.toString());

                // Fetch unique visitor count
                const countResponse = await axios.get(
                    `https://landsquire.in/api/getVisitorCount/${propertyId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'User-Agent': 'LandSquireApp/1.0 (React Native)',
                        },
                    }
                );

                if (countResponse.data?.count) {
                    // console.log(`Total unique visitors: ${countResponse.data.count}`);
                    setTotalVisits(countResponse.data.count)
                }
            }
        } catch (error) {
            console.error("Error tracking visitor:", error.message);
            // if (setError) setError(`Error tracking visitor: ${error.message}`);
        }
    };

    useEffect(() => {
        fetchPropertyData(propertyId);
        trackVisitor(propertyId);
    }, [propertyId]);

    const onRefresh = () => {
        setRefreshing(true);
        setError(null);
        fetchPropertyData(propertyId);
        trackVisitor(propertyId);
    };

    const openLightbox = (index) => {
        const totalMedia = (propertyGallery?.length || 0) + videoUrls.length;
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
        const totalMedia = (propertyGallery?.length || 0) + videoUrls.length;
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
        const totalMedia = (propertyGallery?.length || 0) + videoUrls.length;
        if (index >= 0 && index < totalMedia) {
            const allMedia = [...(propertyGallery || []), ...videoUrls];
            const media = allMedia[index];
            return media?.image || media?.url || null;
        }
        return null;
    };

    const formatINR = (amount) => {
        if (!amount || isNaN(amount)) return "₹0";
        const num = Number(amount);
        const absNum = Math.abs(num);
        const prefix = num < 0 ? "-₹" : "₹";
        if (absNum >= 1e7) {
            return prefix + (absNum / 1e7).toFixed(2).replace(/\.00$/, "") + " Cr";
        } else if (absNum >= 1e5) {
            return prefix + (absNum / 1e5).toFixed(2).replace(/\.00$/, "") + " Lakh";
        }
        return prefix + absNum.toLocaleString("en-IN");
    };

    const formatIndianNumber = (number) => {
        if (!number) return "";
        const numStr = number.toString().replace(/[^0-9]/g, "");
        if (numStr.length <= 3) return numStr;
        const lastThree = numStr.slice(-3);
        const otherNumbers = numStr.slice(0, -3);
        const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
        return `${formattedOther},${lastThree}`;
    };

    const validateBidAmount = () => {
        const currentPrice = Number(propertyData?.price) || 0;
        const cleanedBidStr = bidAmount.toString().replace(/,/g, "");
        const bid = Number(cleanedBidStr);
        const minimumBid = currentPrice * 0.5;
        if (!bidAmount || isNaN(bid) || bid <= 0) {
            setBidError("Please enter a valid bid amount greater than zero.");
            return false;
        }
        if (bid < minimumBid) {
            setBidError(`Bid amount must be at least ${formatINR(minimumBid)}.`);
            return false;
        }
        setBidError("");
        return true;
    };

    const handleBidSubmit = () => {
        if (validateBidAmount()) {
            handleEnquiry(true);
            setBidAmount("");
        } else {
            errorSheetRef.current.open();
        }
    };

    if (loading || !propertyData) {
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
                    propertyThumbnail={propertyThumbnail}
                    propertyData={propertyData}
                    loggedinUserId={loggedinUserId}
                />
                <PropertyDetailsSection propertyData={propertyData} visitcount={totalVisits} />
                <PropertyDescription description={propertyData.discription} />
                <PropertyGallery
                    propertyGallery={propertyGallery}
                    windowWidth={windowWidth}
                    openLightbox={openLightbox}
                />
                <PropertyVideos
                    videoUrls={videoUrls}
                    windowWidth={windowWidth}
                    openLightbox={openLightbox}
                    selectedMediaIndex={selectedMediaIndex}
                    propertyGalleryLength={propertyGallery?.length || 0}
                />
                <BrokerCard
                    brokerData={brokerData}
                    handleCall={handleCall}
                    openWhatsApp={openWhatsApp}
                />
                <NearbyInfo
                    nearbylocation={propertyData.nearbylocation}
                    approxrentalincome={propertyData.approxrentalincome}
                    formatINR={formatINR}
                    propertyfor={propertyData.propertyfor}
                />
                <AmenitiesList amenities={amenities} />
                <PropertyMap
                    coordinates={coordinates}
                    region={region}
                    address={propertyData.address}
                />
                <MasterPlanSection masterPlanDocs={masterPlanDocs} />
                {/* <PriceHistorySection priceHistoryData={priceHistoryData} /> */}
            </ScrollView>
            <LightboxModal
                isLightboxVisible={isLightboxVisible}
                closeLightbox={closeLightbox}
                navigateLightbox={navigateLightbox}
                getMediaAtIndex={getMediaAtIndex}
                selectedMediaIndex={selectedMediaIndex}
                propertyGallery={propertyGallery}
                videoUrls={videoUrls}
                windowWidth={windowWidth}
                windowHeight={windowHeight}
                videoRef={videoRef}
                scale={scale}
                savedScale={savedScale}
            />
            <BottomBar
                propertyData={propertyData}
                loggedinUserId={loggedinUserId}
                formatINR={formatINR}
                handleEditPress={handleEditPress}
                rbSheetRef={rbSheetRef}
                bidStatus={bidStatus}
                handleEnquiry={handleEnquiry}
                bidBtn={bidBtn}
            />
            <BidSheet
                rbSheetRef={rbSheetRef}
                windowHeight={windowHeight}
                propertyData={propertyData}
                formatINR={formatINR}
                bidAmount={bidAmount}
                setBidAmount={setBidAmount}
                bidError={bidError}
                setBidError={setBidError}
                setBidStatus={setBidStatus}
                loading={loading}
                handleBidSubmit={handleBidSubmit}
                formatIndianNumber={formatIndianNumber}
            />
            <FeedbackSheet
                ref={successSheetRef}
                type="success"
                message={bidStatus?.message || "Bid submitted successfully!"}
                height={500}
            />
            <FeedbackSheet
                ref={errorSheetRef}
                type="error"
                message={bidError || bidStatus?.message || "An error occurred. Please try again."}
                height={350}
                onClose={() => {
                    setBidError("");
                    setBidStatus(null);
                }}
            />
        </View>
    );
};

export default PropertyDetails;

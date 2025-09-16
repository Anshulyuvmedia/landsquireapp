import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, Alert, FlatList, TouchableOpacity, Image, Animated, Platform, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RBSheet from 'react-native-raw-bottom-sheet';
import { MaterialIcons, FontAwesome, FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import images from "@/constants/images";

const LoanEnquiry = () => {
    const [loanAmount, setLoanAmount] = useState('');
    const [rawLoanAmount, setRawLoanAmount] = useState(''); // Store raw numeric value
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [propertyDocuments, setPropertyDocuments] = useState([]);
    const [loggedinUserId, setLoggedinUserId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const successSheetRef = useRef(null);
    const errorSheetRef = useRef(null);

    const loadUserData = async () => {
        try {
            const storedUserData = await AsyncStorage.getItem('userData');
            if (!storedUserData) {
                Alert.alert('Error', 'No user data found. Please log in again.');
                return;
            }

            const parsedUserData = JSON.parse(storedUserData);
            if (!parsedUserData?.id) {
                Alert.alert('Error', 'Invalid user data. Please log in again.');
                return;
            }

            setLoggedinUserId(parsedUserData.id);
            setName(parsedUserData.username || '');
            setEmail(parsedUserData.email || '');
            setPhone(parsedUserData.mobilenumber || '');
            setCity(parsedUserData.city || '');
        } catch (error) {
            Alert.alert('Error', 'Failed to load user data. Please try again.');
            console.error('AsyncStorage error:', error);
        }
    };

    useEffect(() => {
        loadUserData();

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const pickDocument = async (type) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf'],
                multiple: true,
            });

            if (!result.canceled) {
                const newDocuments = await Promise.all(
                    result.assets.map(async (doc) => {
                        try {
                            const fileInfo = await FileSystem.getInfoAsync(doc.uri);
                            if (!fileInfo.exists) {
                                throw new Error(`File not found: ${doc.uri}`);
                            }
                            return {
                                uri: doc.uri,
                                name: doc.name,
                                size: fileInfo.size,
                                mimeType: doc.mimeType,
                            };
                        } catch (fileError) {
                            console.error('File processing error for', doc.name, ':', fileError);
                            throw new Error(`Failed to process ${doc.name}`);
                        }
                    })
                );
                setPropertyDocuments((prev) => [...prev, ...newDocuments]);
            } else {
                Alert.alert('Info', 'Document selection was cancelled.');
            }
        } catch (err) {
            Alert.alert('Error', `Failed to select document: ${err.message || 'Unknown error'}`);
            console.error('Document picker error:', err);
        }
    };

    const removeDocument = (index) => {
        setPropertyDocuments((prev) => prev.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        const cleanedText = rawLoanAmount.replace(/[^0-9]/g, '');
        if (!cleanedText || isNaN(cleanedText) || Number(cleanedText) <= 0) {
            return 'Please enter a valid loan amount.';
        }
        if (propertyDocuments.length === 0) {
            return 'Please upload at least one property document.';
        }
        return null;
    };

    const handleSubmit = async () => {
        const errorMessage = validateForm();
        if (errorMessage) {
            // Alert.alert('Validation Error', errorMessage);
            errorSheetRef.current?.open();
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('userid', loggedinUserId);
            formData.append('customername', name);
            formData.append('mobilenumber', phone);
            formData.append('email', email);
            formData.append('city', city);
            formData.append('state', 'Rajasthan');
            formData.append('form_type', 'bankagent');
            formData.append('loan_amount', rawLoanAmount.replace(/[^0-9]/g, ''));

            for (const doc of propertyDocuments) {
                formData.append('documents[]', {
                    uri: Platform.OS === 'android' ? doc.uri : doc.uri.replace('file://', ''),
                    name: doc.name,
                    type: doc.mimeType || 'application/octet-stream',
                });
            }

            const apiUrl = 'https://landsquire.in/api/sendloanenquiry';
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                },
            });

            const contentType = response.headers.get('content-type');
            if (!response.ok) {
                let errorMessage = `HTTP error ${response.status}: Failed to submit loan enquiry.`;
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                    console.error('API error response:', errorData);
                } else {
                    const errorText = await response.text();
                    console.error('Non-JSON error:', errorText);
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Unexpected response format: Expected JSON');
            }

            const result = await response.json();
            if (result.success) {
                successSheetRef.current?.open();
            } else {
                throw new Error(result.message || 'API response indicated failure.');
            }
        } catch (error) {
            errorSheetRef.current?.open();
            Alert.alert('Error', error.message || 'Failed to submit enquiry. Please try again.');
            console.error('Submit error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeSuccessSheet = () => {
        successSheetRef.current?.close();
    };

    const closeErrorSheet = () => {
        errorSheetRef.current?.close();
    };

    // Utility function to format number in Indian style (e.g., 10,00,000)
    const formatIndianNumber = (number) => {
        if (!number) return '';
        const numStr = number.toString().replace(/[^0-9]/g, '');
        if (numStr.length <= 3) return numStr;
        const lastThree = numStr.slice(-3);
        const otherNumbers = numStr.slice(0, -3);
        const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        return `${formattedOther},${lastThree}`;
    };

    const handleLoanAmountChange = (text) => {
        const cleanedText = text.replace(/[^0-9]/g, '');
        setRawLoanAmount(cleanedText);
        setLoanAmount(formatIndianNumber(cleanedText));
    };

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Property Loan Enquiry</Text>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerSubtitle}>Apply for the best bank loan offers</Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Finance That Feels Right</Text>
                    <Text style={styles.cardHeadline}>Your Loan, Your Terms</Text>
                    <Text style={styles.cardDescription}>
                        Whether you're buying your first home, investing in property, or renovating your dream space, we connect you with trusted banks offering tailored loan options.
                    </Text>
                    <View style={styles.bankLogos}>
                        <Image source={images.axisbank} style={styles.bankLogo} />
                        <Image source={images.icicibank} style={styles.bankLogo} />
                        <Image source={images.hdbbank} style={styles.bankLogo} />
                    </View>
                    <Text style={styles.cardSubTitle}>Why Choose Us?</Text>
                    <View style={styles.benefitsList}>
                        <View style={styles.benefitItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.benefitText}>Balance transfer and top-up loan facility</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.benefitText}>Quick online approval with minimal documentation</Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.benefitText}>Personalized support from loan experts</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Loan Amount Required (INR)</Text>
                        <View style={styles.inputWrapper}>
                            <FontAwesome6 name="money-bill-1" size={20} color="#0052CC" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter loan amount"
                                value={loanAmount}
                                onChangeText={handleLoanAmountChange}
                                keyboardType="numeric"
                                placeholderTextColor="#A0AEC0"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Upload Documents (Aadhar, PAN, Income Proof)</Text>
                        <FlatList
                            data={propertyDocuments}
                            horizontal
                            keyExtractor={(_, index) => `property-${index}`}
                            contentContainerStyle={styles.documentList}
                            renderItem={({ item, index }) => (
                                <View style={styles.documentCard}>
                                    <FontAwesome6
                                        name={item.mimeType.startsWith('image/') ? 'file-image' : 'file-pdf'}
                                        size={50}
                                        color="black"
                                        style={styles.documentThumbnail}
                                    />
                                    <Text style={styles.documentName} numberOfLines={1}>{item.name}</Text>
                                    <TouchableOpacity
                                        onPress={() => removeDocument(index)}
                                        style={styles.deleteButton}
                                    >
                                        <MaterialIcons name="close" size={16} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                        <TouchableOpacity onPress={() => pickDocument('property')} style={styles.uploadButton}>
                            <FontAwesome name="upload" size={20} color="#0052CC" />
                            <Text style={styles.uploadText}>Upload Documents</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleSubmit}
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    disabled={isSubmitting}
                >
                    <Text style={styles.submitButtonText}>{isSubmitting ? 'Submitting...' : 'Apply Now'}</Text>
                </TouchableOpacity>
            </ScrollView>

            <RBSheet
                ref={successSheetRef}
                closeOnDragDown
                closeOnPressMask
                height={320}
                animationType="slide"
                customStyles={{ container: styles.sheetContainer }}
            >
                <View style={styles.sheetContent}>
                    <MaterialIcons name="check-circle" size={48} color="#10B981" style={styles.sheetIcon} />
                    <Text style={styles.sheetTitle}>Application Submitted!</Text>
                    <Text style={styles.sheetText}>
                        Your loan enquiry has been successfully submitted. We'll get back to you soon.
                    </Text>
                    <View style={styles.sheetButtonContainer}>
                        <TouchableOpacity
                            onPress={closeSuccessSheet}
                            style={[styles.sheetButton, styles.sheetPrimaryButton]}
                        >
                            <Text style={styles.sheetButtonText}>Finish</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </RBSheet>

            <RBSheet
                ref={errorSheetRef}
                closeOnDragDown
                closeOnPressMask
                height={320}
                animationType="slide"
                customStyles={{ container: styles.sheetContainer }}
            >
                <View style={styles.sheetContent}>
                    <MaterialIcons name="error" size={48} color="#EF4444" style={styles.sheetIcon} />
                    <Text style={styles.sheetTitle}>Submission Failed</Text>
                    <Text style={styles.sheetText}>
                        An error occurred. Please check your input and try again.
                    </Text>
                    <View style={styles.sheetButtonContainer}>
                        <TouchableOpacity
                            onPress={closeErrorSheet}
                            style={[styles.sheetButton, styles.sheetPrimaryButton]}
                        >
                            <Text style={styles.sheetButtonText}>Retry</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={closeErrorSheet}
                            style={[styles.sheetButton, styles.sheetSecondaryButton]}
                        >
                            <Text style={styles.sheetButtonClose}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </RBSheet>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7FAFC',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A202C',
    },
    headerSubtitle: {
        fontSize: 16,
        fontWeight: '400',
        color: '#4A5568',
        marginBottom: 16,
    },
    backButton: {
        backgroundColor: '#0052CC',
        borderRadius: 12,
        padding: 8,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4A5568',
        marginBottom: 4,
    },
    cardHeadline: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0052CC',
        marginBottom: 8,
    },
    cardDescription: {
        fontSize: 14,
        fontWeight: '400',
        color: '#4A5568',
        lineHeight: 20,
        marginBottom: 12,
    },
    bankLogos: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    bankLogo: {
        width: 80,
        height: 40,
        resizeMode: 'contain',
    },
    cardSubTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A202C',
        marginBottom: 8,
    },
    benefitsList: {
        paddingLeft: 8,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    bullet: {
        fontSize: 16,
        color: '#4A5568',
        marginRight: 8,
    },
    benefitText: {
        fontSize: 14,
        color: '#4A5568',
        flex: 1,
    },
    formContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A202C',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1A202C',
        fontWeight: '400',
    },
    documentList: {
        paddingVertical: 8,
    },
    documentCard: {
        width: 100,
        alignItems: 'center',
        marginRight: 12,
    },
    documentThumbnail: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 10,
    },
    documentName: {
        fontSize: 12,
        color: '#4A5568',
        marginTop: 4,
        textAlign: 'center',
    },
    deleteButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#EF4444',
        borderRadius: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EDF2F7',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    uploadText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0052CC',
        marginLeft: 8,
    },
    submitButton: {
        backgroundColor: '#0052CC',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    submitButtonDisabled: {
        backgroundColor: '#A0AEC0',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    sheetContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
    },
    sheetContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetIcon: {
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A202C',
        marginBottom: 8,
    },
    sheetText: {
        fontSize: 14,
        fontWeight: '400',
        color: '#4A5568',
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    sheetButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    sheetButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    sheetPrimaryButton: {
        backgroundColor: '#0052CC',
    },
    sheetSecondaryButton: {
        backgroundColor: '#E2E8F0',
    },
    sheetButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    sheetButtonClose: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A202C',
    },
});

export default LoanEnquiry;
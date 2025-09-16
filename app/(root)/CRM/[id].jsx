import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Linking, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';
import RNPickerSelect from 'react-native-picker-select';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Utility function to format amount in lakhs/crores
const formatINR = (amount) => {
    if (!amount || isNaN(amount)) return 'Not Available';
    const num = parseFloat(amount);
    if (num >= 10000000) {
        return `₹${(num / 10000000).toFixed(2)} Cr`;
    } else if (num >= 100000) {
        return `₹${(num / 100000).toFixed(2)} L`;
    } else {
        return `₹${num.toLocaleString('en-IN')}`;
    }
};

const LeadDetail = () => {
    const { t, i18n } = useTranslation();
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showManageModal, setShowManageModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState(''); // 'success' or 'error'
    const [newNoteDescription, setNewNoteDescription] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const statuses = [
        { label: t('New'), value: 'New' },
        { label: t('Qualified'), value: 'Qualified' },
        { label: t('Not Responded'), value: 'Not Responded' },
        { label: t('Won'), value: 'Won' },
        { label: t('Final'), value: 'Final' },
    ];

    useEffect(() => {
        fetchLeadDetails();
    }, [id]);

    const fetchLeadDetails = async () => {
        setLoading(true);
        try {
            const parsedPropertyData = JSON.parse(await AsyncStorage.getItem('userData'));
            if (!parsedPropertyData?.id) {
                throw new Error('User data or ID missing');
            }
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.get(`https://landsquire.in/api/fetchenquiry/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });
            const enquiry = response.data.lead;
            if (enquiry && enquiry.id === parseInt(id)) {
                let bids = [];
                if (typeof enquiry.propertybid === 'string' && enquiry.propertybid.trim().startsWith('[')) {
                    try {
                        bids = JSON.parse(enquiry.propertybid).filter(b => b.bidamount !== null && b.bidamount !== '');
                    } catch (e) {
                        console.error('Failed to parse propertybid JSON:', e);
                    }
                } else if (enquiry.propertybid !== null && enquiry.propertybid !== '') {
                    bids = [{ bidamount: enquiry.propertybid, date: enquiry.created_at }];
                }
                setLead({
                    ...enquiry,
                    propertybid: bids,
                    followupdetails: enquiry.followupdetails
                        ? (typeof enquiry.followupdetails === 'string' ? JSON.parse(enquiry.followupdetails) : enquiry.followupdetails)
                        : [],
                });
            } else {
                setError(t('leadNotFound'));
            }
        } catch (err) {
            setError(t('errorFetchingLead'));
            console.error('Error fetching lead:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCallPress = () => {
        if (lead?.mobilenumber) {
            Linking.openURL(`tel:${lead.mobilenumber}`);
        }
    };

    const handleWhatsAppPress = () => {
        if (lead?.mobilenumber) {
            Linking.openURL(`whatsapp://send?phone=${lead.mobilenumber}`);
        }
    };

    const saveChanges = async () => {
        if (!lead) {
            setStatusMessage(t('leadNotLoaded'));
            setStatusType('error');
            setShowStatusModal(true);
            return;
        }
        if (!newNoteDescription && !selectedStatus) {
            setStatusMessage(t('noChangesProvided'));
            setStatusType('error');
            setShowStatusModal(true);
            return;
        }
        setIsSaving(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const payload = {
                recordid: lead.id,
                ...(newNoteDescription && {
                    followupdate: new Date().toISOString(),
                    followupdescription: newNoteDescription,
                }),
                ...(selectedStatus && { followupstatus: selectedStatus }),
            };
            const response = await axios.post('https://landsquire.in/api/updatefollowup', payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });
            if (response.data.success) {
                const newDetails = newNoteDescription
                    ? [...(lead.followupdetails || []), {
                        date: new Date().toISOString(),
                        description: newNoteDescription,
                    }]
                    : lead.followupdetails;
                setLead({
                    ...lead,
                    status: selectedStatus || lead.status,
                    followupdetails: newDetails,
                });
                setNewNoteDescription('');
                setSelectedStatus(null);
                setShowManageModal(false);
                setStatusMessage(t('Follow-up Added and Status Updated'));
                setStatusType('success');
                setShowStatusModal(true);
            } else {
                throw new Error(response.data.error || t('errorSavingChanges'));
            }
        } catch (err) {
            console.error('Error saving changes:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
            });
            setStatusMessage(err.response?.data?.error || err.message || t('errorSavingChanges'));
            setStatusType('error');
            setShowStatusModal(true);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#234F68" />
                <Text style={[styles.loadingText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                    {t('loading')}
                </Text>
            </View>
        );
    }

    if (error || !lead) {
        return (
            <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                    {error || t('leadNotFound')}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                        <MaterialIcons name="arrow-back" size={moderateScale(24)} color="#1F3A5F" />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
                        {t('Lead Details')}
                    </Text>
                </View>

                {/* Lead Information */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-SemiBold' : 'Rubik-SemiBold' }]}>
                        {t('Lead Information')}
                    </Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('Name')}:</Text>
                        <Text style={[styles.detailValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {lead.name || t('unknown')}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('Email')}:</Text>
                        <Text style={[styles.detailValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {lead.email || t('notAvailable')}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('Mobile')}:</Text>
                        <Text style={[styles.detailValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {lead.mobilenumber || t('notAvailable')}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('City')}:</Text>
                        <Text style={[styles.detailValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {lead.inwhichcity || t('notAvailable')}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('Category')}:</Text>
                        <Text style={[styles.detailValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {lead.housecategory || t('notAvailable')}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('Property For')}:</Text>
                        <Text style={[styles.detailValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {(lead.propertyfor !== 'Rent' ? 'Sell' : 'Rent') || t('notSpecified')}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('Status')}:</Text>
                        <Text style={[styles.detailValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {lead.status || t('notAvailable')}
                        </Text>
                    </View>
                </View>

                {/* Bid Details */}
                {lead.propertybid && lead.propertybid.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-SemiBold' : 'Rubik-SemiBold' }]}>
                            {t('Bid Details')}
                        </Text>
                        {lead.propertybid.map((bid, idx) => (
                            <View key={idx} style={styles.bidItem}>
                                <Text style={[styles.bidDate, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                    {new Date(bid.date).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                                <Text style={[styles.bidAmount, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-SemiBold' : 'Rubik-SemiBold' }]}>
                                    {formatINR(bid.bidamount)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-SemiBold' : 'Rubik-SemiBold' }]}>
                        {t('Actions')}
                    </Text>
                    <View style={styles.buttonContainer}>
                        <View style={styles.buttonRow}>
                            {lead.propertyid && (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.viewPropertyButton]}
                                    onPress={() => router.push(`/properties/${lead.propertyid}`)}
                                    activeOpacity={0.7}
                                >
                                    <MaterialIcons name="visibility" size={moderateScale(16)} color="#fff" style={styles.buttonIcon} />
                                    <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                        {t('viewProperty')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.actionButton, styles.callButton, !lead.mobilenumber && styles.disabledButton]}
                                onPress={handleCallPress}
                                disabled={!lead.mobilenumber}
                                activeOpacity={0.7}
                            >
                                <Feather name="phone" size={moderateScale(16)} color="#fff" style={styles.buttonIcon} />
                                <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('Call Now')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.whatsappButton, !lead.mobilenumber && styles.disabledButton]}
                                onPress={handleWhatsAppPress}
                                disabled={!lead.mobilenumber}
                                activeOpacity={0.7}
                            >
                                <FontAwesome5 name="whatsapp" size={moderateScale(16)} color="#fff" style={styles.buttonIcon} />
                                <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('Whatsapp')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.manageButton]}
                                onPress={() => setShowMessageModal(true)}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons name="notes" size={moderateScale(16)} color="#fff" style={styles.buttonIcon} />
                                <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('View Notes')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.manageButton]}
                                onPress={() => setShowManageModal(true)}
                                activeOpacity={0.7}
                            >
                                <MaterialIcons name="edit" size={moderateScale(16)} color="#fff" style={styles.buttonIcon} />
                                <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('Update Lead')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* Notes Timeline Modal */}
            <Modal
                visible={showMessageModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowMessageModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={[styles.modalTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
                            {t('Notes Timeline')}
                        </Text>
                        <ScrollView style={styles.notesScroll}>
                            {lead.followupdetails?.length > 0 ? (
                                lead.followupdetails.map((note, idx) => (
                                    <View key={idx} style={styles.noteItem}>
                                        <View style={styles.noteTimeline}>
                                            <View style={styles.timelineDot} />
                                            {idx < lead.followupdetails.length - 1 && <View style={styles.timelineLine} />}
                                        </View>
                                        <View style={styles.noteContent}>
                                            <Text style={[styles.noteDate, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-SemiBold' : 'Rubik-SemiBold' }]}>
                                                {new Date(note.date).toLocaleString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </Text>
                                            <Text style={[styles.noteDescription, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                                {note.description || t('notAvailable')}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={[styles.noNotesText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                    {t('noNotes')}
                                </Text>
                            )}
                        </ScrollView>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.cancelButton]}
                                onPress={() => setShowMessageModal(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('Close')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Manage Lead Modal */}
            <Modal
                visible={showManageModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowManageModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={[styles.modalTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
                            {t('Manage Lead')}
                        </Text>
                        <Text style={[styles.inputLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                            {t('Update Status')}
                        </Text>
                        <RNPickerSelect
                            onValueChange={(value) => setSelectedStatus(value)}
                            items={statuses}
                            style={pickerSelectStyles}
                            placeholder={{ label: t('Select Status'), value: null }}
                            value={selectedStatus}
                        />
                        <Text style={[styles.inputLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                            {t('Add Note')}
                        </Text>
                        <TextInput
                            style={styles.noteInput}
                            placeholder={t('Enter note description')}
                            placeholderTextColor="#9CA3AF"
                            value={newNoteDescription}
                            onChangeText={setNewNoteDescription}
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.saveButton, isSaving && styles.disabledButton]}
                                onPress={saveChanges}
                                activeOpacity={0.7}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                        {t('Save')}
                                    </Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.cancelButton]}
                                onPress={() => {
                                    setNewNoteDescription('');
                                    setSelectedStatus(null);
                                    setShowManageModal(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                    {t('Cancel')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Status Modal */}
            <Modal
                visible={showStatusModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowStatusModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.statusModalContent, statusType === 'success' ? styles.successModal : styles.errorModal]}>
                        <View style={styles.statusIcon}>
                            <MaterialIcons
                                name={statusType === 'success' ? 'check-circle' : 'error'}
                                size={moderateScale(40)}
                                color={statusType === 'success' ? '#2ECC71' : '#EF4444'}
                            />
                        </View>
                        <Text style={[styles.statusModalTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
                            {statusType === 'success' ? t('Success') : t('Error')}
                        </Text>
                        <Text style={[styles.statusModalMessage, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                            {statusMessage}
                        </Text>
                        <TouchableOpacity
                            style={[styles.statusModalButton]}
                            onPress={() => setShowStatusModal(false)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.actionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                                {t('OK')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

export default LeadDetail;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    card: {
        paddingHorizontal: moderateScale(12),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(12),
    },
    backButton: {
        padding: moderateScale(8),
    },
    headerTitle: {
        fontSize: moderateScale(20),
        color: '#1F3A5F',
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    section: {
        marginBottom: verticalScale(16),
        paddingBottom: verticalScale(8),
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    sectionTitle: {
        fontSize: moderateScale(16),
        color: '#1F3A5F',
        fontWeight: '600',
        marginBottom: verticalScale(10),
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(8),
    },
    detailLabel: {
        fontSize: moderateScale(14),
        color: '#6B7280',
        fontFamily: 'Rubik-Regular',
        flex: 1,
    },
    detailValue: {
        fontSize: moderateScale(14),
        color: '#374151',
        flex: 2,
        textAlign: 'right',
    },
    bidItem: {
        backgroundColor: '#E3F0FA',
        padding: moderateScale(12),
        borderRadius: moderateScale(8),
        marginBottom: verticalScale(8),
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    bidDate: {
        fontSize: moderateScale(12),
        color: '#6B7280',
        marginBottom: verticalScale(4),
    },
    bidAmount: {
        fontSize: moderateScale(14),
        color: '#1F3A5F',
        fontWeight: '600',
    },
    buttonContainer: {
        marginTop: verticalScale(8),
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(8),
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: moderateScale(12),
        paddingHorizontal: moderateScale(8),
        borderRadius: moderateScale(10),
        marginHorizontal: scale(4),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    viewPropertyButton: {
        backgroundColor: '#1F3A5F',
    },
    callButton: {
        backgroundColor: '#2ECC71',
    },
    whatsappButton: {
        backgroundColor: '#25D366',
    },
    manageButton: {
        backgroundColor: '#3B82F6',
    },
    disabledButton: {
        backgroundColor: '#D1D5DB',
    },
    actionButtonText: {
        fontSize: moderateScale(13),
        color: '#FFFFFF',
        // marginLeft: scale(6),
        fontWeight: '500',
        // textAlign: 'center',
    },
    buttonIcon: {
        marginRight: scale(6),
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: moderateScale(16),
        color: '#374151',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: scale(16),
    },
    errorText: {
        fontSize: moderateScale(16),
        color: '#EF4444',
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: moderateScale(16),
        borderTopRightRadius: moderateScale(16),
        padding: moderateScale(20),
        maxHeight: '85%',
    },
    modalTitle: {
        fontSize: moderateScale(18),
        color: '#1F3A5F',
        fontWeight: 'bold',
        marginBottom: verticalScale(12),
    },
    inputLabel: {
        fontSize: moderateScale(14),
        color: '#1F3A5F',
        marginBottom: verticalScale(8),
        fontWeight: '500',
    },
    noteInput: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: moderateScale(8),
        paddingHorizontal: moderateScale(12),
        paddingVertical: verticalScale(8),
        marginBottom: verticalScale(12),
        fontSize: moderateScale(14),
        color: '#374151',
        backgroundColor: '#F9FAFB',
    },
    notesScroll: {
        maxHeight: verticalScale(250),
        marginBottom: verticalScale(12),
    },
    noteItem: {
        flexDirection: 'row',
        marginBottom: verticalScale(16),
        alignItems: 'flex-start',
    },
    noteTimeline: {
        alignItems: 'center',
        marginRight: scale(12),
    },
    timelineDot: {
        width: moderateScale(12),
        height: moderateScale(12),
        borderRadius: moderateScale(6),
        backgroundColor: '#3B82F6',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        marginTop: verticalScale(4),
        zIndex: 1,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#3B82F6',
        marginTop: verticalScale(4),
    },
    noteContent: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: moderateScale(12),
        borderRadius: moderateScale(8),
        borderLeftWidth: 3,
        borderLeftColor: '#3B82F6',
    },
    noteDate: {
        fontSize: moderateScale(12),
        color: '#1F3A5F',
        marginBottom: verticalScale(4),
        fontWeight: '600',
    },
    noteDescription: {
        fontSize: moderateScale(14),
        color: '#374151',
    },
    noNotesText: {
        fontSize: moderateScale(14),
        color: '#9CA3AF',
        textAlign: 'center',
        marginVertical: verticalScale(20),
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    saveButton: {
        backgroundColor: '#2ECC71',
        flex: 1,
        marginRight: scale(6),
    },
    cancelButton: {
        backgroundColor: '#EF4444',
        flex: 1,
        marginLeft: scale(6),
    },
    statusModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: moderateScale(16),
        padding: moderateScale(20),
        marginHorizontal: scale(20),
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: scale(300),
        alignSelf: 'center',
    },
    successModal: {
        borderWidth: 2,
        borderColor: '#2ECC71',
    },
    errorModal: {
        borderWidth: 2,
        borderColor: '#EF4444',
    },
    statusModalTitle: {
        fontSize: moderateScale(18),
        color: '#1F3A5F',
        fontWeight: 'bold',
        marginBottom: verticalScale(8),
        textAlign: 'center',
    },
    statusModalMessage: {
        fontSize: moderateScale(14),
        color: '#374151',
        marginBottom: verticalScale(16),
        textAlign: 'center',
    },
    statusModalButton: {
        backgroundColor: '#3B82F6',
        width: '100%',
        paddingVertical: moderateScale(12),
        paddingHorizontal: moderateScale(16),
        borderRadius: moderateScale(10),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    statusIcon: {
        marginBottom: verticalScale(12),
    },
});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: moderateScale(14),
        paddingHorizontal: moderateScale(12),
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: moderateScale(8),
        color: '#374151',
        marginBottom: verticalScale(12),
        fontFamily: 'Rubik-Regular',
        backgroundColor: '#F9FAFB',
    },
    inputAndroid: {
        fontSize: moderateScale(14),
        paddingHorizontal: moderateScale(12),
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: moderateScale(8),
        color: '#374151',
        marginBottom: verticalScale(12),
        fontFamily: 'Rubik-Regular',
        backgroundColor: '#F9FAFB',
    },
    placeholder: {
        color: '#9CA3AF',
    },
});
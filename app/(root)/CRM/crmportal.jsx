import { StyleSheet, Text, View, useWindowDimensions, TouchableOpacity, Image, ActivityIndicator, TextInput } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import RBSheet from 'react-native-raw-bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import icons from '@/constants/icons';
import NewLead from './followupstatus/newlead';
import QualifiedLead from './followupstatus/qualifiedlead';
import NotResponded from './followupstatus/notresponded';
import Won from './followupstatus/won';
import Final from './followupstatus/final';

// Define the initial routes array
const initialRoutes = [
    { key: 'NewLead', title: 'New' },
    { key: 'QualifiedLead', title: 'Qualified' },
    { key: 'NotResponded', title: 'Not Responded' },
    { key: 'Won', title: 'Won' },
    { key: 'Final', title: 'Final' },
];

const CrmPortal = () => {
    const { t, i18n } = useTranslation();
    const { id } = useLocalSearchParams();
    const layout = useWindowDimensions();
    const [index, setIndex] = useState(0);
    const [enquiries, setEnquiries] = useState([]);
    const [filteredEnquiries, setFilteredEnquiries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('All'); // Type filter: 'All', 'Sell', 'Rent'
    const [tempFilter, setTempFilter] = useState('All'); // Temporary type filter for bottom sheet
    const [searchTerm, setSearchTerm] = useState('');
    const [tempSearchTerm, setTempSearchTerm] = useState('');
    const [fromDate, setFromDate] = useState(null);
    const [tempFromDate, setTempFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [tempToDate, setTempToDate] = useState(null);
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [selectedCity, setSelectedCity] = useState('all');
    const [tempSelectedCity, setTempSelectedCity] = useState('all');
    const [selectedPropertyType, setSelectedPropertyType] = useState('all');
    const [tempSelectedPropertyType, setTempSelectedPropertyType] = useState('all');
    const [cities, setCities] = useState([]);
    const [propertyTypes, setPropertyTypes] = useState([]);
    const [dynamicRoutes, setDynamicRoutes] = useState(initialRoutes);
    const router = useRouter();
    const filterSheetRef = useRef();

    useEffect(() => {
        fetchUserEnquiries();
    }, []);

    useEffect(() => {
        if (enquiries.length > 0) {
            const uniqueCities = [...new Set(enquiries.map(e => e.inwhichcity).filter(Boolean))].sort();
            setCities([{ label: t('All Cities'), value: 'all' }, ...uniqueCities.map(c => ({ label: c, value: c }))]);

            const uniqueTypes = [...new Set(enquiries.map(e => e.housecategory).filter(Boolean))].sort();
            setPropertyTypes([{ label: t('All Types'), value: 'all' }, ...uniqueTypes.map(t => ({ label: t, value: t }))]);

            // Initialize tab counts
            updateTabCounts(enquiries);
        }
    }, [enquiries, t]);

    // Function to capitalize first letter of each word
    const capitalize = (str) => {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    };

    // Function to update tab counts
    const updateTabCounts = (filtered) => {
        const newCount = filtered.filter(e => e.status?.toLowerCase() === 'new').length;
        const qualifiedCount = filtered.filter(e => e.status?.toLowerCase() === 'qualified').length;
        const notRespondedCount = filtered.filter(e => e.status?.toLowerCase() === 'not responded').length;
        const wonCount = filtered.filter(e => e.status?.toLowerCase() === 'won').length;
        const finalCount = filtered.filter(e => e.status?.toLowerCase() === 'final').length;

        setDynamicRoutes([
            { key: 'NewLead', title: `${capitalize(t('New'))} (${newCount})` },
            { key: 'QualifiedLead', title: `${capitalize(t('Qualified'))} (${qualifiedCount})` },
            { key: 'NotResponded', title: `${capitalize(t('Not Responded'))} (${notRespondedCount})` },
            { key: 'Won', title: `${capitalize(t('Won'))} (${wonCount})` },
            { key: 'Final', title: `${capitalize(t('Final'))} (${finalCount})` },
        ]);
    };

    // Apply filters and update tab counts
    const applyFilters = () => {
        let filtered = enquiries;

        if (tempFilter !== 'All') {
            filtered = filtered.filter(e => e.propertyfor?.toLowerCase() === tempFilter.toLowerCase());
        }

        if (tempSelectedCity !== 'all') {
            filtered = filtered.filter(e => e.inwhichcity === tempSelectedCity);
        }

        if (tempSelectedPropertyType !== 'all') {
            filtered = filtered.filter(e => e.housecategory === tempSelectedPropertyType);
        }

        if (tempSearchTerm) {
            const lowerSearch = tempSearchTerm.toLowerCase();
            filtered = filtered.filter(e =>
                e.name?.toLowerCase().includes(lowerSearch) ||
                e.email?.toLowerCase().includes(lowerSearch) ||
                e.mobilenumber?.includes(lowerSearch) ||
                e.inwhichcity?.toLowerCase().includes(lowerSearch) ||
                e.housecategory?.toLowerCase().includes(lowerSearch) ||
                e.propertyfor?.toLowerCase().includes(lowerSearch)
            );
        }

        if (tempFromDate) {
            filtered = filtered.filter(e => new Date(e.created_at) >= tempFromDate);
        }

        if (tempToDate) {
            filtered = filtered.filter(e => new Date(e.created_at) <= tempToDate);
        }

        setFilteredEnquiries(filtered);
        setFilter(tempFilter);
        setSearchTerm(tempSearchTerm);
        setFromDate(tempFromDate);
        setToDate(tempToDate);
        setSelectedCity(tempSelectedCity);
        setSelectedPropertyType(tempSelectedPropertyType);

        updateTabCounts(filtered);
        filterSheetRef.current.close();
    };

    const fetchUserEnquiries = async () => {
        setLoading(true);
        try {
            const parsedPropertyData = JSON.parse(await AsyncStorage.getItem('userData'));
            if (!parsedPropertyData?.id) {
                throw new Error('User data or ID missing');
            }
            const token = await AsyncStorage.getItem('userToken');

            const response = await axios.get(`https://landsquire.in/api/fetchenquiries?id=${parsedPropertyData.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'LandSquireApp/1.0 (React Native)',
                },
            });

            if (response.data?.brokerenquiries) {
                const parsedEnquiries = response.data.brokerenquiries.map(enquiry => {
                    let bids = [];
                    if (typeof enquiry.propertybid === "string" && enquiry.propertybid.trim().startsWith("[")) {
                        try {
                            bids = JSON.parse(enquiry.propertybid).filter(
                                b => b.bidamount !== null && b.bidamount !== ""
                            );
                        } catch (e) {
                            console.error("Failed to parse propertybid JSON:", e);
                        }
                    } else if (enquiry.propertybid !== null && enquiry.propertybid !== "") {
                        bids = [{ bidamount: enquiry.propertybid, date: enquiry.created_at }];
                    }

                    return { ...enquiry, propertybid: bids };
                });

                // ✅ Don't filter out empty bids
                setEnquiries(parsedEnquiries);
                setFilteredEnquiries(parsedEnquiries);

            } else {
                throw new Error('Unexpected API response format');
            }
        } catch (error) {
            console.error('Error fetching enquiries:', error);
            setError(t('errorFetchingLeads'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Define dynamic routes with filtered enquiries based on status
    const NewLeadRoute = () => <NewLead enquiries={filteredEnquiries.filter(e => e.status?.toLowerCase() === 'new')} />;
    const QualifiedLeadRoute = () => <QualifiedLead enquiries={filteredEnquiries.filter(e => e.status?.toLowerCase() === 'qualified')} />;
    const NotRespondedRoute = () => <NotResponded enquiries={filteredEnquiries.filter(e => e.status?.toLowerCase() === 'not responded')} />;
    const WonRoute = () => <Won enquiries={filteredEnquiries.filter(e => e.status?.toLowerCase() === 'won')} />;
    const FinalRoute = () => <Final enquiries={filteredEnquiries.filter(e => e.status?.toLowerCase() === 'final')} />;

    // Define the SceneMap with the dynamic routes
    const renderScene = SceneMap({
        NewLead: NewLeadRoute,
        QualifiedLead: QualifiedLeadRoute,
        NotResponded: NotRespondedRoute,
        Won: WonRoute,
        Final: FinalRoute,
    });

    // Handle filter change for type filter (outside bottom sheet)
    const handleFilterChange = (value) => {
        setTempFilter(value);
        setFilter(value);
        applyFilters();
    };

    // Reset filters
    const resetFilters = () => {
        setTempSearchTerm('');
        setTempFromDate(null);
        setTempToDate(null);
        setTempSelectedCity('all');
        setTempSelectedPropertyType('all');
        setTempFilter('All');
        applyFilters();
    };

    // Clear all filters
    const clearAllFilters = () => {
        setTempSearchTerm('');
        setTempFromDate(null);
        setTempToDate(null);
        setTempSelectedCity('all');
        setTempSelectedPropertyType('all');
        setTempFilter('All');
        applyFilters();
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image source={icons.backArrow} style={styles.backIcon} />
                </TouchableOpacity>
                <Text
                    style={[
                        styles.headerTitle,
                        i18n.language === 'hi'
                            ? { fontFamily: 'NotoSerifDevanagari-Bold' }
                            : { fontFamily: 'Rubik-Bold' },
                    ]}
                >
                    {t('CRM Portal')}
                </Text>
                <TouchableOpacity onPress={fetchUserEnquiries} style={styles.refreshButton}>
                    <MaterialIcons name="refresh" size={moderateScale(24)} color="#234F68" />
                </TouchableOpacity>
            </View>

            {/* Type Filter Buttons and Filter Toggle */}
            <View style={styles.filterContainer}>
                <View style={styles.typeFilterContainer}>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'All' ? styles.filterButtonActive : styles.filterButtonInactive]}
                        onPress={() => handleFilterChange('All')}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                filter === 'All' ? styles.filterTextActive : styles.filterTextInactive,
                                i18n.language === 'hi' ? { fontFamily: 'NotoSerifDevanagari-Medium' } : { fontFamily: 'Rubik-Medium' },
                            ]}
                        >
                            {t('All')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'Sell' ? styles.filterButtonActive : styles.filterButtonInactive]}
                        onPress={() => handleFilterChange('Sell')}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                filter === 'Sell' ? styles.filterTextActive : styles.filterTextInactive,
                                i18n.language === 'hi' ? { fontFamily: 'NotoSerifDevanagari-Medium' } : { fontFamily: 'Rubik-Medium' },
                            ]}
                        >
                            {t('Sell')}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'Rent' ? styles.filterButtonActive : styles.filterButtonInactive]}
                        onPress={() => handleFilterChange('Rent')}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                filter === 'Rent' ? styles.filterTextActive : styles.filterTextInactive,
                                i18n.language === 'hi' ? { fontFamily: 'NotoSerifDevanagari-Medium' } : { fontFamily: 'Rubik-Medium' },
                            ]}
                        >
                            {t('Rent')}
                        </Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={styles.advancedFilterButton}
                    onPress={() => filterSheetRef.current.open()}
                >
                    <MaterialIcons name="filter-list" size={moderateScale(20)} color="#234F68" />
                    <Text
                        style={[
                            styles.advancedFilterText,
                            i18n.language === 'hi' ? { fontFamily: 'NotoSerifDevanagari-Medium' } : { fontFamily: 'Rubik-Medium' },
                        ]}
                    >
                        {t('Filters')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Loading and Error States */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#234F68" />
                    <Text style={styles.loadingText}>{t('loading')}</Text>
                </View>
            ) : error ? (
                <View style={styles.errorCard}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <TabView
                    navigationState={{ index, routes: dynamicRoutes }}
                    renderScene={renderScene}
                    onIndexChange={setIndex}
                    initialLayout={{ width: layout.width }}
                    renderTabBar={props => (
                        <TabBar
                            {...props}
                            scrollEnabled={true}
                            style={styles.tabBar}
                            tabStyle={styles.tabStyle}
                            indicatorStyle={styles.tabIndicator}
                            labelStyle={[
                                styles.tabLabel,
                                i18n.language === 'hi' ? { fontFamily: 'NotoSerifDevanagari-Medium' } : { fontFamily: 'Rubik-Medium' },
                            ]}
                            activeColor="#ffffff"
                            inactiveColor="#666"
                            pressColor="#e6e8eb"
                            renderTabBarItem={({ key, ...restProps }) => (
                                <TouchableOpacity
                                    key={key}
                                    {...restProps}
                                    style={[styles.tabStyle, index === restProps.navigationState.routes.findIndex(r => r.key === key) ? styles.tabActive : styles.tabInactive]}
                                >
                                    <Text
                                        style={[
                                            styles.tabLabel,
                                            i18n.language === 'hi' ? { fontFamily: 'NotoSerifDevanagari-Medium' } : { fontFamily: 'Rubik-Medium' },
                                            index === restProps.navigationState.routes.findIndex(r => r.key === key) ? { color: '#ffffff' } : { color: '#666' },
                                        ]}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        {restProps.route.title}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                    sceneContainerStyle={styles.tabView}
                    animationEnabled={true}
                    swipeEnabled={true}
                />
            )}

            {/* Filter Bottom Sheet */}
            <RBSheet
                ref={filterSheetRef}
                height={verticalScale(550)}
                openDuration={250}
                closeDuration={200}
                customStyles={{
                    container: styles.bottomSheetContainer,
                }}
            >
                <View style={styles.bottomSheetContent}>
                    <Text
                        style={[
                            styles.bottomSheetTitle,
                            i18n.language === 'hi' ? { fontFamily: 'NotoSerifDevanagari-Bold' } : { fontFamily: 'Rubik-Bold' },
                        ]}
                    >
                        {t('Advanced Filters')}
                    </Text>

                    <Text style={styles.filterLabel}>{t('Search')}</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('Search leads...')}
                        value={tempSearchTerm}
                        onChangeText={setTempSearchTerm}
                        placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.filterLabel}>{t('Date Range')}</Text>
                    <View style={styles.dateContainer}>
                        <TouchableOpacity style={styles.dateButton} onPress={() => setShowFromDatePicker(true)}>
                            <Text style={styles.dateText}>
                                {tempFromDate ? tempFromDate.toLocaleDateString() : t('From Date')}
                            </Text>
                        </TouchableOpacity>
                        {showFromDatePicker && (
                            <DateTimePicker
                                value={tempFromDate || new Date()}
                                mode="date"
                                display="default"
                                onChange={(event, selected) => {
                                    setShowFromDatePicker(false);
                                    if (selected) setTempFromDate(selected);
                                }}
                            />
                        )}
                        <TouchableOpacity style={styles.dateButton} onPress={() => setShowToDatePicker(true)}>
                            <Text style={styles.dateText}>
                                {tempToDate ? tempToDate.toLocaleDateString() : t('To Date')}
                            </Text>
                        </TouchableOpacity>
                        {showToDatePicker && (
                            <DateTimePicker
                                value={tempToDate || new Date()}
                                mode="date"
                                display="default"
                                onChange={(event, selected) => {
                                    setShowToDatePicker(false);
                                    if (selected) setTempToDate(selected);
                                }}
                            />
                        )}
                    </View>

                    <Text style={styles.filterLabel}>{t('City')}</Text>
                    <RNPickerSelect
                        onValueChange={setTempSelectedCity}
                        items={cities}
                        style={pickerSelectStyles}
                        value={tempSelectedCity}
                        placeholder={{ label: t('All Cities'), value: 'all' }}
                    />

                    <Text style={styles.filterLabel}>{t('Property Type')}</Text>
                    <RNPickerSelect
                        onValueChange={setTempSelectedPropertyType}
                        items={propertyTypes}
                        style={pickerSelectStyles}
                        value={tempSelectedPropertyType}
                        placeholder={{ label: t('All Types'), value: 'all' }}
                    />

                    <View style={styles.bottomSheetButtons}>
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={applyFilters}
                        >
                            <Text
                                style={[
                                    styles.applyButtonText,
                                    i18n.language === 'hi' ? { fontFamily: 'NotoSerifDevanagari-Medium' } : { fontFamily: 'Rubik-Medium' },
                                ]}
                            >
                                {t('Apply')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.resetButton}
                            onPress={resetFilters}
                        >
                            <Text
                                style={[
                                    styles.resetButtonText,
                                    i18n.language === 'hi' ? { fontFamily: 'NotoSerifDevanagari-Medium' } : { fontFamily: 'Rubik-Medium' },
                                ]}
                            >
                                {t('Reset')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.clearAllButton}
                            onPress={clearAllFilters}
                        >
                            <Text
                                style={[
                                    styles.clearAllButtonText,
                                    i18n.language === 'hi' ? { fontFamily: 'NotoSerifDevanagari-Medium' } : { fontFamily: 'Rubik-Medium' },
                                ]}
                            >
                                {t('Clear All')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </RBSheet>
        </View>
    );
};

export default CrmPortal;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(8),
        backgroundColor: '#fafafa',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    backButton: {
        backgroundColor: '#e6e8eb',
        borderRadius: moderateScale(12),
        width: moderateScale(40),
        height: moderateScale(40),
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: {
        width: moderateScale(20),
        height: moderateScale(20),
        tintColor: '#234F68',
    },
    headerTitle: {
        fontSize: moderateScale(20),
        color: '#234F68',
        fontWeight: '700',
    },
    refreshButton: {
        padding: moderateScale(8),
        backgroundColor: '#e6e8eb',
        borderRadius: moderateScale(12),
        width: moderateScale(40),
        height: moderateScale(40),
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(8),
        backgroundColor: '#fafafa',
        // borderBottomWidth: 1,
        // borderBottomColor: '#e6e8eb',
    },
    typeFilterContainer: {
        flexDirection: 'row',
        flex: 1,
        justifyContent: 'flex-start',
    },
    filterButton: {
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(4),
        marginHorizontal: scale(4),
        borderRadius: moderateScale(12),
        minWidth: moderateScale(70),
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: '#234F68',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    filterButtonInactive: {
        backgroundColor: '#e6e8eb',
    },
    filterText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#ffffff',
    },
    filterTextInactive: {
        color: '#666',
    },
    advancedFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: moderateScale(4),
        paddingHorizontal: moderateScale(8),
        backgroundColor: '#e6e8eb',
        borderRadius: moderateScale(12),
    },
    advancedFilterText: {
        fontSize: moderateScale(14),
        color: '#234F68',
        marginLeft: scale(4),
    },
    loadingContainer: {
        flex: 1,
        padding: moderateScale(16),
        alignItems: 'center',
        justifyContent: 'center',
        margin: scale(16),
    },
    loadingText: {
        fontSize: moderateScale(16),
        color: '#333',
        marginTop: verticalScale(8),
    },
    errorCard: {
        backgroundColor: '#ffffff',
        borderRadius: moderateScale(12),
        padding: moderateScale(16),
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        margin: scale(16),
    },
    errorText: {
        fontSize: moderateScale(16),
        color: '#e63946',
        textAlign: 'center',
    },
    tabBar: {
        backgroundColor: '#fafafa',
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 2 },
        // shadowOpacity: 0.15,
        // shadowRadius: 4,
        // elevation: 3,
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
    },
    tabIndicator: {
        backgroundColor: '#fafafa',
        height: verticalScale(3),
        borderRadius: moderateScale(2),
    },
    tabStyle: {
        width: moderateScale(120),
        borderRadius: moderateScale(12),
        padding: verticalScale(4),
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabActive: {
        backgroundColor: '#234F68',
    },
    tabInactive: {
        backgroundColor: '#fafafa',
    },
    tabLabel: {
        fontSize: moderateScale(14),
        fontWeight: '600',
        textAlign: 'center',
        textTransform: 'capitalize',
    },
    tabView: {
        backgroundColor: '#f5f7fa',
    },
    bottomSheetContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: moderateScale(16),
        borderTopRightRadius: moderateScale(16),
        padding: moderateScale(16),
    },
    bottomSheetContent: {
        flex: 1,
    },
    bottomSheetTitle: {
        fontSize: moderateScale(18),
        color: '#234F68',
        fontWeight: '700',
        marginBottom: verticalScale(12),
    },
    filterLabel: {
        fontSize: moderateScale(14),
        color: '#234F68',
        fontWeight: '600',
        marginBottom: verticalScale(8),
    },
    searchInput: {
        borderWidth: 1,
        borderColor: '#e6e8eb',
        borderRadius: moderateScale(8),
        padding: moderateScale(10),
        marginBottom: verticalScale(12),
        fontSize: moderateScale(14),
        color: '#333',
        backgroundColor: '#F9FAFB',
    },
    dateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(12),
    },
    dateButton: {
        borderWidth: 1,
        borderColor: '#e6e8eb',
        borderRadius: moderateScale(8),
        padding: moderateScale(10),
        flex: 1,
        marginHorizontal: scale(4),
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    dateText: {
        fontSize: moderateScale(14),
        color: '#333',
    },
    bottomSheetButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: verticalScale(12),
    },
    applyButton: {
        backgroundColor: '#234F68',
        padding: moderateScale(12),
        borderRadius: moderateScale(8),
        flex: 1,
        alignItems: 'center',
        marginRight: scale(4),
    },
    applyButtonText: {
        fontSize: moderateScale(14),
        color: '#ffffff',
        fontWeight: '600',
    },
    resetButton: {
        backgroundColor: '#EF4444',
        padding: moderateScale(12),
        borderRadius: moderateScale(8),
        flex: 1,
        alignItems: 'center',
        marginHorizontal: scale(4),
    },
    resetButtonText: {
        fontSize: moderateScale(14),
        color: '#ffffff',
        fontWeight: '600',
    },
    clearAllButton: {
        backgroundColor: '#6B7280',
        padding: moderateScale(12),
        borderRadius: moderateScale(8),
        flex: 1,
        alignItems: 'center',
        marginLeft: scale(4),
    },
    clearAllButtonText: {
        fontSize: moderateScale(14),
        color: '#ffffff',
        fontWeight: '600',
    },
});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: moderateScale(14),
        paddingVertical: moderateScale(10),
        borderWidth: 1,
        borderColor: '#e6e8eb',
        borderRadius: moderateScale(8),
        color: '#333',
        marginBottom: verticalScale(12),
        backgroundColor: '#F9FAFB',
        fontFamily: 'Rubik-Regular',
    },
    inputAndroid: {
        fontSize: moderateScale(14),
        paddingVertical: moderateScale(10),
        borderWidth: 1,
        borderColor: '#e6e8eb',
        borderRadius: moderateScale(8),
        color: '#333',
        marginBottom: verticalScale(12),
        backgroundColor: '#F9FAFB',
        fontFamily: 'Rubik-Regular',
    },
    placeholder: {
        color: '#9CA3AF',
    },
});
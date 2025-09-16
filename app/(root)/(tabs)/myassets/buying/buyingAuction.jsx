import { StyleSheet, ScrollView, Text, View, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import RBSheet from 'react-native-raw-bottom-sheet';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const BuyingAuction = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [newBidAmount, setNewBidAmount] = useState('');
  const [rawBidAmount, setRawBidAmount] = useState(''); // Store raw numeric value
  const [isUpdatingBid, setIsUpdatingBid] = useState(false);
  const rbSheetRef = useRef();

  useEffect(() => {
    fetchUserEnquiries();
  }, []);

  const fetchUserEnquiries = async () => {
    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('userData');
      const parsedPropertyData = userData ? JSON.parse(userData) : null;
      if (!parsedPropertyData?.id) {
        console.error('User data or ID missing');
        alert(t('fetchEnquiriesError', { error: 'User data not found' }) || 'User data not found');
        return;
      }
      const token = await AsyncStorage.getItem('userToken');

      const response = await axios.get(`https://landsquire.in/api/fetchenquiries?id=${parsedPropertyData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'LandSquireApp/1.0 (React Native)',
        },
      });

      if (response.data && response.data.myenquiries) {
        const parsedEnquiries = response.data.myenquiries
          .filter(enquiry => enquiry.propertyfor === null || enquiry.propertyfor === 'Sale')
          .map(enquiry => {
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
          })
          .filter(enquiry => enquiry.propertybid.length > 0); // only keep with valid bids
        setEnquiries(parsedEnquiries);
        // console.log('API response :', parsedEnquiries);

      } else {
        console.error('Unexpected API response format:', response.data);
        alert(t('fetchEnquiriesError', { error: 'Invalid response format' }) || 'Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      alert(t('fetchEnquiriesError', { error: error.message }) || `Failed to fetch enquiries: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserEnquiries();
  };

  const openDetails = (enquiry, isUpdateBid = false) => {
    setSelectedEnquiry(enquiry);
    setIsUpdatingBid(isUpdateBid);
    setNewBidAmount('');
    setRawBidAmount('');
    rbSheetRef.current?.open();
  };

  const updateBid = async () => {
    const cleanedBidAmount = rawBidAmount.replace(/,/g, ''); // Remove commas
    if (!cleanedBidAmount || isNaN(cleanedBidAmount) || Number(cleanedBidAmount) <= 0) {
      alert(t('invalidBidAmount') || 'Please enter a valid bid amount');
      return;
    }

    try {
      const latestBid = getLatestBid(selectedEnquiry.propertybid);
      const response = await axios.post('https://landsquire.in/api/updatebidamount', {
        leadid: selectedEnquiry.id,
        bidamount: Number(cleanedBidAmount),
        biddate: latestBid.date
      });

      if (response.data.success) {
        alert(t('bidUpdatedSuccess') || 'Bid updated successfully');
        await fetchUserEnquiries();
        rbSheetRef.current?.close();
      } else {
        alert(t('bidUpdateFailed', { error: response.data.error }) || `Failed to update bid: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Error updating bid:', error);
      alert(t('bidUpdateFailed', { error: error.message }) || `Failed to update bid: ${error.message}`);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return t('notAvailable') || 'N/A';
    const num = Number(amount);

    if (num >= 10000000) {
      const crore = num / 10000000;
      return `${crore % 1 === 0 ? crore : crore.toFixed(2).replace(/\.00$/, '')} Cr.`;
    } else if (num >= 100000) {
      const lakh = num / 100000;
      return `${lakh % 1 === 0 ? lakh : lakh.toFixed(2).replace(/\.00$/, '')} Lakh`;
    } else if (num >= 1000) {
      const thousand = num / 1000;
      return `${thousand % 1 === 0 ? thousand : thousand.toFixed(2).replace(/\.00$/, '')} Thousand`;
    }
    return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const getLatestBid = (bids) => {
    if (Array.isArray(bids) && bids.length > 0) {
      return bids.reduce((latest, current) =>
        new Date(current.date) > new Date(latest.date) ? current : latest
      );
    }
    return { bidamount: t('notAvailable') || 'N/A', date: '' };
  };

  const formatIndianNumber = (number) => {
    if (!number) return '';
    const numStr = number.toString().replace(/[^0-9]/g, ''); // Remove non-numeric characters
    if (numStr.length <= 3) return numStr;
    const lastThree = numStr.slice(-3);
    const otherNumbers = numStr.slice(0, -3);
    const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return `${formattedOther},${lastThree}`;
  };

  const handleBidAmountChange = (text) => {
    const cleanedText = text.replace(/[^0-9]/g, ''); // Remove non-numeric characters
    setRawBidAmount(cleanedText); // Store raw number
    setNewBidAmount(formatIndianNumber(cleanedText)); // Display formatted number
  };

  const renderEnquiry = ({ item }) => {
    const latestBid = getLatestBid(item.propertybid);
    const fontFamilyBold = i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold';
    const fontFamilyRegular = i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular';
    const fontFamilyMedium = i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium';

    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetails(item)}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardLabel}>{t('name') || 'Broker'}:</Text>
            <Text style={[styles.cardTitle, { fontFamily: fontFamilyBold }]}>
              {item.name || (t('notAvailable') || 'N/A')}
            </Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>{t('bidDate') || 'Date'}:</Text>
            <Text style={[styles.cardDate, { fontFamily: fontFamilyRegular }]}>
              {new Date(latestBid.date || item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.cardrow}>
          <View>
            <Text style={styles.cardLabel}>{t('bid') || 'Bid Amount'}:</Text>
            <Text style={[styles.cardText, { fontFamily: fontFamilyRegular }]}>
              {formatCurrency(latestBid.bidamount)}
            </Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>{t('propertyType') || 'Category'}:</Text>
            <Text style={[styles.cardText, { fontFamily: fontFamilyRegular }]}>
              {item.housecategory || (t('notAvailable') || 'N/A')}
            </Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>{t('city') || 'City'}:</Text>
            <Text style={[styles.cardText, { fontFamily: fontFamilyRegular }]}>
              {item.inwhichcity || (t('notAvailable') || 'N/A')}
            </Text>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          {item.propertyid && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/properties/${item.propertyid}`)}
            >
              <Text style={[styles.actionButtonText, { fontFamily: fontFamilyMedium }]}>
                {t('viewProperty') || 'View Property'}
              </Text>
            </TouchableOpacity>
          )}
          {item.agentid && (
            <TouchableOpacity
              style={[styles.actionButton, styles.agentButton]}
              onPress={() => router.push(`/broker/${item.agentid}`)}
            >
              <Text style={[styles.actionButtonText, { fontFamily: fontFamilyMedium }]}>
                {t('viewBroker') || 'View Broker'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.updateButton]}
            onPress={() => openDetails(item, true)}
          >
            <Text style={[styles.actionButtonText, { fontFamily: fontFamilyMedium }]}>
              {t('updateBid') || 'Update Bid'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBidHistory = (bids) => {
    if (!Array.isArray(bids)) return null;
    const fontFamilyMedium = i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium';
    const fontFamilyRegular = i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular';

    return bids.map((bid, index) => (
      <View key={index} style={styles.bidHistoryRow}>
        <Text style={[styles.sheetLabel, { fontFamily: fontFamilyMedium }]}>
          {t('bid', { index: index + 1 }) || `Bid ${index + 1}`}
        </Text>
        <Text style={[styles.sheetValue, { fontFamily: fontFamilyRegular }]}>
          {formatCurrency(bid.bidamount)} on {new Date(bid.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Image source={icons.backArrow} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={[styles.title, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
          {t('Auction') || 'Auction'}
        </Text>
        <TouchableOpacity onPress={() => router.push('/notifications')}>
          <Image source={icons.bell} style={styles.bellIcon} />
        </TouchableOpacity>
      </View>

      <PropertyNavigation path={'auction'} /> */}


      <View style={styles.auctionDescription}>
        <Text>All the bids done by you</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#234F68" />
        </View>
      ) : enquiries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
            {t('noEnquiries') || 'No enquiries found'}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 10,
              alignSelf: 'center',
              backgroundColor: '#234F68',
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 8,
            }}
            onPress={onRefresh}
            disabled={loading}
          >
            <Text style={{ color: '#fff', fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={enquiries}
          renderItem={renderEnquiry}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#234F68']}
            />
          }
        />
      )}

      <RBSheet
        ref={rbSheetRef}
        height={verticalScale(400)}
        openDuration={250}
        customStyles={{
          container: styles.rbSheet,
        }}
      >
        {selectedEnquiry && (
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
                {isUpdatingBid ? (t('updateBid') || 'Update Bid') : (t('enquiryDetails') || 'Enquiry Details')}
              </Text>
              <TouchableOpacity
                style={styles.sheetCloseButton}
                onPress={() => rbSheetRef.current?.close()}
              >
                <Text style={[styles.sheetCloseButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                  X
                </Text>
              </TouchableOpacity>
            </View>
            {isUpdatingBid ? (
              <View style={styles.sheetContent}>
                <View style={styles.sheetRow}>
                  <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                    {t('newBidAmount') || 'New Bid Amount'}:
                  </Text>
                  <TextInput
                    style={styles.bidInput}
                    value={newBidAmount}
                    onChangeText={handleBidAmountChange}
                    keyboardType="numeric"
                    placeholder={t('enterBidAmount') || 'Enter bid amount'}
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={styles.sheetButtonContainer}>
                  <TouchableOpacity
                    style={styles.sheetActionButton}
                    onPress={updateBid}
                  >
                    <Text style={[styles.sheetActionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                      {t('submitBid') || 'Submit Bid'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sheetActionButton, styles.cancelButton]}
                    onPress={() => rbSheetRef.current?.close()}
                  >
                    <Text style={[styles.sheetActionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                      {t('cancel') || 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.sheetContent}>
                <View style={styles.sheetRow}>

                  <View style={styles.sheetColumn}>
                    <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                      {t('name') || 'Name'}:
                    </Text>
                    <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                      {selectedEnquiry.name || (t('notAvailable') || 'N/A')}
                    </Text>
                  </View>

                  <View style={styles.sheetColumn}>
                    <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                      {t('mobile') || 'Mobile'}:
                    </Text>
                    <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                      {selectedEnquiry.mobilenumber || (t('notAvailable') || 'N/A')}
                    </Text>
                  </View>

                </View>

                <View style={styles.sheetRow}>

                  <View style={styles.sheetColumn}>
                    <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                      {t('email') || 'Email'}:
                    </Text>
                    <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                      {selectedEnquiry.email || (t('notAvailable') || 'N/A')}
                    </Text>
                  </View>

                  <View style={styles.sheetColumn}>
                    <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                      {t('city') || 'City'}:
                    </Text>
                    <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                      {selectedEnquiry.city || (t('notAvailable') || 'N/A')}
                    </Text>
                  </View>
                </View>

                <View style={styles.sheetRow}>
                  <View style={styles.sheetColumn}>
                    <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                      {t('state') || 'State'}:
                    </Text>
                    <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                      {selectedEnquiry.state || (t('notAvailable') || 'N/A')}
                    </Text>
                  </View>
                  <View style={styles.sheetColumn}>
                    <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                      {t('propertyType') || 'Property Type'}:
                    </Text>
                    <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                      {selectedEnquiry.housecategory || (t('notAvailable') || 'N/A')}
                    </Text>
                  </View>
                </View>
                <View style={styles.sheetRow}>
                  <View style={styles.sheetColumn}>

                    <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                      {t('clientsCity') || "Client's City"}:
                    </Text>
                    <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                      {selectedEnquiry.inwhichcity || (t('notAvailable') || 'N/A')}
                    </Text>
                  </View>
                  <View style={styles.sheetColumn}>
                    <Text style={[styles.sheetLabel, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                      {t('status') || 'Status'}:
                    </Text>
                    <Text style={[styles.sheetValue, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                      {selectedEnquiry.status || (t('notAvailable') || 'N/A')}
                    </Text>
                  </View>
                </View>
                {renderBidHistory(selectedEnquiry.propertybid)}
              </ScrollView>
            )}
            {!isUpdatingBid && (
              <View style={styles.sheetButtonContainer}>
                {selectedEnquiry.agentid && (
                  <TouchableOpacity
                    style={[styles.sheetActionButton, styles.agentButton]}
                    onPress={() => {
                      rbSheetRef.current?.close();
                      router.push(`/broker/${selectedEnquiry.agentid}`);
                    }}
                  >
                    <Text style={[styles.sheetActionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                      {t('viewBroker') || 'View Broker'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.sheetActionButton}
                  onPress={() => rbSheetRef.current?.close()}
                >
                  <Text style={[styles.sheetActionButtonText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Medium' : 'Rubik-Medium' }]}>
                    {t('close') || 'Close'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </RBSheet>
    </View>
  );
};

export default BuyingAuction;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
    paddingHorizontal: scale(10),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: verticalScale(5),
  },
  backButton: {
    backgroundColor: '#f4f2f7',
    borderRadius: moderateScale(20),
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: moderateScale(20),
    height: moderateScale(20),
  },
  title: {
    fontSize: moderateScale(18),
    fontFamily: 'Rubik-Bold',
    color: '#234F68',
  },
  bellIcon: {
    width: moderateScale(24),
    height: moderateScale(24),
  },
  auctionDescription: {
    marginHorizontal: 'auto',
    marginVertical: verticalScale(10),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(50),
  },
  emptyText: {
    fontSize: moderateScale(16),
    color: '#666',
    fontFamily: 'Rubik-Regular',
  },
  flatListContent: {
    paddingBottom: verticalScale(80),
    paddingHorizontal: scale(7),
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#8bc83f',
    borderWidth: 2,
    borderRadius: moderateScale(10),
    padding: moderateScale(15),
    marginVertical: verticalScale(8),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  cardrow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: moderateScale(12),
    color: '#666',
    fontFamily: 'Rubik-Regular',
  },
  cardTitle: {
    fontSize: moderateScale(16),
    color: '#234F68',
  },
  cardText: {
    fontSize: moderateScale(14),
    color: '#000',
    fontWeight: 'bold',
    marginVertical: verticalScale(3),
  },
  cardDate: {
    fontSize: moderateScale(12),
    color: '#000',
    fontWeight: 'bold',
    marginTop: verticalScale(5),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: verticalScale(10),
    gap: scale(10),
  },
  actionButton: {
    backgroundColor: '#234F68',
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(5),
    paddingHorizontal: scale(12),
  },
  agentButton: {
    backgroundColor: '#4CAF50',
  },
  updateButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: moderateScale(14),
    fontFamily: 'Rubik-Medium',
  },
  rbSheet: {
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    padding: moderateScale(20),
    backgroundColor: '#fff',
  },
  sheetContainer: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  sheetTitle: {
    fontSize: moderateScale(18),
    fontFamily: 'Rubik-Bold',
    color: '#234F68',
  },
  sheetCloseButton: {
    backgroundColor: '#f4f2f7',
    borderRadius: moderateScale(20),
    width: moderateScale(30),
    height: moderateScale(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetCloseButtonText: {
    fontSize: moderateScale(16),
    fontFamily: 'Rubik-Medium',
    color: '#234F68',
  },
  sheetContent: {
    flexGrow: 1,
    paddingBottom: verticalScale(20),
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: verticalScale(5),
  },
  sheetColumn: {
    flex: 1,
    paddingRight: 10, // spacing between columns
  },
  bidHistoryRow: {
    flexDirection: 'row',
    marginVertical: verticalScale(5),
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: verticalScale(5),
  },
  sheetLabel: {
    fontSize: moderateScale(14),
    fontFamily: 'Rubik-Medium',
    color: '#234F68',
    width: scale(120),
  },
  sheetValue: {
    fontSize: moderateScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#666',
    flex: 1,
  },
  sheetButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: verticalScale(10),
    gap: scale(10),
  },
  sheetActionButton: {
    backgroundColor: '#234F68',
    borderRadius: moderateScale(8),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  sheetActionButtonText: {
    color: '#fff',
    fontSize: moderateScale(14),
    fontFamily: 'Rubik-Medium',
  },
  bidInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: moderateScale(8),
    padding: moderateScale(8),
    fontSize: moderateScale(14),
    fontFamily: 'Rubik-Regular',
    color: '#000',
    width: scale(200),
  },
});
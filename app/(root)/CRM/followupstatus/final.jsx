import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import React from 'react';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

const Final = ({ enquiries }) => {
    const { t, i18n } = useTranslation();
    const router = useRouter();

    const renderEnquiry = ({ item }) => {
            return (
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => router.push(`/CRM/${item.id}`)}
                    activeOpacity={0.8}
                >
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardLabel}>{t('Name')}:</Text>
                            <Text style={[styles.cardTitle, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Bold' : 'Rubik-Bold' }]}>
                                {item.name || t('unknown')}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.cardLabel}>{t('Date')}:</Text>
                            <Text style={[styles.cardDate, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                {new Date(item.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.cardLabel}>{t('Category')}:</Text>
                            <Text style={[styles.cardText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                {item.housecategory || t('notAvailable')}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.cardRow}>
                        <View>
                            <Text style={styles.cardLabel}>{t('City')}:</Text>
                            <Text style={[styles.cardText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                {item.inwhichcity || t('notAvailable')}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.cardLabel}>{t('Property For')}:</Text>
                            <Text style={[styles.cardText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                {(item.propertyfor !== 'Rent' ? 'Sell' : 'Rent') || t('notSpecified')}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.cardLabel}>{t('Status')}:</Text>
                            <Text style={[styles.cardText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                                {item.status || t('notAvailable')}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        };

    return (
        <View style={styles.container}>
            {enquiries.length > 0 ? (
                <FlatList
                    data={enquiries}
                    renderItem={renderEnquiry}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                />
            ) : (
                <View style={styles.noDataContainer}>
                    <Text style={[styles.noDataText, { fontFamily: i18n.language === 'hi' ? 'NotoSerifDevanagari-Regular' : 'Rubik-Regular' }]}>
                        {t('noLeads')}
                    </Text>
                </View>
            )}
        </View>
    );
};

export default Final;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    listContent: {
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(12),
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: moderateScale(12),
        padding: moderateScale(16),
        marginBottom: verticalScale(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(10),
    },
    cardLabel: {
        fontSize: moderateScale(12),
        color: '#6B7280',
        fontFamily: 'Rubik-Regular',
    },
    cardTitle: {
        fontSize: moderateScale(16),
        color: '#1F3A5F',
        fontWeight: 'bold',
    },
    cardDate: {
        fontSize: moderateScale(14),
        color: '#374151',
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(8),
    },
    cardText: {
        fontSize: moderateScale(14),
        color: '#374151',
    },
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        fontSize: moderateScale(16),
        color: '#9CA3AF',
        textAlign: 'center',
    },
});
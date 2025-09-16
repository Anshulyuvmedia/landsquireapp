import { StyleSheet, Text, View, useWindowDimensions, TouchableOpacity, Image } from 'react-native';
import * as React from 'react';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useRouter } from 'expo-router';
import icons from '@/constants/icons';
import RentListing from './rentlisting';
import RentLeads from './rentleads';

// Define the SceneMap with the routes
const renderScene = SceneMap({
    RentListing: RentListing,
    RentLeads: RentLeads,
});

// Define the routes array
const routes = [
    { key: 'RentListing', title: 'Rent Property' },
    { key: 'RentLeads', title: 'Rent Leads' },
];

const RentScreen = () => {
    const layout = useWindowDimensions();
    const [index, setIndex] = React.useState(0);
    const router = useRouter();

    // Custom renderTabBar to set equal width and custom label background
    const CustomTabBar = ({ navigationState, jumpTo, layout }) => {
        const tabWidth = layout.width / navigationState.routes.length;

        return (
            <View style={{ flexDirection: 'row', backgroundColor: '#fafafa', borderRadius: 20, }}>
                {navigationState.routes.map((route, i) => {
                    const focused = navigationState.index === i;
                    return (
                        <TouchableOpacity
                            key={route.key} // Explicitly pass key here
                            style={{
                                width: tabWidth,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: focused ? '#8bc83f' : '#fafafa',
                                // borderRadius: 16,
                                paddingVertical: verticalScale(4),
                            }}
                            onPress={() => jumpTo(route.key)}
                        >
                            <View
                                style={{
                                    margin: 4,
                                }}
                            >
                                <Text
                                    style={{
                                        color: focused ? '#fff' : '#999',
                                        fontSize: moderateScale(16),
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                    }}
                                >
                                    {route.title}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Image source={icons.backArrow} style={styles.backIcon} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { fontFamily: 'Rubik-Bold' }]}>
                        Rented Properties
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/notifications')}>
                        <Image source={icons.bell} style={styles.bellIcon} />
                    </TouchableOpacity>
                </View>
                <TabView
                    navigationState={{ index, routes }}
                    renderScene={renderScene}
                    onIndexChange={setIndex}
                    initialLayout={{ width: layout.width }}
                    renderTabBar={(props) => <CustomTabBar {...props} layout={layout} />}
                />
            </View>
        </View>
    );
};

export default RentScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: '#8bc83f',
        // paddingHorizontal: scale(10),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(10),
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
        color: '#234F68',
    },
    bellIcon: {
        width: moderateScale(24),
        height: moderateScale(24),
    },
});
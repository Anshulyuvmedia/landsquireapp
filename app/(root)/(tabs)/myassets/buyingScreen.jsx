import { StyleSheet, Text, View, useWindowDimensions, TouchableOpacity } from 'react-native';
import * as React from 'react';
import { TabView, SceneMap } from 'react-native-tab-view';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import BuyingWishlists from './buying/buyingWishlists';
import BuyingAuction from './buying/buyingAuction';
import BuyingEnquiries from './buying/buyingEnquiries';

// Define the SceneMap with the routes
const renderScene = SceneMap({
    Wishlists: BuyingWishlists,
    Auction: BuyingAuction,
    Enquiry: BuyingEnquiries, // Note: Confirm if Enquiry should map to a separate component
});

// Define the routes array
const routes = [
    { key: 'Wishlists', title: 'Wishlist' },
    { key: 'Auction', title: 'Auction' },
    { key: 'Enquiry', title: 'Enquiry' },
];

const BuyingScreen = () => {
    const layout = useWindowDimensions();
    const [index, setIndex] = React.useState(0);

    // Custom renderTabBar to set equal width and avoid key prop spreading
    const CustomTabBar = ({ navigationState, jumpTo, layout }) => {
        const tabWidth = layout.width / navigationState.routes.length;

        return (
            <View style={styles.tabBar}>
                {navigationState.routes.map((route, i) => {
                    const focused = navigationState.index === i;
                    return (
                        <TouchableOpacity
                            key={route.key} // Explicitly pass key
                            style={[
                                styles.tabItem,
                                { width: tabWidth, },
                            ]}
                            onPress={() => jumpTo(route.key)}
                        >
                            <Text
                                style={[
                                    styles.tabLabel,
                                    { color: focused ? '#fff' : '#999', backgroundColor: focused ? '#234F68' : '#f4f2f7' },
                                ]}
                            >
                                {route.title}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={{ width: layout.width }}
                renderTabBar={(props) => <CustomTabBar {...props} layout={layout} />}
            />
        </View>
    );
};

export default BuyingScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
        // paddingHorizontal: scale(10),
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#f4f2f7',
        borderRadius: moderateScale(5),
        // marginHorizontal: scale(5),
        marginVertical: verticalScale(5),
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabLabel: {
        fontSize: moderateScale(14),
        fontWeight: 'bold',
        textAlign: 'center',
        paddingVertical: verticalScale(4),
        paddingHorizontal: scale(12),
        borderRadius: 7,

    },
});
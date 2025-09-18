import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useEffect } from "react";
import { useUser } from '@/context/UserContext';
import { View } from 'react-native';

const TabIcon = ({ focused, name, title }) => {
    const scale = useSharedValue(1);
    const translateY = useSharedValue(0);
    const dotOpacity = useSharedValue(0);

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateY: translateY.value },
        ],
    }));

    const animatedDotStyle = useAnimatedStyle(() => ({
        opacity: dotOpacity.value,
    }));

    useEffect(() => {
        scale.value = withSpring(focused ? 1.2 : 1, { damping: 12, stiffness: 120 });
        translateY.value = withSpring(focused ? -6 : 0, { damping: 12, stiffness: 120 });
        dotOpacity.value = withTiming(focused ? 1 : 0, { duration: 200 });
    }, [focused, scale, translateY, dotOpacity]);

    return (
        <View className="flex-grow flex-col items-center justify-center h-full">
            <Animated.View style={animatedIconStyle}>
                <FontAwesome
                    name={name}
                    size={24}
                    color={focused ? "#234F68" : "#666876"}
                />
            </Animated.View>
            <Animated.View style={[{ marginTop: 4 }, animatedDotStyle]}>
                {focused && (
                    <View
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: "#234F68",
                        }}
                    />
                )}
            </Animated.View>
        </View>
    );
};

const TabsLayout = () => {
    const insets = useSafeAreaInsets();
    const { userType, loading } = useUser();
    const router = useRouter();

    // Define tab configurations
    const tabsConfig = [
        { name: "home", title: "Home", icon: "compass" },
        { name: "myassets", title: "My Assets", icon: "building-o" },
        { name: "mapview", title: "Map", icon: "map-o" },
        { name: "addlisting", title: "Add Property", icon: "plus-square-o" },
        { name: "dashboard", title: "Dashboard", icon: "user-o" },
    ];

    if (loading) {
        return null; // Delay rendering until userType is fetched
    }

    // Hide tab navigation and redirect to loanleads if userType is 'bankagent'
    // if (userType === 'user') {
    //     router.push('/mapview');
    //     return null;
    // }
    // else {
    //     router.push('/');
    // }

    return (
        <Tabs
            // initialRouteName="mapview"
            screenOptions={{
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: "#ffffff",
                    position: "absolute",
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    height: 45 + insets.bottom,
                    paddingBottom: insets.bottom,
                    paddingTop: 20,
                    borderRadius: 25,
                    marginHorizontal: 10,
                    marginBottom: 12,
                },
            }}
        >
            {tabsConfig.map((tab) => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        title: tab.title,
                        headerShown: false,
                        tabBarIcon: ({ focused }) => (
                            <TabIcon focused={focused} name={tab.icon} title={tab.title} />
                        ),
                    }}
                />
            ))}
        </Tabs>
    );
};

export default TabsLayout;
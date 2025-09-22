import { Tabs } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, useAnimatedReaction, interpolate, Extrapolate, } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Dimensions } from 'react-native';

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

    useAnimatedReaction(
        () => focused,
        (currentFocused) => {
            // console.log(`TabIcon (${title}) focused (reaction):`, currentFocused);
            scale.value = withSpring(currentFocused ? 1.2 : 1, { damping: 12, stiffness: 120 });
            translateY.value = withSpring(currentFocused ? -6 : 0, { damping: 12, stiffness: 120 });
            dotOpacity.value = withTiming(currentFocused ? 1 : 0, { duration: 200 });
        },
        [focused]
    );

    return (
        <Animated.View className="flex-grow flex-col items-center justify-center h-full">
            <Animated.View style={animatedIconStyle}>
                <FontAwesome
                    name={name}
                    size={24}
                    color={focused ? '#234F68' : '#666876'}
                />
            </Animated.View>
            <Animated.View style={[{ marginTop: 4 }, animatedDotStyle]}>
                <Animated.View
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#234F68',
                    }}
                />
            </Animated.View>
        </Animated.View>
    );
};

const TabsLayout = () => {
    const tabsConfig = [
        { name: 'home', title: 'Home', icon: 'compass' },
        { name: 'myassets', title: 'My Assets', icon: 'building-o' },
        { name: 'mapview', title: 'Map', icon: 'map-o' },
        { name: 'addlisting', title: 'Add Property', icon: 'plus-square-o' },
        { name: 'settings', title: 'Settings', icon: 'user-o' },
    ];

    const { width } = Dimensions.get('window');

    return (
        <Tabs
            screenOptions={({ route }) => ({
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    height: 70,
                    paddingTop: 20,
                    borderRadius: 25,
                    marginHorizontal: 10,
                    marginBottom: 12,
                },
                tabBarHideOnKeyboard: true,
                tabBarIcon: ({ focused }) => {
                    const tab = tabsConfig.find((t) => t.name === route.name);
                    return <TabIcon focused={focused} name={tab.icon} title={tab.title} />;
                },
                // Custom slide animation for tab transitions
                tabBarScreenOptions: {
                    transitionSpec: {
                        open: {
                            animation: 'spring',
                            config: { stiffness: 100, damping: 20 },
                        },
                        close: {
                            animation: 'spring',
                            config: { stiffness: 100, damping: 20 },
                        },
                    },
                    cardStyleInterpolator: ({ current, next, layouts }) => {
                        return {
                            cardStyle: {
                                transform: [
                                    {
                                        translateX: Animated.interpolate(current.progress, {
                                            inputRange: [0, 1],
                                            outputRange: [width, 0],
                                            extrapolate: Extrapolate.CLAMP,
                                        }),
                                    },
                                    {
                                        translateX: next
                                            ? Animated.interpolate(next.progress, {
                                                inputRange: [0, 1],
                                                outputRange: [0, -width],
                                                extrapolate: Extrapolate.CLAMP,
                                            })
                                            : 0,
                                    },
                                ],
                            },
                            containerStyle: {
                                opacity: Animated.interpolate(current.progress, {
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0, 0.5, 1],
                                    extrapolate: Extrapolate.CLAMP,
                                }),
                            },
                        };
                    },
                },
            })}
            sceneContainerStyle={{ backgroundColor: '#fafafa' }}
        >
            {tabsConfig.map((tab) => (
                <Tabs.Screen
                    key={`${tab.name}-${tab.title}`}
                    name={tab.name}
                    options={{
                        title: tab.title,
                        headerShown: false,
                    }}
                />
            ))}
        </Tabs>
    );
};

export default TabsLayout;
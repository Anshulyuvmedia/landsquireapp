// app/(root)/(tabs)/myassets/_layout.jsx
import { Stack } from 'expo-router';

export default function MyAssetsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }} >
            <Stack.Screen name="assetScreen" options={{ title: 'My Assets', headerShown: false }} />
            <Stack.Screen name="buyingScreen" options={{ title: 'Buying', headerShown: false }} />
            <Stack.Screen name="sellingScreen" options={{ title: 'Selling', headerShown: false }} />
        </Stack>
    );
}
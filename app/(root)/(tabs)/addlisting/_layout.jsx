// app/(root)/(tabs)/myassets/_layout.jsx
import { Stack } from 'expo-router';

export default function MyListingLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }} >
            <Stack.Screen name="listingScreen" options={{ title: 'My Assets', headerShown: false }} />
            <Stack.Screen name="addproperty" options={{ title: 'My Properties', headerShown: false }} />
            <Stack.Screen name="rentproperty" options={{ title: 'Auction', headerShown: false }} />
        </Stack>
    );
}
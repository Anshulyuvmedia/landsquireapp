// app/(root)/_layout.js
import { Stack } from 'expo-router';

const RootLayout = () => {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true, // Enable gestures for back navigation
            }}
        >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard/editprofile" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard/loanleads" options={{ headerShown: false }} />
            <Stack.Screen name="CRM/crmportal" options={{ headerShown: false }} />
            <Stack.Screen name="Rent/rentscreen" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="loanenquiry" options={{ headerShown: false }} />
            <Stack.Screen name="privacypolicy" options={{ headerShown: false }} />
            <Stack.Screen name="termsandconditions" options={{ headerShown: false }} />
            <Stack.Screen name="userandagentagreement" options={{ headerShown: false }} />
            <Stack.Screen name="cookiespolicy" options={{ headerShown: false }} />
            <Stack.Screen name="contentandlistingguidelines" options={{ headerShown: false }} />
            <Stack.Screen name="dataretentionanddeletionpolicy" options={{ headerShown: false }} />
        </Stack>
    );
};

export default RootLayout;
// app/(auth)/_layout.js
import { Stack } from 'expo-router';

const AuhtLayout = () => {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true, // Enable gestures for back navigation
            }}
        >
            <Stack.Screen name="signin" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
        </Stack>
    );
};

export default AuhtLayout;
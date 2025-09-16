import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export const ViewPdf = ({ route }) => {
    const { pdf } = route.params;

    return (
        <View style={styles.container}>
            <WebView source={{ uri: pdf }} style={styles.webview} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
});

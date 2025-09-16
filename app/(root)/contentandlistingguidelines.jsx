import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const ContentAndListingGuideLines = () => {
    return (
        <View style={styles.container}>
            <WebView 
                source={{ uri: '' }} 
                style={styles.webview} 
                startInLoadingState={true}
                renderLoading={() => (
                    <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
                )}
            />
        </View>
    );
};

export default ContentAndListingGuideLines;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
    loader: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -25 }, { translateY: -25 }]
    }
});

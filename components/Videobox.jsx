import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import React, { useState } from 'react';
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons'; // For play icon
import images from "@/constants/images";

const Videobox = ({ url }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const player = useVideoPlayer(url, (player) => {
        player.loop = true;
        player.pause(); // Start paused
    });

    const { isPlaying: videoIsPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

    return (
        <View style={{ padding: 10, position: 'relative' }}>
            {!isPlaying ? (
                // Show Thumbnail with Play Button
                <TouchableOpacity 
                    onPress={() => {
                        setIsPlaying(true);
                        player.play();
                    }} 
                    style={styles.thumbnailContainer}
                >
                    {/* You can use a dynamic thumbnail URL */}
                    <Image 
                        source={ images.newYork } 
                        style={styles.thumbnail} 
                    />
                    <Ionicons name="play-circle" size={50} color="white" style={styles.playIcon} />
                </TouchableOpacity>
            ) : (
                // Show Video when playing
                <VideoView
                    style={styles.video}
                    player={player}
                    allowsFullscreen
                    allowsPictureInPicture
                    showBuffering={false} // Show buffering only when playing
                />
            )}
        </View>
    );
}

export default Videobox;

const styles = StyleSheet.create({
    thumbnailContainer: {
        width: 150,
        height: 150,
        borderRadius: 10,
        backgroundColor: '#000', 
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnail: {
        width: 150,
        height: 150,
        borderRadius: 10,
        position: 'absolute',
    },
    playIcon: {
        position: 'absolute',
        zIndex: 2,
    },
    video: {
        width: 150,
        height: 150,
        borderRadius: 10,
        aspectRatio: 16 / 9,
    },
});

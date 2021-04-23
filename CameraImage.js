/* eslint-disable prettier/prettier */
import React, { Component } from 'react';
import { Text, ImageBackground, StyleSheet } from 'react-native';

export default class CameraImage extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { base64Image, date } = this.props;
        return (
            <ImageBackground source={{ uri: `data:image/jpg;base64,${base64Image}` }} style={styles.imageOverlay} resizeMode="cover">
                <Text style={styles.textOverlay}>{date}</Text>
            </ImageBackground>
        );
    }
}

const styles = StyleSheet.create({
    imageOverlay: {
        aspectRatio: 1.33,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 5,
        borderWidth: 5,
        borderColor: '#fff',
    },
    textOverlay: {
        color: 'white',
        textAlign: 'center',
        position: 'absolute',
        fontSize: 12,
        bottom: 5,
        left: 5,
    },
});

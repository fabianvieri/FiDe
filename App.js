/* eslint-disable prettier/prettier */
import React, { Component } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import PushNotification from 'react-native-push-notification';
import moment from 'moment';
import CameraImage from './CameraImage';

const NOTIF_CHANNEL = 'fire-channel';
const CAMERA_ID = 'cam1';
const FIRE_FIGHTER_ID = 'fighter1';
const USER_ID = 'user1';
const API_URL = 'https://sfh-server.herokuapp.com';

PushNotification.configure({
  onNotification: function () { },
  onRegistrationError: function () {
    Alert.alert('Error', 'Gagal registrasi notifikasi');
  },
  popInitialNotification: true,
  requestPermissions: true,
});

class App extends Component {

  constructor() {
    super();
    this.state = {
      image: {
        base64Image: '',
        date: '',
        status: null,
      },
      disableReport: false,
      fireFighterInfo: {
        name: '',
        address: '',
        phone: '',
      },
    };
    this.interval = null;
    this.alert = false;
  }

  componentDidMount() {
    PushNotification.createChannel(
      {
        channelId: NOTIF_CHANNEL,
        channelName: 'Push Fire Notifications',
        soundName: 'default',
      }
    );

    this.startBackgroundFetch();
  }

  componentDidUpdate(prevProps, prevState) {
    const currentStatus = this.state.image.status;
    const oldStatus = prevState.image.status;
    if (currentStatus !== oldStatus) {
      if (oldStatus === null) {
        this.pushLocalNotification(currentStatus);
      } else if (oldStatus === 0) {
        this.pushLocalNotification(1);
      } else {
        this.pushLocalNotification(0);
      }
    }
  }

  componentWillUnmount() {
    this.stopBackgroundFetch();
  }

  getCameraImage = async () => {
    try {
      const response = await fetch(`${API_URL}/get/image?camera=${CAMERA_ID}`);
      if (response.status === 200) {
        const data = await response.json();
        const newImage = { base64Image: data.image, date: data.date, status: data.status };
        const newState = { ...this.state };
        newState.image = newImage;
        const oldStatus = this.state.image.status;
        if (oldStatus !== data.status) {
          if ((data.status === 1 && !this.state.disableReport) || data.status === 0) {
            newState.disableReport = false;
            if (data.status === 0) {
              newState.fireFighterInfo.name = '';
            }
          }
        }
        this.setState(newState);
      } else {
        this.alertError('Gagal mengambil gambar kamera');
      }
    } catch (error) {
      this.alertError('Koneksi ke internet gagal');
    }
  }

  alertError = (message) => {
    if (!this.alert) {
      this.alert = true;
      Alert.alert('Error', message,
        [
          {
            text: 'OK',
            onPress: this.disableAlert,
          },
        ]
      );
    }
  }

  disableAlert = () => {
    this.alert = false;
  }

  startBackgroundFetch = () => {
    this.interval = BackgroundTimer.setInterval(this.getCameraImage, 1000);
  }

  stopBackgroundFetch = () => {
    if (this.interval) {
      BackgroundTimer.clearInterval(this.interval);
      this.interval = null;
    }
  }

  pushLocalNotification = (status) => {
    PushNotification.channelExists(NOTIF_CHANNEL, (exists) => {
      if (exists) {
        PushNotification.localNotification({
          channelId: NOTIF_CHANNEL,
          title: 'Fire Detector',
          message: status === 1 ? 'Terdeteksi api pada kamera' : 'Tidak terdeteksi api pada kamera',
          soundName: 'default',
          vibrate: true,
          vibration: 3000,
        });
      }
    });
  }

  sendNotification = async () => {
    const { base64Image } = this.state.image;
    const date = moment().format('YYYY/MM/DD hh:mm:ss a').toUpperCase();
    try {
      const response = await fetch(`${API_URL}/post/case`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image, status: 'ongoing', user: USER_ID, date: date }),
      });

      if (response.status === 200) {
        this.setState({ disableReport: true });
        const responseData = await fetch(`${API_URL}/get/firefighter?id=${FIRE_FIGHTER_ID}`);
        if (responseData.status === 200) {
          const data = await responseData.json();
          this.setState({ fireFighterInfo: data });
        } else {
          this.alertError('Gagal mengambil data pemadam kebakaran');
        }
      } else {
        this.alertError('Gagal mengirim notifikasi');
      }
    } catch (error) {
      this.alertError('Koneksi ke internet gagal');
    }
  }

  render() {
    const { image, disableReport, fireFighterInfo } = this.state;
    const { base64Image, date, status } = image;
    const { name, address, phone } = fireFighterInfo;

    const loadingView = (
      <View>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );

    const notififedView = (
      <View style={styles.notifContainer}>
        <Text style={styles.confirmNotif}>LAPORAN ANDA SUDAH DIKIRIM KE DAMKAR</Text>
        <Text style={styles.detailNotif}>
          {`INFORMASI DAMKAR :\n${name}\n${address}\n${phone}`}
        </Text>
      </View>
    );

    const imageView = (
      <View style={styles.imageView}>
        <CameraImage date={date} base64Image={base64Image} />
        <Text style={styles.confirmFire}>{status === 1 ? 'API TERDETEKSI' : 'TIDAK ADA API TERDETEKSI'}</Text>
      </View>
    );

    return (
      <View style={styles.container}>
        <Text style={styles.title}>TAMPILAN KAMERA</Text>
        {base64Image === '' ? loadingView : imageView}
        {
          status === 1 ?
            <TouchableOpacity
              onPress={this.sendNotification}
              disabled={disableReport}
              style={[styles.buttonReport, disableReport ? styles.buttonDisabled : styles.buttonEnabled]}
            >
              <Text style={disableReport ? styles.textDisabled : styles.textEnabled}>HUBUNGI DAMKAR</Text>
            </TouchableOpacity> : null
        }
        {name === '' || status === 0 ? null : notififedView}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ff8661',
    padding: 20,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageView: {
    width: '100%',
  },
  textEnabled: {
    color: 'white',
  },
  textDisabled: {
    color: '#2b2826',
  },
  buttonEnabled: {
    backgroundColor: '#ff5200',
  },
  buttonDisabled: {
    backgroundColor: '#8f8782',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 18,
  },
  buttonReport: {
    padding: 15,
    borderRadius: 15,
  },
  confirmFire: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 'bold',
    padding: 10,
    color: '#c94b20',
  },
  detailNotif: {
    fontSize: 12,
    textAlign: 'center',
    color: 'white',
  },
  confirmNotif: {
    textAlign: 'center',
    fontWeight: 'bold',
    padding: 5,
    color: 'white',
  },
  notifContainer: {
    // borderLeftWidth: 2,
    // borderRightWidth: 2,
    // borderTopWidth: 2,
    // borderBottomWidth: 2,
    borderRadius: 10,
    padding: 10,
    marginTop: 20,
    backgroundColor: '#e85e1c',
  },
});

export default App;

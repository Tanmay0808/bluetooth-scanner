import React, { Component } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableHighlight,
  NativeEventEmitter,
  NativeModules,
  Platform,
  PermissionsAndroid,
  ScrollView,
  FlatList,
  AppState,
  Dimensions,
  Button,
  SafeAreaView
} from 'react-native';
import BleManager from 'react-native-ble-manager';

console.disableYellowBox = true;
const window = Dimensions.get('window');
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export default class App extends Component {
  constructor(){
    super()
    this.state = {
      scanning:false,
      devices: new Map()
    }

    this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
    this.handleStopScan = this.handleStopScan.bind(this);
    this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(this);
    this.startScan= this.startScan.bind(this);
    this.test = this.test.bind(this);
    this.retrieveConnected = this.retrieveConnected.bind(this);
  }

  componentDidMount() {
    AppState.addEventListener('change', this.handleAppStateChange);
    BleManager.start();

    this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral );
    this.handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan );
    this.handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral );
    
    if (Platform.OS === 'android' && Platform.Version >= 23) {
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
            if (result) {
              console.log("Permission is OK");
            } else {
              PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                if (result) {
                  console.log("User accept");
                } else {
                  console.log("User refuse");
                }
              });
            }
      });
    }
  }

  startScan() {
    if (!this.state.scanning) {
      BleManager.scan([], 30).then((results) => {
        console.log('Scanning...');
        this.setState({scanning:true});
      });
    }
  }
  
  handleStopScan() {
    alert('Scan is stopped');
    this.setState({ scanning: false });
  }

  handleDisconnectedPeripheral(data) {
    let devices = this.state.devices;
    let peripheral = devices.get(data.peripheral);
    if (peripheral) {
      peripheral.connected = false;
      devices.set(peripheral.id, peripheral);
      this.setState({devices});
    }
    console.log('Disconnected from ' + data.peripheral);
  }

  retrieveConnected(){
    BleManager.getConnectedPeripherals([]).then((results) => {
      if (results.length == 0) {
        alert('No Device Found')
      }
      console.log(results);
      var peripherals = this.state.devices;
      for (var i = 0; i < results.length; i++) {
        var peripheral = results[i];
        peripheral.connected = true;
        devices.set(peripheral.id, peripheral);
        this.setState({ devices });
      }
    });
  }

  handleDiscoverPeripheral(peripheral){
    var devices = this.state.devices;
    console.log('Got BLE Device', peripheral);
    if (!peripheral.name) {
      peripheral.name = 'NO NAME';
    }
    devices.set(peripheral.id, peripheral);
    this.setState({ devices });
  }

  test(peripheral) {
    if (peripheral){
      if (peripheral.connected){
        BleManager.disconnect(peripheral.id);
      }else{
        BleManager.connect(peripheral.id).then(() => {
          let devices = this.state.devices;
          let p = devices.get(peripheral.id);
          if (p) {
            p.connected = true;
            devices.set(peripheral.id, p);
            this.setState({devices});
          }
          console.log('Connected to ' + peripheral.id);

        }).catch((error) => {
          console.log('Connection error', error);
        });
      }
    }
  }

  componentWillUnmount() {
    this.handlerDiscover.remove();
    this.handlerStop.remove();
    this.handlerDisconnect.remove();
  }

  renderItem(item) {
    const color = item.connected ? 'green' : '#fff';
    return (
      <TouchableHighlight onPress={() => this.test(item) }>
        <View style={[styles.row, {backgroundColor: color}]}>
          <Text style={{fontSize: 12, textAlign: 'center', color: '#333333', padding: 10}}>{item.name}</Text>
          <Text style={{fontSize: 10, textAlign: 'center', color: '#333333', padding: 2}}>RSSI: {item.rssi}</Text>
          <Text style={{fontSize: 8, textAlign: 'center', color: '#333333', padding: 2, paddingBottom: 20}}>{item.id}</Text>
        </View>
      </TouchableHighlight>
    );
  }

  render() {
    const list = Array.from(this.state.devices.values());
    const btnScanTitle = 'BT Scanning (' + (this.state.scanning ? 'on' : 'off') + ')';

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <ScrollView style={styles.scroll}>
            {(list.length == 0) && 
              <View style={{flex:1, margin: 30}}>
                <Text style={{textAlign: 'center'}}>No Devices</Text>
              </View>
            }
            <FlatList
              data={list}
              renderItem={({ item }) => this.renderItem(item) }
              keyExtractor={item => item.id}
            />
          </ScrollView>
        </View>
        <View style={{margin: 10}}>
            <Button title={btnScanTitle} onPress={() => this.startScan()} />
          </View>
          <View style={{margin: 10}}>
            <Button title="Show Connected Devices" onPress={() => this.retrieveConnected() } />
          </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    width: window.width,
    height: window.height
  },
  scroll: {
    flex: 1,
    backgroundColor: '#c2f3f1',
    margin: 10,
  },
  row: {
    margin: 10
  },
});
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
//import { WebView } from '@dr.pogodin/react-native-webview';
import Server, { STATES, resolveAssetsPath } from '@dr.pogodin/react-native-static-server';

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  };

  const [origin, setOrigin] = useState<string>('');
  const [serverStatus, setServerStatus] = useState<string>('Stopped');
  const serverRef = useRef<Server | null>(null);

  const startServer = async () => {
    const fileDir = resolveAssetsPath('webroot');
    console.log(fileDir,'fileDir');

    serverRef.current = new Server({
      fileDir,
      hostname: '127.0.0.1', // Local loopback address
      port: 8432, // Port to run the server on
      stopInBackground: false, // Stop server when app goes to background
    });

    serverRef.current.addStateListener((newState, details, error) => {
      console.log(
        `Server state: "${STATES[newState]}".\n`,
        `Details: "${details}".`,
      );
      if (error) console.error(error);
    });

    const res = await serverRef.current.start();
    if (res) {
      setOrigin(res);
      setServerStatus('Started');
      console.log('Server started at:', res);
    } else {
      setServerStatus('Failed to start');
      console.error('Failed to start server');
    }
  };

  const stopServer = async () => {
    if (serverRef.current) {
      await serverRef.current.stop();
      serverRef.current = null;
      setOrigin('');
      setServerStatus('Stopped');
      console.log('Server stopped');
    }
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <Text style={styles.title}>React Native Static Server Example</Text>
      <Text style={styles.serverStatus}>Server Status: {serverStatus}</Text>
      <Button
        title="Start Server"
        onPress={startServer}
        disabled={serverStatus === 'Started'}
      />
      <Button
        title="Stop Server"
        onPress={stopServer}
        disabled={serverStatus !== 'Started'}
      />
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  text: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  serverStatus: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: 'green',
  },
});
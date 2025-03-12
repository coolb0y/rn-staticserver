import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import RNFS from 'react-native-fs'; // For file system access
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
  const [loading, setLoading] = useState<boolean>(false);
  const [searching, setSearching] = useState<boolean>(false); // State for search progress
  const serverRef = useRef<Server | null>(null);
  

  // Function to request storage permissions (required for Android 6.0+)
  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
        if (
          granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
            PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('Storage permissions granted');
          return true;
        } else {
          console.log('Storage permissions denied');
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // Permissions are not required on iOS
  };

  // Function to recursively search for the "WebContent" folder
  const findWebContentFolder = async (dir: string): Promise<string | null> => {
    console.log(`Starting search in directory: ${dir}`);
  
    // Create a queue to hold directories to search
    const queue: string[] = [dir];
  
    while (queue.length > 0) {
      const currentDir = queue.shift(); // Get the next directory from the queue
      if (!currentDir) continue;
  
      console.log(`Searching in directory: ${currentDir}`);
  
      try {
        // Skip restricted directories
        if (currentDir.includes('/Android/data') || currentDir.includes('/Android/obb')) {
          console.log(`Skipping restricted directory: ${currentDir}`);
          continue;
        }
  
        // Read the contents of the current directory
        const items = await RNFS.readDir(currentDir);
        console.log(`Found ${items.length} items in ${currentDir}`);
  
        for (const item of items) {
          console.log(`Checking item: ${item.name}`);
  
          // If the item is the "WebContent" folder, return its path
          if (item.isDirectory() && item.name === 'WebContent') {
            console.log(`Found WebContent folder at: ${item.path}`);
            return item.path;
          }
  
          // If the item is a directory, add it to the queue for further searching
          if (item.isDirectory()) {
            console.log(`Adding directory to queue: ${item.path}`);
            queue.push(item.path);
          }
        }
      } catch (error) {
        console.error(`Error searching in ${currentDir}:`, error);
      }
    }
  
    // If the loop finishes without finding the folder, return null
    console.log('WebContent folder not found');
    return null;
  };

  // Function to search for "WebContent" in prioritized locations
  const searchWebContentFolder = async (): Promise<string | null> => {
    setSearching(true);

    // Priority 1: Download directory
    const downloadDir = RNFS.DownloadDirectoryPath;
    console.log('Searching in Download directory:', downloadDir);
    let webContentPath = await findWebContentFolder(downloadDir);
    if (webContentPath) {
      setSearching(false);
      return webContentPath;
    }

    // Priority 2: Root of internal storage
    const internalStorageRoot = RNFS.ExternalStorageDirectoryPath;
    console.log('Searching in internal storage root:', internalStorageRoot);
    webContentPath = await findWebContentFolder(internalStorageRoot);
    if (webContentPath) {
      setSearching(false);
      return webContentPath;
    }

    // Priority 3: Root of SD card (if available)
    const sdCardRoot = RNFS.ExternalStorageDirectoryPath.replace('/storage/emulated/0', '/storage');
    if (sdCardRoot !== internalStorageRoot) {
      try {
        const sdCardExists = await RNFS.exists(sdCardRoot);
        if (sdCardExists) {
          console.log('Searching in SD card root:', sdCardRoot);
          webContentPath = await findWebContentFolder(sdCardRoot);
          if (webContentPath) {
            setSearching(false);
            return webContentPath;
          }
        }
      } catch (error) {
        console.error('Error accessing SD card:', error);
      }
    }

    setSearching(false);
    return null; // Not found
  };

  const startServer = async () => {
    setLoading(true);
  
    // Request storage permissions before accessing files
    await requestStoragePermission();
  
    // Search for the "WebContent" folder
    const webContentPath = await searchWebContentFolder();
    if (!webContentPath) {
      Alert.alert('Error', 'WebContent folder not found');
      setLoading(false);
      return;
    }
  
    // Prepare the extraConfig string
    const extraConfigs = `
      server.modules += ("mod_simple_vhost")
      simple-vhost.server-root = "${webContentPath}"
      simple-vhost.default-host = "default"
    `;
  
    console.log('WebContent folder found at:', webContentPath);
    console.log('Extra Config:', extraConfigs);
  
    try {
      serverRef.current = new Server({
        extraConfig: extraConfigs,
        fileDir: webContentPath,
        hostname: '127.0.0.1',
        port: 8432,
        stopInBackground: false,
      });
  
      serverRef.current.addStateListener((newState, details, error) => {
        console.log(`Server state: "${STATES[newState]}".\nDetails: "${details}".`);
        if (error) console.error(error);
      });
  
      const res = await serverRef.current.start();
      if (res) {
        setServerStatus('Started');
        console.log('Server started at:', res);
      } else {
        setServerStatus('Failed to start');
        console.error('Failed to start server');
      }
    } catch (error) {
      console.error('Error starting server:', error);
      Alert.alert('Error', 'Failed to start server. Check logs for details.');
      setServerStatus('Failed to start');
    } finally {
      setLoading(false);
    }
  };

  const stopServer = async () => {
    if (serverRef.current) {
      setLoading(true);
      await serverRef.current.stop();
      serverRef.current = null;
      setOrigin('');
      setServerStatus('Stopped');
      console.log('Server stopped');
      setLoading(false);
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

      {searching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Searching for WebContent folder...</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Button
            title="Start Server"
            onPress={startServer}
            disabled={serverStatus === 'Started' || loading}
          />
          <Button
            title="Stop Server"
            onPress={stopServer}
            disabled={serverStatus !== 'Started' || loading}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#000',
  },
});
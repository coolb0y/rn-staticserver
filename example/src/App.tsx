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
  View
} from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import RNFS from 'react-native-fs'; // For file system access
import Server, { STATES } from '@dr.pogodin/react-native-static-server';
import SendIntentAndroid from 'react-native-send-intent';
import { requestManagePermission , checkManagePermission} from 'manage-external-storage';

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

  const launchBrowser = () => {
    SendIntentAndroid.openApp("net.slions.fulguris.full.fdroid",{
      "net.slions.fulguris.full.fdroid.reason": "just because",
      "net.slions.fulguris.full.fdroid.data": "must be a string",
    })
  .then(wasOpened => console.log("Opened:", wasOpened))
  .catch(()=> Alert.alert("Failed to Open Lighning Browser","Please open lightning browser manually"));
  };

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android' && Platform.Version >= 30) {
      try {
        // First check if we already have permission
        const hasPermission = await checkManagePermission();
        console.log("haspermission",hasPermission);
        if (hasPermission) return true;
        
        // If not, request it
        const granted = await requestManagePermission();
        console.log("granted",granted);
        if (granted) return true;
        
        Alert.alert('Permission Required', 'Please grant Manage External Storage permission in settings.');
        return false;
      } catch (error) {
        console.error('Permission error:', error);
        return false;
      }
    }
    return true; // For non-Android or older versions
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 30) {  
          return await requestPermission(); // Now properly awaited
        } else {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          ]);
          return (
            granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
              PermissionsAndroid.RESULTS.GRANTED &&
            granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
              PermissionsAndroid.RESULTS.GRANTED
          );
        }
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    return true;
  };


  const createVirtualDirectoryPath = (dir: string, subDir: string): string => {
    return dir.replace(/ChipsterContent$/, "ChipsterEngine") + `/${subDir}`;
  };

  const listFolders = async (directoryPath: string): Promise<string> => {
    try {
        const items = await RNFS.readDir(directoryPath); // Read the directory
        const onlyFolders = items
            .filter(item => item.isDirectory())
            .map(folder => folder.name);

        // Add default folders
        const defaultFolders = ["chipstersupport", "chipsterwebmaker","chipsterwp"];
        const allFolders = [...new Set([...defaultFolders, ...onlyFolders])]; // Ensure uniqueness

        // Escape dots and other regex special characters for Lighttpd
        const escapedFolders = allFolders.map(folder => folder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

        return escapedFolders.join("|"); // Convert array to a string
    } catch (error) {
        console.error("Error reading directory:", error);
        return ""; // Return an empty string in case of an error
    }
  };


  // Function to recursively search for the "ChipsterContent" folder
  const findChipsterContentFolder = async (dir: string): Promise<string | null> => {
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

          // If the item is the "ChipsterContent" folder, return its path
          if (item.isDirectory() && item.name === 'ChipsterContent') {
            console.log(`Found ChipsterContent folder at: ${item.path}`);
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
    console.log('ChipsterContent folder not found');
    return null;
  };

  // Function to search for "ChipsterContent" in prioritized locations
  const searchChipsterContentFolder = async (): Promise<string | null> => {
    setSearching(true);

    // Priority 1: Download directory
    const downloadDir = RNFS.DownloadDirectoryPath;
    console.log('Searching in Download directory:', downloadDir);
    let chipsterContentPath = await findChipsterContentFolder(downloadDir);
    if (chipsterContentPath) {
      setSearching(false);
      return chipsterContentPath;
    }

    // Priority 2: Root of internal storage
    const internalStorageRoot = RNFS.ExternalStorageDirectoryPath;
    console.log('Searching in internal storage root:', internalStorageRoot);
    chipsterContentPath = await findChipsterContentFolder(internalStorageRoot);
    if (chipsterContentPath) {
      setSearching(false);
      return chipsterContentPath;
    }

    // Priority 3: Root of SD card (if available)
    const sdCardRoot = RNFS.ExternalStorageDirectoryPath.replace('/storage/emulated/0', '/storage');
    if (sdCardRoot !== internalStorageRoot) {
      try {
        const sdCardExists = await RNFS.exists(sdCardRoot);
        if (sdCardExists) {
          console.log('Searching in SD card root:', sdCardRoot);
          chipsterContentPath = await findChipsterContentFolder(sdCardRoot);
          if (chipsterContentPath) {
            setSearching(false);
            return chipsterContentPath;
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

    // Search for the "ChipsterContent" folder
    const chipsterContentPath = await searchChipsterContentFolder();
    if (!chipsterContentPath) {
      Alert.alert('Error', 'ChipsterContent folder not found');
      setLoading(false);
      return;
    }
    
    const chipsterWebMakerPath = `${chipsterContentPath}/EngineContent/ChipsterWebMaker`;
    const chipsterSupportPath = `${chipsterContentPath}/EngineContent/ChipsterSupport`;
    const chipsterwpPath = `${chipsterContentPath}/EngineContent/ChipsterWP`;
    const errorpage = `${chipsterContentPath}/EngineContent/ChipsterSupport/ErrorPages`; 
    let folderListString = await listFolders(`${chipsterContentPath}/WebContent`);

    console.log("errorpage",errorpage);
    console.log("chipsterwpPath",chipsterwpPath);
    console.log("chipsterSupport",chipsterSupportPath);

    const extraConfigs = `
    server.modules = (
    "mod_access",
    "mod_accesslog",
    "mod_alias",
    "mod_magnet",
    "mod_alias",
    "mod_setenv",
    "mod_rewrite",
    "mod_redirect"
    )

    server.username		= "http"
    server.groupname	= "http"
    server.document-root	= "${chipsterContentPath}"

    #simple-vhost.server-root = "${chipsterContentPath}/WebContent"
    #simple-vhost.default-host = "default"

    server.indexfiles = ( "index.html", "default.html", "index.htm", "default.htm", "index.php3", "index.php", "index.shtml", "index.html.var", "index.lua", "index.pl", "index.cgi" )
    
    # Redirect www to non-www (301 permanent)
    $HTTP["host"] =~ "^www\.(.*)$" {  # If the request is for www...
    setenv.add-request-header = ("X-Rewrite-Debug" => "A") 
    url.redirect = (
        "^/(.*)$" => "http://%1/$1"  # Redirect to non-www 
    )
    }

    $HTTP["host"] =~ "(.*)" {
    url.rewrite-repeat-if-not-file = (
        "^/(?!/(UserContent|WebContent)/)(.*)$" => "/WebContent/www.%1/$2",
        "^/WebContent/www.([^/]+)/(.+)$" => "/WebContent/$1/$2",
        "^/WebContent/([^/]+)/(.+)$" => "/UserContent/www.$1/$2",
        "^/UserContent/www.([^/]+)/(.+)$" => "/UserContent/$1/$2"
    )
    }
    
    url.rewrite = (
    "^/400.html$" => "/EngineContent/ChipsterSupport/ErrorPages/Chipster400.php",
    "^/401.html$" => "/EngineContent/ChipsterSupport/ErrorPages/Chipster401.php",
    "^/403.html$" => "/EngineContent/ChipsterSupport/ErrorPages/Chipster403.php"
    )

    server.error-handler = "/EngineContent/ChipsterSupport/ErrorPages/Chipster500.php"
    server.error-handler-404 = "/EngineContent/ChipsterSupport/ErrorPages/Chipster404.php"

    # Virtual host for ChipsterSupport
    $HTTP["host"] == "chipstersupport" {
        server.document-root = "${chipsterSupportPath}"
    }

    # Virtual host for ChipsterWebMaker
    $HTTP["host"] == "chipsterwebmaker" {
        server.document-root = "${chipsterWebMakerPath}"
    }

    $HTTP["host"] == "chipsterwp" {
        server.document-root = "${chipsterwpPath}"
    }

  accesslog.filename = "${chipsterContentPath}/access.log"
  accesslog.format = "%{%s}t %v %h %m %U %s %b %D %{X-Rewrite-Debug}o"
  server.errorlog = "${chipsterContentPath}/error.log"
  `;
  
  console.log('ChipsterContent folder found at:', chipsterContentPath);
  console.log('Extra Config:', extraConfigs);
  
    try {
      serverRef.current = new Server({
        extraConfig: extraConfigs,
        fileDir: chipsterContentPath,
        hostname: '127.0.0.1',
        port: 20286,
        stopInBackground: false,
      });

      serverRef.current.addStateListener((newState, details, error) => {
        console.log(`Server state: "${STATES[newState]}".\nDetails: "${details}".`);
        if (error) console.error(error);
      });

      const res = await serverRef.current.start();
      if (res) {
        setServerStatus('Started');
        launchBrowser();
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
      <View style={styles.header}>
        <Text style={styles.title}>Chipster Web Server</Text>
      </View>
      <Text style={styles.serverStatus}>Server Status: {serverStatus}</Text>

      {searching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Searching for ChipsterContent folder...</Text>
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
  header: {
    alignItems: 'center', // Center horizontally
    justifyContent: 'center', // Center vertically
    marginBottom: 16, // Add some spacing below the title
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center', // Center text horizontally
  },
  serverStatus: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: 'green',
    textAlign: 'center', // Center text horizontally
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#000',
    textAlign: 'center', // Center text horizontally
  },
});
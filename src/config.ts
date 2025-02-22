// Encapsulates the standard Lighttpd configuration for the library.

import {
  mkdir,
  TemporaryDirectoryPath,
  writeFile,
} from 'react-native-fs';

/**
 * Filesystem location where the library will keep its working files (configs,
 * logs, uploads) for the app.
 */
export const WORK_DIR = `${TemporaryDirectoryPath}/__rn-static-server__`;

/**
 * Filesystem location for the error log file.
 */
export const ERROR_LOG_FILE = `${WORK_DIR}/errorlog.txt`;

/**
 * Filesystem locations where the library will keep uploads for the app.
 */
export const UPLOADS_DIR = `${WORK_DIR}/uploads`;

/**
 * Options for error log, they mirror debug options of Lighttpd config:
 * https://redmine.lighttpd.net/projects/lighttpd/wiki/DebugVariables
 */
export type ErrorLogOptions = {
  conditionHandling?: boolean;
  fileNotFound?: boolean;
  requestHandling?: boolean;
  requestHeader?: boolean;
  requestHeaderOnError?: boolean;
  responseHeader?: boolean;

  // "debug.log-ssl-noise" is recognized by Lighttpd only when the Lighttpd TLS
  // module is loaded, otherwise it is reported as an unknown config key. As we
  // don't use TLS module currently, let's remove this option, at least for now.
  // See: https://github.com/birdofpreyru/react-native-static-server/issues/59#issuecomment-1646752111
  // sslNoise?: boolean;

  timeouts?: boolean;
};

/**
 * Options for the standard Lighttpd configuration for the library.
 */
export type StandardConfigOptions = {
  errorLog?: ErrorLogOptions;
  extraConfig: string;
  fileDir: string;
  hostname: string;
  port: number;
  webdav?: string[]; // DEPRECATED
};

/**
 * Generates a fragment of Lighttpd config related to error and debug logging.
 * @param errorLogOptions
 * @returns
 */
function errorLogConfig(errorLogOptions?: ErrorLogOptions): string {
  const res = [];

  if (errorLogOptions) {
    const ops: ErrorLogOptions = errorLogOptions;
    const enable = (op: string) => {
      res.push(`debug.log-${op} = "enable"`);
    };
    if (ops.conditionHandling) enable('condition-handling');
    if (ops.fileNotFound) enable('file-not-found');
    if (ops.requestHandling) enable('request-handling');
    if (ops.requestHeader) enable('request-header');
    if (ops.requestHeaderOnError) enable('request-header-on-error');
    if (ops.responseHeader) enable('response-header');

    // Not a valid option, without TLS module (see more details in a comment
    // earlier in the file).
    // if (ops.sslNoise) enable('ssl-noise');

    if (ops.timeouts) enable('timeouts');
  } else res.push('server.errorlog-use-syslog = "enable"');

  return res.join('\n');
}

/**
 * Generates the standard Lighttpd config.
 * @param param0
 * @returns
 */
function standardConfig({
  errorLog,
  extraConfig,
  fileDir,
  hostname,
  port,
  webdav, // DEPRECATED
}: StandardConfigOptions) {
  let webdavConfig = '';
  if (webdav) {
    webdavConfig += 'server.modules += ("mod_webdav")';
    for (let i = 0; i < webdav.length; ++i) {
      webdavConfig += `$HTTP["url"] =~ "${webdav[i]}" { webdav.activate = "enable" }`;
    }
  }

  return `server.document-root = "${fileDir}"
  server.bind = "${hostname}"
  server.upload-dirs = ( "${UPLOADS_DIR}" )
  server.port = ${port}
  ${errorLogConfig(errorLog)}
  index-file.names += ("index.xhtml", "index.html", "index.htm", "default.htm", "index.php")

  ${webdavConfig}
  ${extraConfig}`;
}

/**
 * Creates a new file with the standard Lighttpd configuration in the WORK_DIR,
 * and returns resolves to its path.
 * @param fileDir
 * @param hostname
 * @param port
 * @return {Promise<string>} Resolves to the name of the created config file.
 */
export async function newStandardConfigFile(
  options: StandardConfigOptions,
): Promise<string> {
  // NOTE: Lighttpd exits with error right away if the specified uploads
  // directory does not exist.
  await mkdir(UPLOADS_DIR);

  const configFile = `${WORK_DIR}/config-${Date.now()}.txt`;
  await writeFile(configFile, standardConfig(options), 'utf8');
  return configFile;
}

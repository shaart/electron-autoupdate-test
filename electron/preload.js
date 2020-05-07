const { remote, ipcRenderer } = require('electron');
const {dialog} = remote;
const logger = require('./logger');

const LOG_PREFIX = '[ui]';

window.versions = process.versions;

window.interop = {
  ipcRenderer: ipcRenderer,
  init(setVersion, onUpdateAvailable, onUpdateDownloaded) {
    ipcRenderer.send('app_version');
    ipcRenderer.on('app_version', (event, arg) => {
      ipcRenderer.removeAllListeners('app_version');
      setVersion('Version ' + arg.version);
    });

    ipcRenderer.on('update_available', () => {
      ipcRenderer.removeAllListeners('update_available');
      logger.info('A new update is available. Downloading now...');
      onUpdateAvailable();
    });

    ipcRenderer.on('update_downloaded', () => {
      ipcRenderer.removeAllListeners('update_downloaded');
      logger.info('Update Downloaded. It will be installed on restart');
      onUpdateDownloaded();
    });
  },
  log: {
    info (msg) {
      logger.info(`${LOG_PREFIX} ${msg}`);
    },
    debug (msg) {
      logger.debug(`${LOG_PREFIX} ${msg}`);
    },
    warn (msg) {
      logger.warn(`${LOG_PREFIX} ${msg}`);
    },
    error (msg) {
      logger.error(`${LOG_PREFIX} ${msg}`);
    },
    log (msg) {
      logger.silly(`${LOG_PREFIX} ${msg}`);
    }
  },
  setBadgeCount(count) {
    return remote.app.setBadgeCount(count);
  },
  showOpenDialog(options, callback) {
    dialog.showOpenDialog(options, callback);
  },
  showSaveDialog(options, callback) {
    dialog.showSaveDialog(options, callback);
  }
};
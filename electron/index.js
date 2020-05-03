const electron = require('electron');
const path = require('path');
var findPort = require("find-free-port");
const isDev = require('electron-is-dev');
const logger = require('./logger');
const splash = require('./splash');
const axios = require('axios');

const { app, BrowserWindow, dialog, Menu, Tray, clipboard, ipcMain } = electron;
const JAR = 'spring-1.0.0.jar'; // how to avoid manual update of this?
const APPLICATION_NAME = 'PStorage';
const APPLICATION_VERSION = '0.0.4';
const APPLICATION_MENU_ITEM_NAME =  `${APPLICATION_NAME} v${APPLICATION_VERSION}`;
const APPLICATION_TOOLTIP = `${APPLICATION_NAME}`;
const MAX_CHECK_COUNT = 10;
const PREFERRED_PORT = 8080;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let tray = null;

// The server url and process
let serverProcess;
let baseUrl;

function startServer(port) {
  logger.info(`Starting server at port ${port}`);

  const server = `${path.join(app.getAppPath(), '..', '..', JAR)}`;
  logger.info(`Launching server with jar ${server} at port ${port}...`);

  serverProcess = require('child_process')
    .spawn('java', [ '-jar', server, `--server.port=${port}`]);

  serverProcess.stdout.on('data', logger.server);

  if (serverProcess.pid) {
    baseUrl = `http://localhost:${port}`;
    logger.info("Server PID: " + serverProcess.pid);
  } else {
    logger.error("Failed to launch server process.")
  }
}

function stopServer() {
  logger.info('Stopping server...');
  axios.post(`${baseUrl}/actuator/shutdown`, null, {
    headers: {'Content-Type': 'application/json'}
  })
    .then(() => logger.info('Server stopped'))
    .catch(error => {
      logger.error('Failed to stop the server gracefully.', error);
      if (serverProcess) {
        logger.info(`Killing server process ${serverProcess.pid}`);
        const kill = require('tree-kill');
        kill(serverProcess.pid, 'SIGTERM', function (err) {
          if (err) {
            logger.error('An error occurred on server stopping.', err);
          }
          logger.info('Server process killed');
          serverProcess = null;
          baseUrl = null;
          app.quit(); // quit again
        });
      }
    })
    .finally(() => {
      serverProcess = null;
      baseUrl = null;
      app.quit(); // quit again
    })
}

function createWindow(callback) {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // hide until ready-to-show
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  createTrayMenu();
  loadHomePage();

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (callback) callback()
  });

  mainWindow.on('close', function (event) {
    event.preventDefault();
    mainWindow.hide();
  });

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  });
}

function createTrayMenu() {
  tray = new Tray('./resources/icon16.png');

  if (process.platform === 'win32') {
    tray.on('click', () => mainWindow.show());
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `${APPLICATION_MENU_ITEM_NAME}`, click: function () {
        mainWindow.show();
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Passwords',
      submenu: [
        { label: 'Sample password', role: 'copy', click: async () => {
            clipboard.writeText('samplePasswordValue', 'selection');
          }
        }
      ]
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit', click: function () {
        mainWindow.destroy();
        app.quit();
      }
    }
  ]);
  tray.setToolTip(APPLICATION_TOOLTIP);
  tray.setContextMenu(contextMenu);
}

function loadHomePage() {
  logger.info(`Loading home page at ${baseUrl}`);
  // check server health and switch to main page
  let checkCount = 0;
  setTimeout(function cycle() {
    axios.get(`${baseUrl}/actuator/health`)
      .then(() => mainWindow.loadURL(`${baseUrl}?_=${Date.now()}`))
      .catch(e => {
        if (e.code === 'ECONNREFUSED') {
          if (checkCount < MAX_CHECK_COUNT) {
            checkCount++;
            setTimeout(cycle, 1000);
          } else {
            dialog.showErrorBox('Server timeout',
              `UI does not receive server response for ${MAX_CHECK_COUNT} seconds.`);
            mainWindow.destroy();
            app.quit()
          }
        } else {
          logger.error(e);
          dialog.showErrorBox('Server error', 'UI receives an error from server.');
          mainWindow.destroy();
          app.quit()
        }
      });
  }, 200);
}

process.on('uncaughtException', function (error) {
  logger.error(error);
  dialog.showErrorBox(`${APPLICATION_NAME}: an unknown error occurred`,
      `${error.stack}`);
  app.quit();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  logger.info('###################################################');
  logger.info('#               Application Starting AAA          #');
  logger.info('###################################################');

  if (isDev) {
    // Assume the webpack dev server is up at port 9000
    baseUrl = `http://localhost:9000`;
    createWindow();
  } else {
    // Create window first to show splash before starting server
    const splashWindow = splash.createSplash();

    // Start server at an available port (prefer 8080)
    findPort(PREFERRED_PORT, function(err, port) {
      startServer(port);
      createWindow(() => splashWindow.close());
    });
  }
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
});

app.on('will-quit', e => {
  if (!isDev && baseUrl != null) {
    stopServer();
    e.preventDefault(); // will quite later after stopped the server
  }
});

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion() });
});
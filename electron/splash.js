const electron = require('electron');
const path = require('path');
const { BrowserWindow } = electron;
const url = require('url');
const splash = {};

splash.createSplash = function () {
  const splash = new BrowserWindow({width: 400, height: 300, frame: false});
  splash.loadURL(url.format({
    pathname: path.join(__dirname, '..', 'resources', 'splash.png'),
    protocol: 'file:',
    slashes: true
  }));
  return splash
};

module.exports = splash;
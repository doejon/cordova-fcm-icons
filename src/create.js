const fs     = require('fs-extra');
const path   = require('path');
const ig     = require('imagemagick');
const Q = require('q');

const _FILE = "fcm.png";

// getPlatforms returns platforms to convert
const getPlatforms = (projectName) => {
  const deferred = Q.defer();
  const platforms = [];

  platforms.push({
    name : 'android',
    exists : fs.existsSync('platforms/android'),
    path : 'platforms/android/app/src/main/res/',
    icons : [
      { name : 'drawable/icon.png',       size : 48 },
      { name : 'drawable-hdpi/fcm.png',  size : 36 },
      { name : 'drawable-ldpi/fcm.png',  size : 48 },
      { name : 'drawable-mdpi/fcm.png',  size : 24 },
      { name : 'drawable-xhdpi/fcm.png', size : 48 },
      { name : 'drawable-xxhdpi/fcm.png', size : 72 },
      { name : 'drawable-xxxhdpi/fcm.png', size : 96 },
    ]
  });
  deferred.resolve(platforms);
  return deferred.promise;
};

// generateIcon generates a single icon
const generateIcon = (platform, icon) => {
  const deferred = Q.defer();
  const platformPath = srcPath.replace(/\.png$/, '-' + platform.name + '.png');
  if (fs.existsSync(platformPath)) {
    srcPath = platformPath;
  }
  var dstPath = platform.iconsPath + icon.name;
  var dst = path.dirname(dstPath);
  if (!fs.existsSync(dst)) {
    fs.mkdirsSync(dst);
  }
  ig.resize({
    srcPath: srcPath,
    dstPath: dstPath,
    quality: 1,
    format: 'png',
    width: icon.size,
    height: icon.size
  } , function(err, stdout, stderr){
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve();
      console.log(icon.name + ' created');
    }
  });
  return deferred.promise;
};

// generateIconsForPlatform creates icon for a single platform
const generateIconsForPlatform = (platform) => {
  console.log('Generating Icons for ' + platform.name);
  const all = [];
  const icons = platform.icons;
  icons.forEach(function (icon) {
    all.push(generateIcon(platform, icon));
  });
  return Promise.all(all);
};

/**
 * Goes over all the platforms and triggers icon generation
 *
 * @param  {Array} platforms
 * @return {Promise}
 */
var generateIcons = function (platforms) {
  var deferred = Q.defer();
  var sequence = Q();
  var all = [];
  _(platforms).where({ isAdded : true }).forEach(function (platform) {
    sequence = sequence.then(function () {
      return generateIconsForPlatform(platform);
    });
    all.push(sequence);
  });
  Q.all(all).then(function () {
    deferred.resolve();
  });
  return deferred.promise;
};

/**
 * Checks if at least one platform was added to the project
 *
 * @return {Promise} resolves if at least one platform was found, rejects otherwise
 */
const atLeastOnePlatformFound = () => {
  const deferred = Q.defer();
  getPlatforms().then((platforms) => {
    platforms = platforms || [];
    for (let i = 0; i < platforms.length; i++){
      if (platforms.exists){
        deferred.resolve();
      }
    }
    console.error("No platforms found");
    deferred.reject();
  }).catch(() => {
    console.error("No platforms found");
    deferred.reject();
  });
  return deferred.promise;
};

/**
 * Checks if a valid icon file exists
 *
 * @return {Promise} resolves if exists, rejects otherwise
 */
var validIconExists = function () {
  const deferred = Q.defer();
  fs.exists(_FILE, function (exists) {
    if (exists) {
      console.log(_FILE + ' exists');
      deferred.resolve();
    } else {
      console.error(_FILE + ' does not exist');
      deferred.reject();
    }
  });
  return deferred.promise;
};

console.log('Trying to convert fcm.png...');

atLeastOnePlatformFound()
  .then(validIconExists)
  .then(getPlatforms)
  .then(generateIcons)
  .catch(function (err) {
    if (err) {
      console.log(err);
    }
  }).then(function () {
    console.log('... THE END');
  });

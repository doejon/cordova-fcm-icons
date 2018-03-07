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
      { name : 'drawable/fcm.png',       size : 48 },
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
  let srcPath = _FILE;
  const platformPath = srcPath.replace(/\.png$/, '-' + platform.name + '.png');
  if (fs.existsSync(platformPath)) {
    srcPath = platformPath;
  }
  const dstPath = platform.path + icon.name;
  const dst = path.dirname(dstPath);
  // does path exist?
  !fs.existsSync(dst) && fs.mkdirsSync(dst);
  // resize png
  ig.resize({
    srcPath: srcPath,
    dstPath: dstPath,
    quality: 1,
    format: 'png',
    width: icon.size,
    height: icon.size
  } , (err, stdout, stderr) => {
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
  console.log('Generating icons for ' + platform.name);
  const all = [];
  const icons = platform.icons;
  icons.map((icon) => {
    all.push(generateIcon(platform, icon));
  });
  return Promise.all(all);
};


// Generate multiple icons
const generateIcons = (platforms) => {
  const deferred = Q.defer();
  let sequence = Q();
  const all = [];
  platforms.map((platform) => {
    sequence = sequence.then(() => {
      return generateIconsForPlatform(platform);
    });
    all.push(sequence);
  })
  Q.all(all).then(() => {
    deferred.resolve();
  });
  return deferred.promise;
};

// Is there at least a single platform available?
const atLeastOnePlatformFound = () => {
  const deferred = Q.defer();
  getPlatforms().then((platforms) => {
    platforms = platforms || [];
    let found = false;
    for (let i = 0; i < platforms.length; i++){
      if (platforms[i].exists){
        found = true;
        break;
      }
    }
    found && deferred.resolve();
    !found && console.error("No platforms found");
    !found && deferred.reject();
  }).catch(() => {
    console.error("No platforms found");
    deferred.reject();
  });
  return deferred.promise;
};

// Does our beloved fcm.png (_FILE) exist?
const validIconExists = () => {
  const deferred = Q.defer();
  fs.exists(_FILE, (exists) => {
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
  .catch((err) => {
    if (err) {
      console.log(err);
    }
  }).then(() => {
    console.log('... THE END');
  });

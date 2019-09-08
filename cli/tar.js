'use strict';

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const async = require('async');
const tar = require('tar-stream');

const formatSize = size => {
  let sizes = [[2, 'M'], [1, 'k']];
  while (sizes.length) {
    let checkSize = sizes.shift();
    let limit = Math.pow(1024, checkSize[0]);
    if (size > limit) {
      return `${(size / limit).toFixed(2)} ${checkSize[1]}B`
    }
  }
  return `${size} B`;
};

function readFiles (base, properties, dir, data) {

  dir = dir || '/';
  data = data || [];
  data._size = data._size || 0;
  properties = properties || {};

  let ignore = properties.ignore || {};

  return fs.readdirSync(path.join(base, dir)).reduce((data, f) => {

    let pathname = path.join(dir, f);
    let fullpath = path.join(base, pathname);

    for (let i = 0; i < ignore.length; i++) {
      if (ignore[i][0] === '/') {
        if (pathname.split(path.sep).join('/') === ignore[i]) {
          return data;
        }
      } else {
        if (f === ignore[i]) {
          return data;
        }
      }
    }

    if (fs.statSync(fullpath).isDirectory()) {
      return readFiles(base, properties, pathname, data);
    } else {
      let filename = pathname[0] === path.sep ? pathname.substr(1) : pathname;
      let buffer = fs.readFileSync(fullpath);
      filename = filename.split(path.sep).join('/'); // Windows
      data._size += buffer.byteLength;
      data.push({filename: filename, buffer: buffer});
      return data;
    }

  }, data);

};

module.exports = {

  pack: async function (pathname, showProgress) {

    showProgress = !!showProgress;
    const progress = {log: function () { showProgress && console.log.apply(null, arguments); }};

    return new Promise((resolve, reject) => {

      !fs.existsSync('/tmp') && fs.mkdirSync('/tmp');
      !fs.existsSync('/tmp/packit') && fs.mkdirSync('/tmp/packit', 0o777);
      let tmpPath = `/tmp/packit/newpack.${new Date().valueOf()}.tar.gz`;

      let start = new Date().valueOf();

      let tarball = fs.createWriteStream(tmpPath, {mode: 0o777});
      let pack = tar.pack();


      let ignoreList = fs.existsSync('.libignore') ? fs.readFileSync('.libignore').toString() : '';
      ignoreList = ignoreList.split('\n').map(v => v.replace(/^\s(.*)\s$/, '$1')).filter(v => v);

      let data = readFiles(path.join(process.cwd(), pathname), {ignore: ignoreList});
      let packSize = 0;

      // pipe the pack stream to your file
      pack.pipe(tarball);

      // Run everything in parallel...
      async.parallel(data.map((file) => {
        return (callback) => {
          pack.entry({name: file.filename}, file.buffer, () => {
            packSize += file.buffer.byteLength;
            progress.log(`Packing "${file.filename}" (${((packSize / data._size) * 100).toFixed(2)}%) ...`);
            callback();
          });
        };
      }), (err) => {
        if (err) {
          return reject(err);
        }
        pack.finalize();
      });
      tarball.on('close', () => {
        let buffer = fs.readFileSync(tmpPath);
        fs.unlinkSync(tmpPath);
        progress.log(`Package size: ${formatSize(buffer.byteLength)}`);
        progress.log(`Compressing ...`);
        zlib.gzip(buffer, (err, result) => {
          if (err) {
            return reject(err);
          }
          let t = new Date().valueOf() - start;
          progress.log(`Compressed size: ${formatSize(result.byteLength)}`);
          progress.log(`Compression: ${((result.byteLength / buffer.byteLength) * 100).toFixed(2)}%`);
          progress.log(`Pack complete, took ${t}ms!`);
          resolve(result);
        });
      });

    });

  }
}

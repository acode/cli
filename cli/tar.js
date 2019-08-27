'use strict';

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const async = require('async');
const tar = require('tar-stream');

function readFiles (base, properties, dir, data) {

  dir = dir || '/';
  data = data || [];
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
      data.push({filename: filename, buffer: buffer});
      return data;
    }

  }, data);

};

module.exports = {
  pack: async function (pathname) {

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

      // pipe the pack stream to your file
      pack.pipe(tarball);

      // Run everything in parallel...
      async.parallel(data.map((file) => {
        return (callback) => {
          pack.entry({name: file.filename}, file.buffer, callback);
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
        zlib.gzip(buffer, (err, result) => {
          if (err) {
            return reject(err);
          }
          let t = new Date().valueOf() - start;
          resolve(result);
        });
      });

    });

  }
}

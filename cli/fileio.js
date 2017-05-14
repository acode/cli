const fs = require('fs');
const zlib = require('zlib');

const tar = require('tar-stream');
const stream = require('stream');
const path = require('path');

// Figure out what function Directory we're using, and what we're fetching
//  from the template
const functionDir = fs.existsSync('f') ? 'f' : 'functions';
const unusedFunctionDir = functionDir !== 'f' ? 'f' : 'functions';

function writeFile(directory, pathname, buffer, dirs) {

  pathname = path.join.apply(path, [].concat(directory.split('/'), pathname.split('/')));
  let paths = pathname.split(path.sep);

  for (let i = 1; i < paths.length; i++) {
    let dirpath = path.join.apply(path, [process.cwd()].concat(paths.slice(0, i)));
    if (!dirs[dirpath]) {
      !fs.existsSync(dirpath) && fs.mkdirSync(dirpath);
      dirs[dirpath] = true;
    }
  }

  fs.writeFileSync(path.join(process.cwd(), pathname), buffer, {mode: 0o777});
  return dirs;

}

function writeFiles(directory, files) {

  Object.keys(files)
    .reduce((dirs, pathname) => {
      // Makes sure templates work with new directory names
      let writePath = pathname;
      let unused = `${unusedFunctionDir}/`;
      if (pathname.substr(0, unused.length) === unused) {
        writePath = `${functionDir}/${pathname.substr(unused.length)}`;
      }
      return writeFile(directory, writePath, files[pathname], dirs);
    }, {});

}

function readFiles(basepath, pathname, files, condenseDots) {
  basepath = basepath || '.';
  pathname = pathname || '.';
  condenseDots = !!condenseDots;
  return fs.readdirSync(path.join(basepath, pathname)).reduce((files, filename) => {
    let savename = (condenseDots && filename.substr(0, 2) === '..') ?
      filename.substr(1) :
      filename;
    let savepath = path.join(pathname, savename).split(path.sep).join('/');
    let filepath = path.join(pathname, filename);
    let fullpath = path.join(basepath, filepath);
    if (fs.statSync(fullpath).isDirectory()) {
      return readFiles(basepath, filepath, files, condenseDots);
    } else {
      files[savename] = fs.readFileSync(fullpath);
      return files;
    }
  }, files || {});

};

module.exports = {
  readTemplateFiles: (directory) => readFiles(directory, '.', {}, true),
  readFiles: (directory) => readFiles(directory),
  writeFiles: (directory, files) => writeFiles(directory, files),
  extract: (directory, tarball, callback) => {

    zlib.gunzip(tarball, (err, result) => {

      if (err) {
        return callback(new Error(`Error decompressing package`));
      }

      let files = {};
      let extract = tar.extract();
      let tarStream = new stream.PassThrough();

      extract.on('entry', (header, stream, cb) => {
        let buffers = [];
        stream.on('data', (chunk) => buffers.push(chunk));
        stream.on('end', () => {
          files[header.name] = Buffer.concat(buffers);
          cb();
        });
      });

      extract.on('finish', () => {
        try {
          writeFiles(directory, files);
          callback();
        } catch (e) {
          callback(e);
        }
      });

      tarStream.end(result);
      tarStream.pipe(extract);

    });

  }
};

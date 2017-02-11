const fs = require('fs');
const zlib = require('zlib');

const tar = require('tar-stream');
const stream = require('stream');
const path = require('path');

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

  fs.writeFileSync(path.join(process.cwd(), pathname), buffer);
  return dirs;

}

function writeFiles(directory, files, callback) {

  try {
    Object.keys(files)
      .reduce((dirs, pathname) => {
        return writeFile(directory, pathname, files[pathname], dirs);
      }, {});
  } catch (e) {
    return callback(e);
  }

  callback();

}

module.exports = (directory, tarball, callback) => {

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

    extract.on('finish', () => writeFiles(directory, files, callback));

    tarStream.end(result);
    tarStream.pipe(extract);

  });

};

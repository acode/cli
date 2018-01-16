const fs = require('fs');
const path = require('path');
const DEFAULT_FILENAME = '.librc';
const DEFAULT_PATHNAME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'] || '/tmp';
const LEGACY_FILENAME = '.stdlib';
const CONFIG_VAR_WORKSPACE = 'WORKSPACE_PATH';
const CONFIG_VAR_TIMESTAMP = 'CREATED_AT';

class Config {

  constructor (pathname, filename) {
    this.pathname = pathname || DEFAULT_PATHNAME;
    this.filename = filename || DEFAULT_FILENAME;
    this.data = this.load();
  }

  fullpath () {
    return path.join(this.pathname, this.filename);
  }

  location (depth) {
    let loc = process.cwd();
    let pathnames = loc.split(path.sep);
    // If Window directory drive, don't add starting "/"
    let fullpath = pathnames[0].indexOf(':') > -1 ?
      path.join.apply(path, pathnames.slice(0, pathnames.length - depth)) :
      path.join.apply(path, ['/'].concat(pathnames.slice(0, pathnames.length - depth)));
    return this.workspace() &&
      depth <= pathnames.length &&
      fullpath.toLowerCase() === this.workspace().toLowerCase();
  }

  workspace () {
    return this.get(CONFIG_VAR_WORKSPACE);
  }

  legacypath () {
    let cwd = process.cwd();
    let directories = cwd.split(path.sep);
    let pathname;
    for (let i = directories.length; i > 0; i--) {
      let relpath = path.join(directories.slice(0, i).join(path.sep), LEGACY_FILENAME);
      if (fs.existsSync(relpath)) {
        pathname = relpath;
        break;
      }
    }
    return pathname;
  }

  load () {
    if (!fs.existsSync(this.fullpath())) {
      let legacypath = this.legacypath();
      if (legacypath) {
        let legacydirs = legacypath.split(path.sep);
        legacydirs.pop();
        let legacydir = legacydirs.join(path.sep);
        this.initialize(
          legacydir,
          this.read(legacypath)
        )
      } else {
        this.write({});
      }
    }
    return this.read();
  }

  initialize (workpath, data) {
    data = data || {};
    data[CONFIG_VAR_WORKSPACE] = workpath;
    data[CONFIG_VAR_TIMESTAMP] = Math.floor(new Date().valueOf() / 1000);
    this.write(data);
  }

  read (pathname) {
    pathname = pathname || this.fullpath();
    return fs.readFileSync(pathname).toString()
      .split('\n')
      .filter(v => v)
      .map(line => line.split('='))
      .reduce((data, values) => {
        if (values.length > 1) {
          data[values[0]] = values.slice(1).join('=');
        }
        return data;
      }, {})
  }

  write (data) {
    this.data = data = data || this.data;
    fs.writeFileSync(
      this.fullpath(),
      Object.keys(data)
        .map(key => `${key}=${data[key]}`)
        .join('\n') + '\n'
    );
    return data;
  }

  get (key, defaultValue) {
    return key in this.data ? this.data[key] : defaultValue;
  }

  set (key, value, log) {
    let oldValue = this.get(key);
    log && console.log(
      `[${this.fullpath()}] Setting "${key}=${value}"` +
      oldValue !== newValue ? ` (was "${key}=${oldValue}")` : ''
    );
    return this.data[key] = value;
  }

  unset (key) {
    return delete this.data[key];
  }

  save (key, value, log) {
    this.set(key, value, log);
    return this.write()[key];
  }

}

module.exports = new Config();

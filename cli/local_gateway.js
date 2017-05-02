const url = require('url');

const chalk = require('chalk');

const config = require('./config.js');
const Gateway = require('faaslang').Gateway;

class LocalGateway extends Gateway {

  constructor(cfg) {
    cfg = cfg || {};
    cfg.name = 'LocalGateway';
    super(cfg);
  }

  formatName(name) {
    return chalk.grey(`[${chalk.green(this.name)}]`);
  }

  formatRequest(req) {
    return chalk.grey(`(${chalk.yellow(req ? (req._background ? chalk.bold('background:') : '') + req._uuid.split('-')[0] : 'GLOBAL')})`);
  }

  formatMessage(message) {
    return chalk.grey(message);
  }

  service(serviceName) {
    this.serviceName = serviceName;
  }

  listen(port) {
    process.env.STDLIB_LOCAL_PORT = port;
    super.listen(port);
  }

  resolve(req, res, buffer, callback) {
    let urlinfo = url.parse(req.url, true);
    let pathname = urlinfo.pathname;
    if (pathname.indexOf(this.serviceName) !== 1) {
      let e = new Error(`Local Service Not Loaded: ${pathname}`);
      e.statusCode = 404;
      return callback(e);
    } else {
      pathname = pathname.substr(1 + this.serviceName.length);
    }
    let definition;
    try {
      definition = this.findDefinition(this.definitions, pathname);
    } catch (e) {
      e.statusCode = 404;
      return callback(e);
    }
    return callback(null, definition, {}, buffer);
  }

  end(req, value) {
    value = value === undefined ? null : value;
    this.log(req, `Result\n>>> ${value}`);
  }

}

module.exports = LocalGateway;

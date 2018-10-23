const url = require('url');

const chalk = require('chalk');

const config = require('./config.js');
const Gateway = require('faaslang').Gateway;

class LocalGateway extends Gateway {

  constructor(cfg) {
    cfg = cfg || {};
    cfg.name = 'LocalGateway';
    super(cfg);
    this._maxResultLogLength = 128;
  }

  formatName(name) {
    return chalk.grey(`[${chalk.green(this.name)}]`);
  }

  formatRequest(req) {
    return chalk.grey(`(${chalk.yellow(req ? (req._background ? chalk.bold('bg:') : '') + req._uuid.split('-')[0] : 'GLOBAL')}) ${this.routename(req)}`);
  }

  formatMessage(message, logType) {
    let color = {result: 'cyan', error: 'red'}[logType] || 'grey';
    return chalk[color](super.formatMessage(message, logType));
  }

  service(serviceName) {
    this.serviceName = serviceName;
  }

  environment(env) {
    Object.keys(env).forEach(key => process.env[key] = env[key]);
    return true;
  }

  listen(port) {
    port = port || this.port;
    process.env.STDLIB_LOCAL_PORT = port;
    super.listen(port);
  }

  createContext(req, definitions, params, data, buffer) {
    let context = super.createContext(req, definitions, params, data, buffer);
    context.service = {};
    context.service.name = this.serviceName;
    context.service.path = this.serviceName.split('/');
    context.service.version = null;
    context.service.environment = 'local';
    context.service.identifier = `${context.service.path.join('.')}[@${context.service.version || context.service.environment}]`;
    context.service.uuid = '000000';
    context.service.hash = '000000';
    return context;
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
    value = value + '';
    if (value.length > this._maxResultLogLength) {
      value = value.substr(0, this._maxResultLogLength) +
        ` ... (truncated ${value.length - this._maxResultLogLength} bytes)`;
    }
    this.log(req, value, 'result');
  }

}

module.exports = LocalGateway;

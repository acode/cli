const config = require('./config.js');
const Gateway = require('faaslang').Gateway;

class LocalGateway extends Gateway {

  constructor(cfg) {
    cfg = cfg || {};
    cfg.debug = true;
    super(cfg);
  }

}

module.exports = LocalGateway;

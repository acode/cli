const config = require('./config.js');
const http = require('http');

const DEFAULT_PORT = 8170;

class LocalGateway {

  static port() {
    return config.get('PORT', DEFAULT_PORT);
  }

  constructor(cfg) {
    cfg = cfg || {};
    this.debug = !!cfg.debug;
  }

  start() {
    if (!config.workspace()) {
      return callback(new Error('No StdLib workspace defined, run `lib init` in your workspace directory first'));
    }
    return this.listen(this.constructor.port());
  }

  listen(port) {
    let server = http.createServer(this.handler.bind(this));
    server.listen(port);
    this.log(`Listening on port ${port}`);
    return server;
  }

  log(str) {
    this.debug && console.log(`[LocalGateway] ${str}`);
  }

  serviceLog(servicePath, str) {
    this.log(`${servicePath} :: ${str}`);
  }

  handler(req, res) {

    let host = req.headers.host || '';
    let hostnames = host.split(':')[0].split('.');

    let reqUrl = url.parse(req.url, true);
    let search = reqUrl.search;
    let query = reqUrl.query;
    let pathname = reqUrl.pathname;
    let pathList = reqUrl.pathname.split('/').slice(1).filter(v => !!v);
    let servicePath = pathList.join('/');

    let contentType = (req.headers['content-type'] || 'application/octet-stream').split(';')[0];
    let webhook = req.headers['x-webhook'] || null;
    let keys = JSON.parse(req.headers['x-authorization-keys'] || '{}');
    let convert = req.headers['x-type-conversion'] === 'true';

    if (req.method === 'OPTIONS') {
      let headers = {};
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': headers['access-control-request-headers'] || '',
        'Access-Control-Expose-Headers': 'Access-Control-Allow-Origin, Access-Control-Allow-Headers'
      });
      res.end();
    } else if (pathList.length < 2) {
      this.serviceLog(servicePath, 'Not Found');
      res.writeHead(404, {'Content-Type': 'application/json'});
      return res.end(
        JSON.stringify({
          error: {
            message: `Not Found`
          }
        })
      );
    } else if (!pathname.endsWith('/') && req.method === 'GET') {
      this.serviceLog(servicePath, 'Redirect');
      res.writeHead(302, {'Location': [pathname, search].join('/')});
      return res.end();
    }

    let buffers = [];
    req.on('data', chunk => buffers.push(chunk));
    req.on('end', () => {

      this.log(`Request Received (Size ${buffer.length})`);
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end('{"done":true}');

    });

  }

}

module.exports = LocalGateway;

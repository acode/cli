// Uses stdlib reflect service to parse args, kwargs
const https = require('https');
const http = require('http');
const url = require('url');
const f = require('f');
f.config.cache = false;

const chalk = require('chalk');

module.exports = {
  createServer: function createServer(pkg, port, offline) {

    offline = !!offline;

    let defaultFunction = '';
    let serviceName = (pkg.stdlib && pkg.stdlib.name) || pkg.name || '';

    if (pkg.stdlib && pkg.stdlib.defaultFunction) {
      defaultFunction = pkg.stdlib.defaultFunction;
    }

    if (offline) {
      console.warn(
        chalk.bold.yellow('Info:') +
        ' Operating in offline mode, kwargs can only be processed via query parameters'
      );
    }

    let server = http.createServer((req, res) => {

      let urlParts = url.parse(req.url, true);
      let pathname = req.url[0] !== '/' ? `/${req.url}` : req.url;
      pathname = pathname.split('?')[0];
      pathname = pathname === '/' ? pathname + (defaultFunction || '') : pathname;

      console.log(`Request to .${pathname}`);

      let response = (err, params) => {

        if (err) {
          res.writeHead(400, {'Content-Type': 'text/plain'});
          return res.end(`Error: ${err.message}`);
        }

        let fn = f(`.${pathname}`);
        fn.apply(null, params.args.concat(params.kwargs, (err, result) => {

          if (err) {
            res.writeHead(400, {'Content-Type': 'text/plain'});
            res.end(`Error: ${err.message}`);
          } else {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            if (result instanceof Buffer || typeof result !== 'object') {
              res.end(result);
            } else {
              try {
                result = JSON.stringify(result);
              } catch (e) {
                result = '{}';
              }
              res.end(result);
            }
          }

        }));

      };

      if (offline) {
        response(null, {args: [], kwargs: urlParts.query, remoteAddress: '::1'});
      } else {
        this.reflect(req, response);
      }

    });

    server.listen(port);
    console.log(`HTTP development server listening for service ${chalk.bold(serviceName)} on port ${chalk.bold(port)}`);

  },
  check: function check(callback) {

    this.send(null, null, null, null, callback);

  },
  send: function send(search, method, headers, buffer, callback) {

    search = search || '';
    method = method || 'GET';
    headers = headers || {};
    buffer = buffer || new Buffer(0);
    delete headers['accept-encoding']; // no gzip
    delete headers['host']; // no host

    let libreq = https.request({
      hostname: 'f.stdlib.com',
      port: 443,
      path: `/stdlib/reflect${search}`,
      method: method,
      headers: headers
    }, (libres) => {

      let lbuffers = [];

      libres.on('data', chunk => lbuffers.push(chunk));
      libres.on('end', () => {

        let lbuffer = Buffer.concat(lbuffers);
        let json = {};

        try {
          json = JSON.parse(lbuffer.toString());
        } catch (e) {
          return callback(new Error('Unexpected stdlib reflect response: ' + lbuffer.toString()));
        }

        callback(null, json);

      });

    });

    libreq.on('error', (err) => callback(new Error('Could not connect to stdlib reflect')));
    libreq.write(buffer)
    libreq.end();

  },
  reflect: function reflect(req, callback) {

    let buffers = [];
    let search = url.parse(req.url, true).search;

    req.on('data', chunk => buffers.push(chunk));
    req.on('end', () => {

      let buffer = Buffer.concat(buffers);
      this.send(search, req.method, req.headers, buffer, callback);

    });

  }
};

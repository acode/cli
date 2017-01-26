// Uses stdlib reflect service to parse args, kwargs
const https = require('https');
const http = require('http');
const path = require('path');
const url = require('url');
const fs = require('fs');

const chalk = require('chalk');
const lib = require('lib');

// set env
let env = {};
if (fs.existsSync(path.join(process.cwd(), 'env.json'))) {
  let envName = 'dev';
  env = require(path.join(process.cwd(), 'env.json'))[envName] || {};
  env.ENV = envName;
}

module.exports = {
  createServer: function createServer(pkg, port, offline) {

    offline = !!offline;

    let serviceName = (pkg.stdlib && pkg.stdlib.name) || pkg.name || '';

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
      let libname = pathname.split('/').join('.');

      let response = (err, params) => {

        console.log(`[function: ${libname}] ${JSON.stringify({args: params.args, kwargs: params.kwargs})}`);

        if (err) {
          res.writeHead(400, {'Content-Type': 'text/plain'});
          return res.end(`Error: ${err.message}`);
        }

        lib[`${libname}`](...params.args, params.kwargs, (err, result, headers) => {

          if (err) {
            res.writeHead(400, {'Content-Type': 'text/plain'});
            res.end(`Error: ${err.message}`);
          } else {
            res.writeHead(200, headers);
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

        });

      };

      if (offline) {
        response(null, {args: [], kwargs: urlParts.query, remoteAddress: '::1'});
      } else {
        this.reflect(req, response);
      }

    });

    server.listen(port);
    console.log();
    console.log(`HTTP development server listening for service ${chalk.bold.green(serviceName)} on port ${chalk.bold(port)}`);
    console.log();

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

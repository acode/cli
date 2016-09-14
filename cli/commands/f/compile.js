'use strict';

const Command = require('cmnd').Command;
const path = require('path');
const fs = require('fs');
const async = require('async');
const APIResource = require('api-res');
const Credentials = require('../../credentials.js');

class FCompileCommand extends Command {

  constructor() {

    super('f', 'compile');

  }

  help() {

    return {
      description: 'Compiles stdlib Function'
    };

  }

  run(params, callback) {

    let host = 'api.polybit.com';
    let port = 443;

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    let indexPath = path.join(process.cwd(), 'index.js');
    let packagePath = path.join(process.cwd(), 'package.json');
    let packageData;

    if (!fs.existsSync(indexPath)) {
      return callback(new Error('File "index.js" must be present to deploy a function'));
    }

    if (!fs.existsSync(packagePath)) {
      return callback(new Error('File "package.json" must be present to deploy a function'));
    }

    try {
      packageData = require(packagePath);
    } catch(e) {
      return callback(new Error('Could not load "package.json"'));
    }

    if (!packageData.name) {
      return callback(new Error('No "name" field in "package.json"'));
    }

    let resource = new APIResource(host, port);
    resource.authorize(Credentials.read('ACCESS_TOKEN'));

    console.log('Compiling function "' + packageData.name + '" ...');

    return resource.request('v1/function_deployments').create({}, {
      body: fs.readFileSync(indexPath).toString(),
      package_json: fs.readFileSync(packagePath).toString()
    }, (err, response) => {

      if (err) {
        return callback(err);
      }

      let deployment = response.data[0];

      console.log('Success! Function now available.');
      console.log('Command:');
      console.log('  f ' + deployment.package_json.name);
      console.log('HTTPS (POST):');
      console.log('  https://f.stdlib.com/' + deployment.package_json.name);
      return callback(null);

    });

  }

}

module.exports = FCompileCommand;

'use strict';

const Command = require('cmnd').Command;
const path = require('path');
const fs = require('fs');
const async = require('async');
const APIResource = require('api-res');
const Credentials = require('../../credentials.js');

class FUnlinkCommand extends Command {

  constructor() {

    super('f', 'unlink');

  }

  help() {

    return {
      description: 'Unlinks (removes) current or specified <stdlib> Function'
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

    let name = params.args[0];

    if (!name) {

      let packagePath = path.join(process.cwd(), 'package.json');
      let packageData;

      if (!fs.existsSync(packagePath)) {
        return callback(new Error('File "package.json" could not be found.'));
      }

      try {
        packageData = require(packagePath);
      } catch(e) {
        return callback(new Error('Could not load "package.json"'));
      }

      if (!packageData.name) {
        return callback(new Error('No "name" field in "package.json"'));
      }

      name = packageData.name;

    }

    let resource = new APIResource(host, port);
    resource.authorize(Credentials.read('ACCESS_TOKEN'));

    console.log('Unlinking function "' + name + '" ...');

    return resource.request('v1/functions').index({name: name}, (err, response) => {

      if (err) {
        return callback(err);
      }

      if (!response.data[0]) {
        return callback(new Error('Could not find function "' + name + '"'));
      }

      var f = response.data[0];

      resource.request('v1/functions').destroy(f.id, {}, function(err, response) {

        if (err) {
          return callback(err);
        }

        console.log('Successfully removed "' + name + '"!');
        callback();

      });

    });

  }

}

module.exports = FUnlinkCommand;

const path = require('path');
const fs = require('fs');

module.exports = () => {

  let env = {};

  if (fs.existsSync(path.join(process.cwd(), 'env.json'))) {
    let envName = 'dev';
    try {
      env = require(path.join(process.cwd(), 'env.json'))[envName] || {};
    } catch (e) {
      env = {};
      console.warn('Warning: invalid JSON in env.json');
    }
    env.ENV = envName;
  }

  return env;

};

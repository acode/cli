const path = require('path');
const fs = require('fs');

module.exports = () => {

  let env = {};

  if (fs.existsSync(path.join(process.cwd(), 'env.json'))) {
    let envName = 'dev';
    env = require(path.join(process.cwd(), 'env.json'))[envName] || {};
    env.ENV = envName;
  }

  return env;

};

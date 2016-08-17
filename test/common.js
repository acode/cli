const path = require('path');
const pify = require('pify');
const exec = require('child_process').exec;
const rimraf = require('rimraf');
const stdlib =  path.resolve(__dirname, '../cli/bin.js');

module.exports.exec = function (args) {
  return pify(exec)(args);
}

module.exports.stdlib = function (args, path) {
  return pify(exec)(stdlib + ' ' +  args, {cwd: path});
}

module.exports.rimraf = function (file) {
  return pify(rimraf)(file);
}

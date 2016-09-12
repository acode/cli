'use strict';
const stdlib = require('./index');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require("sinon-chai");
chai.use(sinonChai);
const config = require('config');
const nock = require('nock');
let request = require('supertest');

describe('f', () => {
  before(() => {
    request = request(config.get('url'));
    const n = nock(config.get('url'))
      .persist()
      .defaultReplyHeaders({
        'Content-Type': 'text/plain'
      });
    n.post('/mock').reply(200, 'works');
    n.post('/error').reply(500);
    n.post(/.*/).reply(200, 'Function not found, but mocked');
  });

  it('mock works', done => {
    request.post('/mock').expect('works').end(done);
  });

  it('mock works with stdlib', done => {
    stdlib.f('not-exists')(null, (err, ret) => {
      expect(err).to.eql(null);
      expect(ret).to.eql('Function not found, but mocked');
      done();
    });
  });

  it('sets error parameter', done => {
    stdlib.f('error')(null, (err, ret) => {
      expect(err).to.be.an('error');
      expect(ret).to.be.undefined;
      done();
    });
  });

  it('resolves a promise', () => {
    return stdlib.f('mock')(null)
      .then(ret => expect(ret).to.eql('works'));
  });

  it('rejects a promise', done => {
    stdlib.f('error')(null)
      .catch(err => {
        expect(err).to.be.an('error');
        done();
      });
  });

});
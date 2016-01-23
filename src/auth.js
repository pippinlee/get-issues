'use strict';
const config = require('./config');
const inquirer = require('inquirer');
const _ = require('lodash');
const colors = require('colors');

function Auth() {
  this.count = 0;
};

// INFO: module entry point
Auth.prototype.createAuthToken = function(type) {
  this.count++;
  if (type === 'basic') {
    inquirer.prompt(
      config.questions.basicAuth,
      _.bind(this._promptAnswer, this, _, 'basic')
    );
  } else if (type === '2FA') {
    inquirer.prompt(
      config.questions.twoFactorAuth,
      _.bind(this._promptAnswer, this, _, '2FA')
    );
  }
};

Auth.prototype._promptAnswer = function(answers, headerType) {
  _.bind(this._authPrep, this, 'basic', answers)();
  config.github.authorization.create({
    scopes: [
      "repo",
      "public_repo"
    ],
    note: 'get-issues token',
    headers: _.bind(this._genHeaders, this, headerType, answers)()
  }, _.bind(this._createCallback, this));
};

Auth.prototype._createCallback = function(error, response) {
  if (error) {
    let code = error.code;
    let message = JSON.parse(error.message).message;
    if (this.count < 3) {
      switch (code) {
        case 401:
          switch (message) {
            case 'Bad credentials':
              console.log(message.cyan);
              _.bind(this.createAuthToken, this, 'basic')();
              break;
            case 'Must specify two-factor authentication OTP code.':
              console.log(message.cyan);
              _.bind(this.createAuthToken, this, '2FA')();
              break;
            default:
              break;
          } // end switch(message)
          break;
        case 422:
          break;
        default:
          break;
      } // end switch(code)
    } else {
      console.log('Max attempts exceeded, try again.'.cyan);
    }
  } else {

  }
};

Auth.prototype._authPrep = function(type, data) {
  config.github.authenticate({
    type: type,
    username: data.username,
    password: data.password
  });
};

Auth.prototype._genHeaders = function(type, data) {
  switch (type) {
    case '2FA':
      return {
        'User-Agent': 'get-issues',
        'X-GitHub-OTP': data.code
      };
      break;
    default:
      return {
        'User-Agent': 'get-issues'
      };
      break;
  }
};

module.exports = new Auth;
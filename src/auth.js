'use strict';
const config = require('./config');
const inquirer = require('inquirer');
const _ = require('lodash');

let auth = function() {
  let count = 0;
};

// INFO: module entry point
auth.prototype.createAuthToken = function createAuthToken(type, count) {
  if (!count) { count = 1; }
  if (type === 'basic') {
    inquirer.prompt(
      config.questions.basicAuth,
      _.bind(this._promptAnswer, this, _, 'basic')
    );
  } else {
    inquirer.prompt(
      config.questions.twoFactorAuth,
      _.bind(this._promptAnswer, this, _, '2FA')
    );
  }
};

auth.prototype._promptAnswer = function(answers, headerType) {
  this._authPrep('basic', answers);
  config.github.authorization.create({
    scopes: [
      "repo",
      "public_repo"
    ],
    note: 'get-issues token',
    headers: this._genHeaders(headerType, answers)
  }, this._createCallback);
};

auth.prototype._createCallback = function(error, response) {
  if (error) {
    let code = error.code;
    let message = JSON.parse(error.message).message;
    if (this.count < 3) {
      switch (code) {
        case 401:
          switch (message) {
            case 'Bad credentials':
              break;
            case 'Must specify two-factor authentication OTP code.':
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
    }
  }
};

auth.prototype._authPrep = function(type, data) {
  config.github.authenticate({
    type: type,
    username: data.username,
    password: data.password
  });
};

auth.prototype._genHeaders = function(type, data) {
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

module.exports = auth;
'use strict';
const config = require('./config');
const inquirer = require('inquirer');
const _ = require('lodash');
const colors = require('colors');
const async = require('async');

function Auth() {
  this.count = 0;
  this.store = {
    authType: 'basic',
    creds: {
      username: null,
      password: null,
      code: null,
    }
  };
};

// INFO: module entry point
Auth.prototype.createAuthToken = function() {
  this.count++;
  if (this.store.authType === 'basic') {
    inquirer.prompt(
      config.questions.basicAuth,
      _.bind(this._promptAnswer, this, _)
    );
  } else if (this.store.authType === '2FA') {
    inquirer.prompt(
      config.questions.twoFactorAuth,
      _.bind(this._promptAnswer, this, _)
    );
  }
};

Auth.prototype._promptAnswer = function(answers) {
  this.store.creds = (answers) ? answers : this.store.creds;
  _.bind(this._authPrep, this, 'basic', this.store.creds)();
  config.github.authorization.create({
    scopes: [
      "repo",
      "public_repo"
    ],
    note: 'get-issues token',
    headers: _.bind(this._genHeaders, this)()
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
              _.bind(this.createAuthToken, this)();
              break;
            case 'Must specify two-factor authentication OTP code.':
              console.log(message.cyan);
              this.store.authType = '2FA';
              _.bind(this.createAuthToken, this)();
              break;
            default:
              break;
          } // end switch(message)
          break;
        case 422:
          console.log('Token already exists on service.'.cyan);

          // INFO: potential memory leak
          async.series([
            _.bind(this._removeToken, this),
            function(callback) {
              _.bind(this._promptAnswers, this)(); // calling without params
              callback(null);
            }
          ], function(err, results) {
            // INFO: done removing AND adding token
          });
          break;
        default:
          break;
      } // end switch(code)
    } else {
      console.log('Max attempts exceeded, try again.'.cyan);
    }
  } else {
    // INFO: res.token -> save it
  }
};

Auth.prototype._removeToken = function(done) {
  config.github.authorization.getAll({
    headers: _.bind(this._genHeaders, this)()
  }, function(err, authTokens) {
    if (err) {
      console.log('err:', err);
    } else {
      async.filter(
        authTokens,
        function(token, filter_cb) {
          filter_cb(token.app.name === 'get-issues token');
        },
        function(result) {
          config.github.authorization.delete({
            id: result[0].id,
            headers: _.bind(this._genHeaders, this)()
          }, function(err, res) {
            console.log('delete err:', err);
            console.log('delete res:', res);
            done(null);
          });
        }
      );
    }
  });
};

Auth.prototype._authPrep = function(type, data) {
  /**
   * type: (basic | oauth)
   */
  config.github.authenticate({
    type: type,
    username: data.username,
    password: data.password
  });
};

Auth.prototype._genHeaders = function() {
  switch (this.store.authType) {
    case '2FA':
      return {
        'User-Agent': 'get-issues',
        'X-GitHub-OTP': this.store.creds.code
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
'use strict';

const config = require('./config');
const inquirer = require('inquirer');
const async = require('async');

inquirer.prompt(config.questions.twofactor, function(answers) {
  config.github.authenticate({
    type: 'basic',
    username: answers.username,
    password: answers.password
  });

  // config.github.authorization.create({
  //   scopes: [
  //     "repo",
  //     "public_repo",
  //   ],
  //   note: 'get-issues token',
  //   headers: {
  //     'User-Agent': 'get-issues',
  //     'X-GitHub-OTP': answers.code
  //   }
  // }, function auth_cb(err, res) {
  //   if (err) {
  //     console.log('\nerr: ', err);
  //     console.log('\nerr.message: ', JSON.parse(err.message));
  //     console.log('\nerr.code: ', err.code);
  //   } else {
  //     console.log('res: ', res);
  //   }
  // });
  config.github.authorization.getAll({
    headers: {
      'User-Agent': 'get-issues',
      'X-GitHub-OTP': answers.code
    }
  }, function(err, res) {
    if (err) {
      console.log('err:', err);
    } else {
      // console.log('res:', res);
      async.filter(
        res,
        function(item, callback) {
          if (item.app.name === 'get-issues token') {
            callback(true);
          } else {
            callback(false);
          }
        },
        function(result) {
          console.log('results from async:', result);
          config.github.authorization.delete({
            id: result[0].id,
            headers: {
              'User-Agent': 'get-issues',
              'X-GitHub-OTP': answers.code
            }
          }, function(err, res) {
            console.log('delete err:', err);
            console.log('delete res:', res);
          });
        }
      );
      // console.log('app:', item.app.name === 'get-issues token');
    }
  });
});
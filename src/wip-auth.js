'use strict';
// var fs = require('fs');
const config = require('./config');
const inquirer = require('inquirer');
const colors = require('colors');
// var test = config.tokenDir; // config, this

// var other = config.tokenFile(); // assign function

// fs.stat(config.tokenFile(), function(dirErr, dirStats) {
//   if (dirErr) {
//     console.log('>>> we got an error while searching for tokenDir');
//   } else {
//     console.log('>>> we DIDN"T get an error');
//   }
// });

// fs.readFile('./things.json', 'utf8', function(err, data) {
//   console.log(data);
//   var output = JSON.parse(data);
//   console.log(output.token);
// });



function createAuthToken(count, type) {
  console.log('>>> createAuthToken >>> EP');
  console.log('>>> createAuthToken >>> TYPE: ', type);
  if (type === 'basic') {
    inquirer.prompt(config.questions.auth, function(answers) {
      console.log('>>> createAuthToken >>> inquirer CB EP');
      console.log('>>> createAuthToken >>> set auth');
      config.github.authenticate({
        type: 'basic',
        username: answers.username,
        password: answers.password
      });

      console.log('>>> createAuthToken >>> begin create');
      config.github.authorization.create({
        scopes: [
          "repo",
          "public_repo",
        ],
        note: 'get-issues token'
      }, auth_cb);
    });
  } else {
    inquirer.prompt(config.questions.twofactor, function(answers) {
      console.log('>>> createAuthToken >>> inquirer CB EP');
      console.log('>>> createAuthToken >>> set 2FAuth');
      config.github.authenticate({
        type: 'basic',
        username: answers.username,
        password: answers.password
      });

      console.log('>>> createAuthToken >>> begin create');
      config.github.authorization.create({
        scopes: [
          "repo",
          "public_repo",
        ],
        note: 'get-issues token',
        headers: {
          'User-Agent': 'get-issues',
          'X-GitHub-OTP': answers.code
        }
      }, auth_cb);
    });
  }

  function auth_cb(err, res) {
    console.log('>>> createAuthToken >>> create CB EP');
    if (err) {
      console.log('>>> createAuthToken >>> error true');
      console.log('>>> createAuthToken >>> count = ', count);
      console.log('>>> createAuthToken >>> error: \n', err);
      var code = err.code;
      var message = JSON.parse(err.message).message;
      if (count < 3) {
        switch (code) {
          case 401:
            switch (message) {
              case 'Bad credentials':
                console.log(colors.cyan('Bad Credentials'));
                return createAuthToken(++count, 'basic');
                break;
              case 'Must specify two-factor authentication OTP code.':
                console.log('2FA needs apply'.cyan);
                return createAuthToken(++count, '2FA');
                break;
              default:
                console.log('>>> createAuthToken >>> new 401 case: ', err.message);
                break;
            }
            break;
          case 422:
            console.log('>>> createAuthToken >>> service has token already');
            break;
          default:
            console.log('>>> createAuthToken >>> new error code: ', err.code);
            break;
        }
        console.log('>>> createAuthToken >>> small count, fn.call');
        return createAuthToken(++count, 'basic');
      } else {
        return;
      }
    } else {
      console.log('>>> createAuthToken >>> error false');
      return;
    }
  };
};

createAuthToken(1, 'basic');

// console.log('>>> output >>> ', output);
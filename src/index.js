#!/usr/bin/env node

'use strict';

// INFO: Node Modules
var util = require('util');
var url = require('url');
var path = require('path');

// INFO: NPM Modules
var async = require('async');
var Repo = require('git-tools');
var fse = require('fs-extra');
var fs = require('fs');
var figlet = require('figlet');
var slugFactory = require('urlify');
var scpUrl = require('ssh-url');
var inquirer = require('inquirer');
var colors = require('colors');
var _ = require('lodash');

// INFO: src modules
var config = require('./config');
var github = config.github;
var templates = require('./templates');
var Auth = require('./auth');

// INFO: set options for slug config
var slugOptions = {
  addEToUmlauts: true,
  szToSs: true,
  spaces: '-',
  toLower: true,
  nonPrintable: '.',
  trim: true
  // INFO: dev options
  // failureOutput: 'nothing',
  // extendString: true
};

// INFO: instanciate the slug factory
var slug = slugFactory.create(slugOptions);

// INFO: Module workflow
async.waterfall([

  // INFO: check if /issues folder needs to be created
  function init(cb) {
    var dir = './issues';
    fse.ensureDir(dir, function(err) {
      if (err) {
        throw err;
      } else {
        config.checkGitIgnore();
        cb(null);
      }
    });
  },

  // INFO: get remote github url for use with api
  function getGithubRemoteUrl(cb) {
    var repo = new Repo(__dirname);
    repo.remotes(function (error, remotes) {
      if (error) {
        cb(error, null);
      } else {
        config.curRepoInfo.remoteUrl = remotes[0].url;
        cb(null);
      }
    });
  },

  function parseRemoteUrl(cb) {
    var parsedUrl = url.parse(config.curRepoInfo.remoteUrl);

    // INFO: convenience variable
    var remoteUrl = config.curRepoInfo.remoteUrl;

    // INFO: handle scp-like syntax ssh protocol in remote url
    if (parsedUrl.protocol === null) {
      parsedUrl = scpUrl.parse(remoteUrl);
      config.curRepoInfo.username = parsedUrl.pathname.split('/')[1];
      config.curRepoInfo.repo = path.basename(remoteUrl, '.git');
    } else {

      // INFO: handle regular https remote URL
      config.curRepoInfo.username = parsedUrl.pathname.split('/')[1];
      config.curRepoInfo.repo = path.basename(remoteUrl, '.git');
    }

    cb(null);
  },

  function getRepoInfo(cb) {

    // We know 'remoteUrl' is correct because it's pulled
    // directly from the .git folder information

    // if github api returns 404  && "not found"
    // INFO: This is inificient
    var needAuth = false;

    var msg = {
      user: config.curRepoInfo.username,
      repo: config.curRepoInfo.repo
    };
    config.github.repos.get(msg, function(err, data) {
      if (err) {

        // INFO: convenience variables
        var message = JSON.parse(err.message).message;
        var code = err.code;
        if (message === 'Not Found' && code === 404) {

          // INFO: we've encountered a private repo (potencially)
          needAuth = true;
        } else {

          // INFO: we've encountered some actual error
          cb(err, null);
        }
      }
      cb(null, needAuth);
    });
  },

  function requestUserAuth(activate, cb) {
    if (activate) {

      // INFO: we needed to auth
      // INFO: have we auth'd before?
      // INFO: check if we have auth token already
      fs.stat(config.tokenFile(), function(err, stats) {
        if (err) {
          console.log('>>> we got an error while searching for tokenDir');
          // INFO: the token file doesn't exist
          // INFO: BEGINNING
          // INFO: no auth token, init user interaction
          inquirer.prompt(config.questions.auth, function(answers) {

            // INFO: set auth object in GitHubApi object
            config.github.authenticate({
              type: 'basic',
              username: answers.username,
              password: answers.password
            });

            var authError = null;
            var authResponse = null;
            function createAuthToken() {
              config.github.authorization.create({
                scopes: [
                  "repo",
                  "public_repo"
                ],
                note: 'get-issues token'
              }, function(err, res) {
                authError = err;
                authResponse = res;
              });
            }
            // INFO: get token
            config.github.authorization.create({
              scopes: [
                "repo",
                "public_repo"
              ],
              note: 'get-issues token'
            }, function(err, res) {
              if (err) {
                console.log('>> github auth err', err.toJSON());
                console.log('>> github response ', res);
                var message = JSON.parse(err.message).message;
                var code = err.code;
                switch (code) {
                  case 401:
                    switch (message) {
                      case 'Bad credentials':

                        // INFO: user entered invalid credentials
                        break;
                      case 'Must specify two-factor authentication OTP code.':

                        // INFO: get user to enter code
                        // INFO: resend request with new headers
                        break;
                      default:

                        // INFO: token already exists?
                        break;
                    };
                    break;
                  case 403:
                    switch (message) {
                      default:
                        console.log('>> ERROR: 403 error');
                        break;
                    }
                  default:

                    // INFO: catch all other error codes
                    break;
                }
              } else {
                console.log('github auth res', res);
                if (res.token) {
                  // INFO: save token
                } else {

                  // INFO: wtf?
                }
              }
              cb(null);
            });
          });
          // INFO: ENDING
        } else {

          // INFO: found token file
          async.waterfall([
            function readFile(water_cb) {
              fs.readFile(
                config.tokenFile(),
                'utf8',
                function(err, data) {
                  if (err) {
                    water_cb(err);
                  }
                  // { "token": "..." }
                  var token = JSON.parse(data);
                  water_cb(null, token);
                }
              );
            },
            function useToken(token, water_cb) {
              config.github.authenticate({
                type: 'oauth',
                token: token.token
              });
              water_cb(null);
            }
          ],
          function(err, results) {

            // INFO: authentication has *potentially* been successful
            cb(null);
          });
        }
      });
    } else {

      // INFO: we didn't need to auth, move on
      cb(null);
    }
  },

  // INFO: make request to remote repo's issue page
  function getIssues(water_cb) {
    config.github.issues.getForRepo({
      user: config.curRepoInfo.username,
      repo: config.curRepoInfo.repo,
      state: 'open'
    }, function(err, issues) {
      if (err) {
        water_cb(err);
      } else {

        // INFO: res = array of issues AND pr's
        async.filter(
          issues,
          function removePullRequests(item, async_cb) {
            if (item.pull_request) {
              async_cb(false);
            } else {
              async_cb(true);
            }
          },
          function done(filteredIssues) {
            water_cb(null, filteredIssues);
          }
        );
      }
    });
  },

  // INFO: make request to get all comments for each issue
  function getIssueComments(issues, water_cb) {
    async.each(
      issues,
      function getComments(issue, async_cb) {
        config.github.issues.getComments({
          user: config.curRepoInfo.username,
          repo: config.curRepoInfo.repo,
          number: issue.number
        },
        function(err, comments) {
          if (err) {
            async_cb(err);
          } else {
            issue.comments = comments;
            async_cb(null);
          }
        });
      },
      function done(error) {
        if (error) {
          water_cb(error);
        } else {
          water_cb(null, issues);
        }
      }
    );
  },

  // INFO: create initial issue files
  function createIssueFiles(issues, water_cb) {
    async.each(
      issues,
      function createFiles(issue, async_cb){

        // INFO: create title for issue
        var issueFilename = util.format(
          'issues/%s-%s.md',
          String(issue.number),
          slug(issue.title)
        );

        // INFO: create context body for issue file
        var issueContext = templates.issueContent(issue);

        // INFO: prompt user
        console.log('⭐️  #%s: %s', issue.number, colors.cyan(issue.title));

        // INFO: create the issue file
        fse.writeFile(issueFilename, issueContext, function(error) {
          if (error) {
            async_cb(error);
          } else {
            async_cb(null);
          }
        });
      },
      function done(error) {
        if (error) {
          water_cb(error);
        } else {
          water_cb(null, issues);
        }
      }
    );

  },

  // INFO: add comments to each issue file
  function appendComments(issues, water_cb) {
    async.each(
      issues,
      function writeComments(issue, asyncEach_cb) {

        // INFO: create title for issue
        var issueFilename = util.format(
          'issues/%s-%s.md',
          String(issue.number),
          slug(issue.title)
        );

        // INFO: append each comment in order
        async.eachSeries(
          issue.comments,
          function eachComment(comment, asyncEachSeries_cb) {

            // INFO:create context for comments
            var commentContext = templates.commentContent(comment);

            // INFO: append comments to issue file
            fse.appendFile(issueFilename, commentContext, function(error) {
              if (error) {
                asyncEachSeries_cb(error);
              } else {
                asyncEachSeries_cb(null);
              }
            });
          },
          function done(error) {
            if (error) {
              asyncEach_cb(error);
            } else {
              asyncEach_cb(null);
            }
          }
        );
      },
      function done(error) {
        if (error) {
          water_cb(error);
        } else {
          water_cb(null);
        }
      }
    );
  }
],

  // INFO: end of waterfall
  function (err, result) {
    if (err) {
      console.error(err);
      return;
    }

    // INFO: fancy output
    figlet.text(
      'got issues!',
      {
        horizontalLayout: 'default',
        verticalLayout: 'default'
      },
      function (err, data) {
        if (err) {
          console.log('Something went wrong...');
          console.dir(err);
          return;
        }
        console.log(data);
        console.log('\n    check your new issues/ directory'.green);
        console.log('    (issues/ was added to .gitignore)\n');
      }
    );
  }
);
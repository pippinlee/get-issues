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
var figlet = require('figlet');
var slugFactory = require('urlify');
var scpUrl = require('ssh-url');
var inquirer = require('inquirer');
var colors = require('colors');

// INFO: src modules
var config = require('./config');
var github = config.github;
var templates = require('./templates');

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

    // TEST: force the url to w/e I want
    // remoteURL = 'username@github.com:repo-user/repo-name.git';
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

    // TEST: testing private/public repos; set var to test value
    // config.curRepoInfo.repo = 'trax-vagrant';

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

      console.log('>> needAuth', needAuth); // TEST

      cb(null, needAuth);
    });
  },

  function requestUserAuth(activate, cb) {
    if (activate) {

      // INFO: we needed to auth
      // INFO: have we auth'd before?
      // INFO: check if we have auth token already

      // INFO: no auth token, init user interaction
      inquirer.prompt(config.questions.auth, function(answers) {

        // INFO: set auth object in GitHubApi object
        config.github.authenticate({
          type: 'basic',
          username: answers.username,
          password: answers.password
        });

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
    } else {

      // INFO: we didn't need to auth, move on
      cb(null);
    }
  },

  // INFO: make request to remote repo's issue page
  function getIssues(water_cb) {
    console.log('>> getIssues <<'); // TEST
    config.github.issues.getForRepo({
      user: config.curRepoInfo.username,
      repo: config.curRepoInfo.repo,
      state: 'all' // TODO: change to 'open'
    }, function(err, issues) {
      if (err) {
        console.log('>> github issues error ', err.toJSON()); // TEST
        console.log('>> github response (issues) ', issues); // TEST
        water_cb(err);
      } else {

        // INFO: res = array of issues AND pr's
        // console.log('>> github response (issues) ', issues); // TEST
        // console.log('>> PRE ASYNC REJECT >>'); // TEST
        async.filter(
          issues,
          function removePullRequests(item, async_cb) {
            // console.log('>> removePullRequest >> '); // TEST
            if (item.pull_request) {
              // console.log('>> removePullRequest >> drop it'); // TEST
              async_cb(false);
            } else {
              // console.log('>> removePullRequest >> keep it'); // TEST
              async_cb(true);
            }
          },
          function done(filteredIssues) {
            // console.log('>> filtered issues >> ', filteredIssues); // TEST
            water_cb(null, filteredIssues);
          }
        );
      }
    });
  },

  // INFO: make request to get all comments for each issue
  function getIssueComments(issues, water_cb) {
    console.log('>> getIssueComments <<'); // TEST
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
            console.log('>> github comments error ', err.toJSON()); // TEST
            console.log('>> github response (comments) ', comments); // TEST
            async_cb(err);
          } else {
            // console.log('>> github comments >> ', comments); // TEST
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
    console.log('>> createIssueFiles <<'); // TEST
    // console.log('>> received issues >> ', issues); // TEST
    async.each(
      issues,
      function createFiles(issue, async_cb){
        // console.log('>> working issue >> ', issue); // TEST

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
    console.log('>> appendComments <<'); // TEST
    async.each(
      issues,
      function writeComments(issue, asyncEach_cb) {
        console.log('>> write comments >> '); // TEST
        // INFO: create title for issue
        var issueFilename = util.format(
          'issues/%s-%s.md',
          String(issue.number),
          slug(issue.title)
        );

        // INFO: append each comment in order
        console.log('>> for each comment >> START'); // TEST
        async.eachSeries(
          issue.comments,
          function eachComment(comment, asyncEachSeries_cb) {
            console.log('>> single comment >> '); // TEST

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
            console.log('>> for each comment >> DONE'); // TEST
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
          console.log('>> append comments >> DONE'); // TEST
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
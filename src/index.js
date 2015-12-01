#!/usr/bin/env node

'use strict';

// INFO: Node Modules
var util = require('util');
var url = require('url');
var os = require('os');
var path = require('path');

// INFO: NPM Modules
var async = require('async');
var Repo = require('git-tools');
var request = require('request');
var fse = require('fs-extra');
var figlet = require('figlet');
var slugFactory = require('urlify');
var scpUrl = require('ssh-url');
// var options = require('./options');
var inquirer = require('inquirer');
var colors = require('colors');

// INFO: src modules
var config = require('./config');
var github = config.github;

// INFO: attempt at a platform agnostic place to store auth tokens
var configDir = path.resolve(os.homedir(), '.config' , 'get-issues');
var configFile = path.resolve(configDir, 'setup.json');

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

// INFO: set options for github api requests
// NOTE: is this useful?
var callURL = function (url, cb) {
  var options = {
    url: url,
    headers: {
      'User-Agent': 'request'
    }
  };

  function callback(error, response, body) {
    if (!error && response.statusCode === 200) {
      var info = JSON.parse(body);
      cb(null, info);
    }
  }
  request(options, callback);
};


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
        var remoteUrl = remotes[0].url;
        cb(null, remoteUrl);
      }
    });
  },

  function makeApiUri(remoteUrl, cb) {

    // TEST: force the url to w/e I want
    // remoteURL = 'username@github.com:repo-user/repo-name.git';
    var parsedUrl = url.parse(remoteUrl);
    var currentRepoInfo = {};
    var uri = '';

    // TEST: check actual value
    console.log('parsedUrl', parsedUrl.protocol);

    // INFO: handle scp-like syntax ssh protocol in remote url
    if (parsedUrl.protocol === null) {
      parsedUrl = scpUrl.parse(remoteUrl);
      uri = 'repos' + parsedUrl.pathname.split('.')[0] + '/issues';
      config.curRepoInfo.username = parsedUrl.pathname.split('/')[1];
      config.curRepoInfo.repo = path.basename(remoteUrl, '.git');
    } else {

      // INFO: handle regular https remote URL
      var splitURL = parsedUrl.pathname.split('.');
      uri = 'repos' + splitURL[0] + '/issues';
      config.curRepoInfo.username = parsedUrl.pathname.split('/')[1];
      config.curRepoInfo.repo = path.basename(remoteUrl, '.git');
    }

    // TEST: check if uri is correct
    console.log('uri', uri);
    console.log('currentRepoInfo', currentRepoInfo);

    // TODO: remove currentRepoInfo from callback
    cb(null, uri, currentRepoInfo);
  },

  // INFO: make request to remote repo's issue page
  function getIssues(uri, currentRepoInfo, cb) {

    // TODO: rename this var
    var options = config.genReqObj(uri);

    // TEST: check gen function
    console.log('genReqObj', options);


    // TODO: figure out a better way to keep this
    function callback (error, response, body) {
      if (error) { cb(error, null); }
      if (!error && response.statusCode !== 200 ) {

        // TODO: remove currentRepoInfo from callback
        cb(error, 'invalid repo', currentRepoInfo);
      }
      if (!error && response.statusCode === 200) {
        var info = JSON.parse(body);

        // TEST: check result from request
        console.log('info', info);
        var processIssues = function(item, callback) {
          if (!item.pull_request) {
            callback(true);
          } else {
            callback(false);
          }
        };
        async.filter(info, processIssues, function(filteredIssues) {

          // TEST: check filtered results
          console.log('results async filter', filteredIssues);

          // TODO: remove currentRepoInfo from callback
          cb(null, filteredIssues, currentRepoInfo);
        });
      }
    }

    // TODO: RE: todo above, figure out how to call this better
    request(options, callback);
  },

  // INFO: if repo is private, checks for github auth token
  function checkIfPrivateRepo (filterOutPR, currentRepoInfo, cb) {

    if (filterOutPR === 'invalid repo') {
      // INFO: let's check if this token already exits
      fse.readJSON(configFile, function(err, obj) {
          if (err) {
            var tokenCheck = true;
            // INFO: no token found
            cb(null, filterOutPR, tokenCheck, currentRepoInfo);
          } else {
            var tokenCheck = obj.token;
            // INFO: found token that exits already
            cb(null, filterOutPR, tokenCheck, currentRepoInfo);
          }
        });
    } else if (filterOutPR) {
      var tokenCheck = false;
      cb(null, filterOutPR, tokenCheck, currentRepoInfo);
    }
  },

  // INFO: if token is need and doesn't exists create it
  function getTokenIfNeeded(filterOutPR, tokenCheck, currentRepoInfo, cb) {
    var tokenFinal;

    // INFO: if tokenCheck is true, need to get token prompts user
    if (tokenCheck === true){

      // INFO: it's a private repo
      var questions = [
        {
          type: "input",
          name: "token",
          message: "https://github.com/settings/tokens/new?scopes=repo&description=get%20issues%20CLI".red.underline + "\n\n ⎔".magenta + " Click above link to create a Github access token" + "\n\n ⎔".magenta + " Leave \"scope\" options as is, and click \"Generate token\" " + "\n\n ⎔".magenta + " This token will be stored locally and used whenever accessing a private repo" + "\n\n ⎔".magenta + " Paste token here:"
        }
      ];
      // INFO: get user to past github activity token with "repo" privileges
      inquirer.prompt( questions, function( answers ) {
        var tokenFinal = answers.token;
        fse.outputJSON(configFile, {token: tokenFinal}, function(err){
          if (err) throw err
          cb(null, tokenFinal, filterOutPR, currentRepoInfo);
        });
      });
    } else if (!tokenCheck) {
      // INFO: not private repo, no auth needed
      tokenFinal = 'public';
      cb(null, tokenFinal, filterOutPR, currentRepoInfo);
    } else {
      // INFO: token already exists, just read it
      tokenFinal = tokenCheck;
      cb(null, tokenFinal, filterOutPR, currentRepoInfo);
    }

  },

  function githubAuthIfNeed(tokenFinal, filterOutPR, currentRepoInfo, cb) {

    // INFO: skip github auth if public repo
    if (tokenFinal === 'public') {
      cb(null, filterOutPR);
    } else if (tokenFinal) {

      github.authenticate({
          type: "oauth",
          token: tokenFinal
      });
      github.issues.repoIssues({
          user: currentRepoInfo.username,
          repo: currentRepoInfo.repo,
          state: 'open',
          per_page: 100
      }, function(err, res) {
          if (err) {
            // INFO: bad credentials
            fse.remove(configFile, function(err){if (err) throw err});
          } else {
            // INFO: good credentials
            var filterOutPR = [];

            res.forEach(function (issue) {
              if (!issue.pull_request) {
                filterOutPR.push(issue);
              }
            });
            cb(null, filterOutPR);
          }
      });
    }
  },

  // INFO: create a file for each issue in /issues
  function createIssueFiles (filterOutPR, cb) {

    var commentsURL = [];
    filterOutPR.forEach(function (issue) {

      // INFO: slugify title to get rid of characters that can cause filename problems
      var issueFilename = util.format('issues/%s-%s.md', String(issue.number), slug(issue.title));

      // TODO: fix this, it's bad
      // INFO: template strings use indents, to avoid indents we must forgo code readability
      var finalIssue = `${issue.title}
Issue filed by: ${issue.user.login}
${Date(issue.created_at)}

${issue.body}
-------------------------------------------------------------------------------
`;

      console.log('⭐️  #%s: %s', issue.number, issue.title.cyan);

      fse.writeFile(issueFilename, finalIssue, function (error) {
        if (error) {
          cb(error, null);
        }
      });

      // INFO: make sure only get issues that have comments
      // INFO: else request to comments_url will be empty
      if (issue.comments > 0) {
        commentsURL.push(issue.comments_url);
      }
    });
    cb(null, commentsURL);
  },

  // INFO: create a new array of responses from each comment url
  // INFO: if a issue has a comment value > 0 it will get requested
  function getIssueComments (commentsURL, cb) {

    // INFO: take array of comment urls and get content
    // INFO: callURL at the top of this file does all the
    // INFO: request work for each URL
    async.map(commentsURL, callURL, function (error, results) {
      if (error) {
        cb(error, null);
      }
      cb(null, results);
    });
  },

  // INFO: create obj to match issue comments and existing file
  function setupIssueComments (results, cb) {

    // INFO: list of files in /issues
    var paths = {};
    fse.readdir('issues/', function (error, files) {
      if (error) {
        throw error
      }

      // INFO: for each url with comments this create a property
      // INFO: on the paths object so that we're able to easy
      // INFO: find which file comments should go
      files.forEach(function (file) {
        paths[ file.split('-')[0] ] = 'issues/' + file;
      });

      cb(null, paths, results);
    });
  },

  // INFO: where we actually write the comments to their correct
  // INFO: issue file in /issues directory
  function writeIssueComments (paths, results, cb) {
    results.forEach(function (comment) {
      comment.forEach(function (individualComment) {
        var writeToFile = paths[ individualComment.issue_url.split('/')[7] ];
        var commentFinal = `${individualComment.user.login}
${Date(individualComment.created_at)}

${individualComment.body}

-------------------------------------------------------------------------------
`;

        // INFO: append all comments to file
        fse.appendFile(writeToFile, commentFinal, function (error) {
          if (error) {
            cb(error, null);
          }
        });
      });
    });
    cb(null, 'done writing comments'.red);
  }

],
  function (err, result) {
    if (err) {
      console.error(err);
      return;
    }
    // INFO: fancy output
    figlet.text('got issues!', {
      horizontalLayout: 'default',
      verticalLayout: 'default'
    }, function (err, data) {
      if (err) {
        console.log('Something went wrong...');
        console.dir(err);
        return;
      }
      console.log(data);
      console.log('\n    check your new issues/ directory'.green);
      console.log('    (issues/ was added to .gitignore)\n');
    });
  }
);
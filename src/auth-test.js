'use strict';

const Auth = require('./auth');

let auth = new Auth(new Function);

auth.createAuthToken();
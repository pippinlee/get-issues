### Auth Flow

- check if priv / pub
  - if priv
    - check if token
      - if token
        - use token
      - not token
        - do prompt get u/p
          - if 2FA re-prompt with security code
        - write token to disk
  - if pub
    - use uri path (no auth)

### New Branch for TODO

- remove use of fse module
- put waterfall functions in seperate file, require them
```javascript
let funcs = require('./utils');
async.waterfall([
  funcs.init,
  funcs.getGithubRemoteUrl,
  ...,
  funcs.saveIssuesToFile
]);
```
- ES6 everything
- make user of `commander` module
- update README
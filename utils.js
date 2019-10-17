const axios = require('axios')
const fs = require('fs')

let warnedGutHubApi = false

function isObject(val) {
  if (val === null) { return false; }
  return ((typeof val === 'function') || (typeof val === 'object'));
}

function ensureString(o) {
  if (typeof o === 'undefined' || o === null) {
    return '';
  } else if (Buffer.isBuffer(o)) {
    return o.toString();
  } else if (typeof o === "object") {
    return JSON.stringify(o);
  } else if (typeof o === "string") {
    return o;
  }
  return ""+o;
}

function ensureBool(b, def=false){
  const valuesFalse = ['false', '0', 'no']
  const valuesTrue = ['true', '1', 'yes']
  const stringBool = ensureString(b).toLowerCase()
  if(def){
    return valuesFalse.indexOf(stringBool) == -1
  } else {
    return valuesTrue.indexOf(stringBool) !== -1
  }
}

async function writeFile(file, data, option){
  return new Promise( (resolve, reject) => {
    fs.writeFile(file, data, option, function(err){
      if(err){
        reject()
      } else {
        resolve()
      }
    })
  })
}

async function getLatestGitHubCommit(owner, repo, login, pwd){
  let req = {
    method: 'get',
    url: `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`
  }
  if(login && pwd){
    req.auth = {
      username: login,
      password: pwd
    }
  }
  let res
  try {
    res = await axios(req)
  } catch(e){
    throw e
  }
  if(res.hasOwnProperty('data')){
    res = res.data
    try{
      res = JSON.parse(res)
    } catch(e){}
  }
  if(!Array.isArray(res) || res.length < 1 || !res[0].hasOwnProperty('sha')) {
      return ''
  } else if(!warnedGutHubApi && isObject(res) && res.hasOwnProperty('message')){
    warnedGutHubApi = true
    console.log(res.message)
  }
  return res[0].sha.substr(0,7)
}

module.exports = {
  isObject: isObject,
  ensureString: ensureString,
  ensureBool: ensureBool,
  writeFile: writeFile,
  getLatestGitHubCommit: getLatestGitHubCommit
}

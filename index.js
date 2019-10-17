const argv = require('yargs').argv
const axios = require('axios')
const fs = require('fs')
const latestVersion = require('latest-version')
const parseGithubRepoUrl = require('parse-github-repo-url')
const pwd_prompt = require('password-prompt')
const semver = require('semver')
const Spinner = require('cli-spinner').Spinner
const yesno = require('yesno');
let warnedGutHubApi = false

const login = argv.login || argv.l
let pwd = argv.pwd || argv.p
let update = argv.update || argv.u || false
update = ensureBool(update)

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

async function getLatestGitHubCommit(owner, repo){
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

async function start(file){
  let _package = {}
  let nodes = {}
  try {
    _package = require(file)
  } catch(e){}

  if(_package && _package['ttb-nodes']){
    nodes = _package['ttb-nodes']
  } else {
    console.log(`Error getting the package from "${file}".`)
    return
  }

  if(pwd === true){
    pwd = await pwd_prompt('password: ', { method: 'hide'})
  }

  const spinner = new Spinner('%s');
  const keys = Object.keys(nodes)
  const toUpdates = {}
  const toUpdatesError = {}
  let canUpdate = true
  console.log("Fetching update ...")
  spinner.setSpinnerString('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏');
  spinner.start();
  for (var i in keys){
    let version = nodes[keys[i]]
    let fromNpm = (semver.valid(semver.coerce(version))===null || version.indexOf('TheThingBox/') === 0)?false:true
    let lastVersion = ''
    let toSet = ''
    if(fromNpm){
      try{
        lastVersion = await latestVersion(keys[i])
        toSet = lastVersion
      } catch(e){}
    } else {
      let parsedGithubUrl = parseGithubRepoUrl(version)
      if(parsedGithubUrl[0] && parsedGithubUrl[1]){
        try{
          lastVersion = await getLatestGitHubCommit(parsedGithubUrl[0], parsedGithubUrl[1])
          version = parsedGithubUrl[2] || null
          if(lastVersion){
            toSet = `${parsedGithubUrl[0]}/${parsedGithubUrl[1]}#${lastVersion}`
          }
        } catch(e){}
      }
    }

    if(lastVersion){
      if(lastVersion !== version){
        toUpdates[keys[i]] = {
          version: version,
          lastVersion: lastVersion,
          toSet: toSet
        }
      }
    } else {
      toUpdatesError[keys[i]] = {
        version: nodes[keys[i]]
      }
    }
  }
  spinner.stop(true)
  console.log("Done.")

  if(Object.keys(toUpdates).length > 0){
    console.log('Updates :')
    console.table(toUpdates, ['version', 'lastVersion'])
  } else {
    console.log('0 update available.')
    canUpdate = false
  }

  if(Object.keys(toUpdatesError).length > 0){
    console.log('Cannot fetch version for packages :')
    console.table(toUpdatesError)
    canUpdate = false
  }

  if(canUpdate){
    if(!update){
      update = await yesno({
          question: `Do you want to update the file "${file}" ? (y/n):`
      })
      update = ensureBool(update)
    }
    if(update){
      const updateKeys = Object.keys(toUpdates)
      for(var i in updateKeys){
        let toSet = toUpdates[updateKeys[i]].toSet
        if(toSet){
          nodes[updateKeys[i]] = toSet
        }
      }
      _package['ttb-nodes'] = nodes
      try{
        await writeFile(file, JSON.stringify(_package, null, 4), 'utf8')
        console.log(`The file ${file} was updated`)
      } catch(e){
        console.error(e)
      }
    }
  } else if(update){
  console.error(`The file ${file} CANNOT be updated`)
  }
}

start('./package.json')

const utils = require('./utils')
const argv = require('yargs').argv

const fromPath = utils.ensureString(argv.from || './package.json')
const fromAttr = utils.ensureString(argv['from-attribute'] || 'ttb-nodes')
const toPath = utils.ensureString(argv.file || argv.f || '/root/thethingbox/package.json')
const toAttr = utils.ensureString(argv.attribut || argv.a || 'devDependencies')

if(!fromPath){
  throw new Error('Missing or wrong params "--from"')
}
if(!fromAttr){
  throw new Error('Missing or wrong params "--from-attribute"')
}
if(!toPath){
  throw new Error('Missing or wrong params "--file"')
}
if(!toAttr){
  throw new Error('Missing or wrong params "--attribut"')
}

async function start(){
  let _from_package = null
  let _to_package = null
  let nodes = {}
  try {
    _from_package = require(fromPath)
  } catch(e){}

  if(_from_package && _from_package[fromAttr] && utils.isObject(_from_package[fromAttr])){
    nodes = _from_package[fromAttr]
  } else {
    console.log(`Error getting the package from "${fromPath}".`)
    return
  }

  try {
    _to_package = require(toPath)
  } catch(e){}

  if(!_to_package || !utils.isObject(_to_package)){
    console.log(`Error getting the package from "${toPath}".`)
    return
  }
  _to_package[toAttr] = nodes
  try{
    await utils.writeFile(toPath, JSON.stringify(_to_package, null, 4), 'utf8')
    console.log(`${Object.keys(nodes).length} packages added to ${toPath} as ${toAttr}`)
  } catch(e){
    console.error(e)
  }
}

start()

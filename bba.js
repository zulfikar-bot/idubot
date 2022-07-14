const {download, request} = require('tools')
const {randomInt} = require('crypto')

const token = process.env.GITHUB_TOKEN
const repo = 'aidulcandra/materi-bahasa-asing'

const materialList = {}
const fileCache = {}

async function getMaterialList(code) {
  if (!materialList[code]) {
    materialList[code] = JSON.parse((await getFile(`${code}/list.json`)).response)  
  } return materialList[code]
}

async function getFile(path) {
  if (fileCache[path]) {return fileCache[path]}
  fileCache[path] = (await request('GET', `https://github.com/${repo}/raw/main/${path}`)).response
  return 
}

module.exports = {
  getRandomMaterial: async(code)=>{
    const list = await getMaterialList(code)
    return (await getFile(`${code}/files/${list[randomInt(list.length)].link}`))
  }
}
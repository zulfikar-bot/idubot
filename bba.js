const {download, request} = require('./tools')
const {randomInt} = require('crypto')

const token = process.env.GITHUB_TOKEN
const repo = 'aidulcandra/materi-bahasa-asing'

const materialList = {}
const fileCache = {}

async function getMaterialList(code) {
  if (!materialList[code]) {
    materialList[code] = JSON.parse((await getFile(`${code}/list.json`)))  
  } return materialList[code]
}

async function getFile(path) {
  if (!fileCache[path]) {fileCache[path] = (await request('GET', `https://github.com/${repo}/raw/main/${path}`)).response}
  return fileCache[path]
}

module.exports = {
  getRandomMaterial: async(code)=>{
    const list = await getMaterialList(code)
    return (await getFile(`${code}/files/${list[randomInt(list.length)].link}`))
  },
  getMaterial: async(code, id) => {
    const list = await getMaterialList(code)
    if (!list[id]) {return 404}
    return (await getFile(`${code}/files/${list[id].link}`))
  },
  getList: async(code) => {
    return await getMaterialList(code)
  },
  searchMaterial: async(code,query) => {
    return (await getMaterialList(code)).map((m,i)=>{
      return Object.assign(m,{i})
    }).filter(m=>{
      for (let q of query) {
        if (m.title.toLowerCase().includes(q)) {return true}
        if (m.tags.includes(q)) {return true}
      } return false
    })
  },
  saveMaterial: async(code,title,tags,content) => {
    const list = await getMaterialList(code)
    let filename
    do {filename = title.toLowerCase().replaceAll(/[^A-Z0-9 ]/gi,'').replaceAll(' ','-') + '.txt'}
    while  
    
    
  }
}
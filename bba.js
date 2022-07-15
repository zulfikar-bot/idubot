const {download, request} = require('./tools')
const {randomInt} = require('crypto')
const fs = require('fs')

const agent = process.env.USER_AGENT
const token = process.env.GITHUB_TOKEN
const repo = 'aidulcandra/materi-bahasa-asing'

const defaultHeader = {
  'User-Agent': agent,
  'Authorization': 'token '+token
}

const lessonList = {
  en:'English', 
  ja:'Nihon-go', 
  de:'Deutsch', 
  es:'Español'
}

const subbers = {}
for (let c of Object.keys(lessonList)) {
  const filename = './.data/bba/subbers/'+c+'.json'
  if (fs.existsSync(filename)) {subbers[c]=require(filename)}
  else {subbers[c]=[]}
}

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

function makeFilename(input,format) {
  return input.toLowerCase().replaceAll(/[^A-Z0-9 ]/gi,'').replaceAll(' ','-') + format
}

async function uploadFile(path, content) {
  await request('PUT', `https://api.github.com/repos/${repo}/contents/${path}`, {headers:defaultHeader},
    JSON.stringify({
      message:`Upload file: ${path}`,
      content:Buffer.from(content).toString('base64')
  }))
}

async function updateFile(path, content) {
  
}

function saveFile(path, file, content) {
  fs.mkdirSync(path, {recursive:true})
  fs.writeFileSync(path+'/'+file, content)
}

module.exports = {
  getLessonCodes: () => lessonList,
  removeSubscription: async (room) => {
    for (let c of Object.keys(subbers)) {
      const pos = subbers[c].indexOf(room)
      if (pos !== -1) {
        subbers[c].splice(pos,1)
        saveFile('./.data/bba/subbers', c+'.json', JSON.stringify(subbers[c]))
        return
      }
    }
  },
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
    let filename = makeFilename(title,'.txt')
    while (list.find(i=>i.link===filename)) {
      filename = makeFilename(title+randomInt(999),'.txt')
    } 
    const id = list.push({title,tags,link:filename})
    await uploadFile(`${code}/files/${filename}`)
    await updateFile(`${code}/list.json`, JSON.stringify(list))
    return id
  }
}
const {download, request, request1} = require('./tools')
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
let browser, translatorPage, translatorBusy
const lastTranslate = {from:'', to:''}
const translateCodes = [
  { name: 'Afrikaans', code: 'af' },
  { name: 'Albanian', code: 'sq' },
  { name: 'Arabic', code: 'ar' },
  { name: 'Azerbaijani', code: 'az' },
  { name: 'Basque', code: 'eu' },
  { name: 'Bengali', code: 'bn' },
  { name: 'Belarusian', code: 'be' },
  { name: 'Bulgarian', code: 'bg' },
  { name: 'Catalan', code: 'ca' },
  { name: 'Chinese Simplified', code: 'zh-CN' },
  { name: 'Chinese Traditional', code: 'zh-TW' },
  { name: 'Croatian', code: 'hr' },
  { name: 'Czech', code: 'cs' },
  { name: 'Danish', code: 'da' },
  { name: 'Dutch', code: 'nl' },
  { name: 'English', code: 'en' },
  { name: 'Esperanto', code: 'eo' },
  { name: 'Estonian', code: 'et' },
  { name: 'Filipino', code: 'tl' },
  { name: 'Finnish', code: 'fi' },
  { name: 'French', code: 'fr' },
  { name: 'Galician', code: 'gl' },
  { name: 'Georgian', code: 'ka' },
  { name: 'German', code: 'de' },
  { name: 'Greek', code: 'el' },
  { name: 'Gujarati', code: 'gu' },
  { name: 'Haitian Creole', code: 'ht' },
  { name: 'Hebrew', code: 'iw' },
  { name: 'Hindi', code: 'hi' },
  { name: 'Hungarian', code: 'hu' },
  { name: 'Icelandic', code: 'is' },
  { name: 'Indonesian', code: 'id' },
  { name: 'Irish', code: 'ga' },
  { name: 'Italian', code: 'it' },
  { name: 'Japanese', code: 'ja' },
  { name: 'Javanese', code: 'jw' },
  { name: 'Kannada', code: 'kn' },
  { name: 'Korean', code: 'ko' },
  { name: 'Latin', code: 'la' },
  { name: 'Latvian', code: 'lv' },
  { name: 'Lithuanian', code: 'lt' },
  { name: 'Macedonian', code: 'mk' },
  { name: 'Malay', code: 'ms' },
  { name: 'Maltese', code: 'mt' },
  { name: 'Norwegian', code: 'no' },
  { name: 'Persian', code: 'fa' },
  { name: 'Polish', code: 'pl' },
  { name: 'Portuguese', code: 'pt' },
  { name: 'Romanian', code: 'ro' },
  { name: 'Russian', code: 'ru' },
  { name: 'Serbian', code: 'sr' },
  { name: 'Slovak', code: 'sk' },
  { name: 'Slovenian', code: 'sl' },
  { name: 'Spanish', code: 'es' },
  { name: 'Sundanese', code: 'su' },
  { name: 'Swahili', code: 'sw' },
  { name: 'Swedish', code: 'sv' },
  { name: 'Tamil', code: 'ta' },
  { name: 'Telugu', code: 'te' },
  { name: 'Thai', code: 'th' },
  { name: 'Turkish', code: 'tr' },
  { name: 'Ukrainian', code: 'uk' },
  { name: 'Urdu', code: 'ur' },
  { name: 'Vietnamese', code: 'vi' },
  { name: 'Welsh', code: 'cy' },
  { name: 'Yiddish', code: 'yi' }
]

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
  const fullPath = `https://api.github.com/repos/${repo}/contents/${path}`
  const info = JSON.parse((await request('GET', fullPath, {headers:defaultHeader})).response)
  await request('PUT', fullPath, {headers: defaultHeader},
    JSON.stringify({
      message:`Update file (${path})`,
      content:Buffer.from(content).toString('base64'),
      sha:info.sha
    })
  )
}

function saveFile(path, file, content) {
  fs.mkdirSync(path, {recursive:true})
  fs.writeFileSync(path+'/'+file, content)
}

module.exports = {
  getLessonList: () => lessonList,
  getSubbers: () => subbers,
  addSubscription: async (code,room) => {
    if (!subbers[code].includes(room)) {
      subbers[code].push(room)
      saveFile('./.data/bba/subbers', code+'.json', JSON.stringify(subbers[code]))
    }
  },
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
  },
  translate: async (from,to,text) => {
    const result = await request1('POST','http://idul-pup-services.herokapp.com/translate', null, JSON.stringify({from,to,text}))
    console.log(result)
    return JSON.parse(result.response)
  },
  getTranslateCodes: () => {
    return translateCodes
  },
  translateSupported: (code) => {
    return (translateCodes.find(l=>l.code===code)!==undefined)
  },
  getLanguageName: (code) => {
    return translateCodes.find(l=>l.code===code).name
  },
}
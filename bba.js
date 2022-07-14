const {download, request} = require('tools')

const token = process.env.GITHUB_TOKEN
const repo = 'aidulcandra/materi-bahasa-asing'

const materialList = {}

async function getMaterialList(code) {
  if (!materialList[code]) {
    
  }
  return await getFile(`${code}/list.json`)
}

async function getFile(path) {
  return (await request('GET', `https://github.com/${repo}/raw/main/${path}`)).response
}

module.exports = {
  getRandomMaterial: async(code)=>{
    const list = await getMaterialList(code)
  }
}
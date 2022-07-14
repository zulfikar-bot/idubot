const {download, request} = require('tools')

const token = process.env.GITHUB_TOKEN
const repo = 'aidulcandra/materi-bahasa-asing'



async function getMaterialList(code) {
  return await getFile(`${code}/list.json`)
}

async function getFile(path) {
  return await request('GET', `https://github.com/${repo}/raw/main/${path}`)
}

module.exports = {
  getRandomMaterial: async(code)=>{
    const list = await getMaterialList(code)
  }
}
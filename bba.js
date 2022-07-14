const {download} = require('tools')

const token = process.env.GITHUB_TOKEN
const repo = 'aidulcandra/materi-bahasa-asing'

async function getMaterialList(code) {
  return await download()  
}

module.exports = {
  getRandomMaterial: async(code)=>{
    const list = await getMaterialList(code)
  }
}
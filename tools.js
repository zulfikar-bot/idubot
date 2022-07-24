const FormData = require('form-data')
const {http,https} = require('follow-redirects')
const fs = require('fs')

module.exports = {
  download: (url,saveTo) => {
    return new Promise((resolve,reject)=>{
        console.log('Downloading',url)
        https.get(url, res=>{
            const writeStream = fs.createWriteStream(saveTo)
            res.pipe(writeStream).on('finish', ()=>{
                console.log('Success');
                writeStream.close();
                resolve();
            }).on('error', e=>reject(e))
        }).on('error', e=>reject(e))
    })
  },
  request : (method, url, options, data, parse) => {
    return new Promise((resolve, reject) => {
      const req = https.request(url, Object.assign({method},options), res => {
        const data = []
        res.on('data', chunk => {
          data.push(chunk)
        }).on('end', () => {
          console.log(`${method} at ${url}:`, res.statusCode)
          const fullData = Buffer.concat(data).toString()
          resolve({status:res.statusCode, response:(parse?JSON.parse(fullData):fullData)})
        }).on('error', (e)=>{
          reject(e)
        })
      })
      if (['POST', 'PUT'].includes(method)) {
        req.write(data)
      } req.end()
    })
  },
  submitForm: (options, contents, parse)=>{
    return new Promise((resolve,reject) => {
      const form = new FormData()
      for (let c of Object.keys(contents)) {
        form.append(c, contents[c])
      }
      form.submit(options, (e,r)=>{
        let data = ''
        r.on('data', (chunk)=>{
          data += chunk
        }).on('end', ()=>{
          console.log('Submit form:', r.statusCode)
          resolve({status:r.statusCode, response:(parse?JSON.parse(data):data)})
        }).on('error', e=>{
          reject(e)
        })
      })
    })
  }
}
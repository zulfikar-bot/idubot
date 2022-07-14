const https = require('follow-redirects')
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
  }
}
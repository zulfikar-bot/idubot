const http = require('http')
const port = process.env.PORT

const baileys = require('@adiwajshing/baileys')
const {useMultiFileAuthState} = baileys

http.createServer((_,res) => {
  res.end('Server is running')
}).listen(port)
console.log('Server runs at port',port)

async function start() {
  const {state, saveCreds} = await useMultiFileAuthState('./.data/wa_creds/')
  const sock = baileys.default({auth:state})
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', update => {
    if (update.qr) console.log(`RECEIVED QR\n${update.qr}`)
  })
}

start()
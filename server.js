const http = require('http')
const fs = require('fs')
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
    if (update.connection === 'close') {
      if (update.lastDisconnect.error.output.statusCode === 401) {
        console.log('UNATHORIZED')
      } else {
        start()
      }
    }
  })
  sock.ev.on('messages.upsert', update => {
    if (update.type !== 'notify') return
    for (let message of update.messages) {
      console.log(message)
      if (message.key.remoteJid === 'status@broadcast') continue
      if (message.key.fromMe) continue
      let msgDebug
      if (message.message.imageMessage) msgDebug = '[IMAGE] '+message.message.imageMessage.caption
      else if (message.message.audioMessage) msgDebug = '[AUDIO]'
      else msgDebug = (message.message.extendedTextMessage?.text || message.message.conversation)
      console.log(`Message from ${message.pushName}: ${msgDebug}`)
    }
  })
}

start()
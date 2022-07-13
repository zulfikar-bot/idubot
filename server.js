const http = require('http')
const fs = require('fs')
const port = process.env?.PORT || 3000

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
  sock.ev.on('messages.upsert', async update => {
    if (update.type !== 'notify') return
    await sock.readMessages(update.messages.filter(m=>m.key.remoteJid!=='status@broadcast').map(m=>m.key))
    for (let message of update.messages) {
      //console.log(message)
      if (message.key.fromMe) continue
      const room = message.key.remoteJid
      if (room === 'status@broadcast') continue
      const sender = message.key.participant
      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                    message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text
      let msgDebug
      if (message.message?.imageMessage) msgDebug = '[IMAGE] '+message.message?.imageMessage.caption
      else if (message.message?.audioMessage) msgDebug = '[AUDIO]'
      else msgDebug = (message.message?.extendedTextMessage?.text || message.message?.conversation)
      console.log(`Message from ${message.pushName}: ${msgDebug}`)
      
      if (!msgDebug) {return}
      const response = await process (room, sender, msgDebug, quoted)
      if (!response) {return}
      
      for (let r of response) {
        if (typeof r === 'string') {await sock.sendMessage(room, {text:r})}
      }
    }
  })
}

start()

// BOT CONTROL
async function process (room, sender, msg, quoted) {
  const prefix = '!'
  
  if (!msg.startsWith(prefix)) {return}
  if (msg.length <= 1) {return}
  const inputs = msg.split(' ')
  const command = inputs[0].slice(1).toLowerCase()
  if (!command) {return [`⚠ Mohon perhatikan penulisan perintah bot yang benar.\nContoh: ${prefix}menu`]}
  const params = inputs.slice(1)
  
  
  
}

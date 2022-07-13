const http = require('http')
const fs = require('fs')
const {randomInt} = require('crypto')

const baileys = require('@adiwajshing/baileys')
const {useMultiFileAuthState} = baileys

const port = process.env.PORT || 3000
const owner = process.env.OWNER

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
      const response = await processCommand(room, sender, msgDebug, quoted)
      if (!response) {return}
      
      for (let r of response) {
        if (typeof r === 'string') {await sock.sendMessage(room, {text:r})}
      }
    }
  })
}

start()

// BOT CONTROL
const prefix = '!'

const cmdList = [
  {name:'ping', info:'Tes respon bot', run:()=>[choose('Pong','Halo','Hadir','Aktif')]},
  {name:'menu', info:'Tampilkan menu ini', run:()=>{return [
    '*MENU IDUBOT*\n============\n\n'+
    cmdList.map(c=>c.section ? `\n[${c.section}]` : prefix+c.name+' - '+c.info).join('\n')+
    `\n\nKontak owner: +${owner}`
  ]}},
  
  {section:'Belajar Bahasa Asing'},
  {name:'sub', info:'Berlangganan pelajaran bahasa Asing (untuk grup)', run:(p)=>{
    
  }}
]

async function processCommand (room, sender, msg, quoted) {
  if (!msg.startsWith(prefix)) {return}
  if (msg.length <= 1) {return}
  const inputs = msg.split(' ')
  const command = inputs[0].slice(1).toLowerCase()
  if (!command) {return [`⚠ Mohon perhatikan penulisan perintah bot yang benar.\nContoh: ${prefix}menu`]}
  if (!cmdList.find(c=>c.name===command)) {return [`⚠ Perintah *${command}* tidak ada. Ketik ${prefix}menu untuk melihat daftar perintah yang ada.`]}
  const params = inputs.slice(1)
  
  return cmdList.find(c=>c.name===command).run(params)
 
}

function choose() {
  return arguments[randomInt(arguments.length)]
}

a
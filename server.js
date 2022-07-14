const http = require('http')
const fs = require('fs')
const {randomInt} = require('crypto')

const baileys = require('@adiwajshing/baileys')
const {useMultiFileAuthState, isJidGroup} = baileys

const port = process.env.PORT || 3000
const owner = process.env.OWNER
const numberEnding = '@s.whatsapp.net'

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
      const isAdmin = isJidGroup(room) && (await sock.groupMetadata(room)).participants.find(p=>p.id===sender).admin
      let msgDebug
      if (message.message?.imageMessage) msgDebug = '[IMAGE] '+message.message?.imageMessage.caption
      else if (message.message?.audioMessage) msgDebug = '[AUDIO]'
      else msgDebug = (message.message?.extendedTextMessage?.text || message.message?.conversation)
      console.log(`Message from ${message.pushName}: ${msgDebug}`)
      
      if (!msgDebug) {return}
      const response = await processCommand(room, sender, msgDebug, quoted, isAdmin)
      if (!response) {return}
      
      for (let r of response) {
        if (typeof r === 'string') {await sock.sendMessage(room, {text:r})}
      }
    }
  })
}

// Belajar Bahasa Asing
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

function removeSubscription(room) {
  for (let c of Object.keys(subbers)) {
    const pos = subbers[c].indexOf(room)
    if (pos !== -1) {
      subbers[c].splice(pos,1)
      saveFile('./.data/bba/subbers/'+c+'.json', JSON.stringify(subbers[c]))
      return
    }
  }
}

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
  {name:'sub', info:'Berlangganan pelajaran bahasa Asing (untuk grup)', adminOnly:true, run:(room,param)=>{
    if (!isJidGroup(room)) {return ['⚠ Perintah tersebut hanya berlaku di dalam grup']}
    const code = param[0]
    const codelist = Object.keys(lessonList).join(', ')
    if (!code) {return [`⚠ Sertakan dengan kode bahasa pelajaran. (${codelist})\nContoh: ${prefix}sub ${Object.keys(lessonList)[0]}`]}
    if (!Object.keys(lessonList).includes(code)) {return [`⚠ Kode bahasa *${code}* tidak dikenali. Kode yang ada: ${codelist}`]}
    removeSubscription(room)
    if (!subbers[code].includes(room)) {
      subbers[code].push(room)
      const dir = './.data/bba/subbers/'
      fs.mkdirSync(dir, {recursive:true})
      fs.writeFileSync(dir+code+'.json', JSON.stringify(subbers[code]))
    }
    return [`✅ Grup ini telah berlangganan materi *${lessonList[code]}*`]
  }},
  {name:'unsub', info:'Berhenti berlangganan pelajaran bahasa Asing (untuk grup)', adminOnly:true, run:(room,param)=>{
    const code = param[0]
    const codelist = Object.keys(lessonList).join(', ')
    if (!code) {return [`⚠ Sertakan dengan kode bahasa pelajaran. (${codelist})\nContoh: ${prefix}sub ${Object.keys(lessonList)[0]}`]}
    if (!Object.keys(lessonList).includes(code)) {return [`⚠ Kode bahasa *${code}* tidak dikenali. Kode yang ada: ${codelist}`]}
    if (subbers[code].includes(room)) {
      const pos = subbers[code].indexOf(room)
      if (pos !== -1) {
        subbers[code].splice(pos,1)
        const dir = './.data/bba/subbers/'
        fs.mkdirSync(dir, {recursive:true})
        fs.writeFileSync(dir+code+'.json', JSON.stringify(subbers[code]))
      } 
    }
    return [`✅ Grup ini telah berhenti berlangganan materi *${lessonList[code]}*`]
  }},
  {name:'materi', info:'Materi bahasa asing'}
]
a
start()

async function processCommand (room, sender, msg, quoted, isAdmin) {
  if (!msg.startsWith(prefix)) {return}
  if (msg.length <= 1) {return}
  
  if ((sender||room) !== owner) {return [`Bot sementara dalam perbaikan`]}
  
  const inputs = msg.split(' ')
  const command = inputs[0].slice(1).toLowerCase()
  
  if (!command) {return [`⚠ Mohon perhatikan penulisan perintah bot yang benar.\nContoh: ${prefix}menu`]}
  
  const cmdItem = cmdList.find(c=>c.name===command)
  if (!cmdItem) {return [`⚠ Perintah *${command}* tidak ada. Ketik ${prefix}menu untuk melihat daftar perintah yang ada.`]}
  
  if (cmdItem.ownerOnly) {return [`⚠ Hanya owner bot yang dapat menggunakan perintah tersebut`]}
  
  if (cmdItem.adminOnly && isJidGroup(room)) {
    if (!isAdmin && (sender !== owner+numberEnding)) {return [`⚠ Hanya admin grup dan owner bot yang dapat menggunakan perintah tersebut`]}
  }
  
  const params = inputs.slice(1)
  return cmdList.find(c=>c.name===command).run(room,params,quoted)
 
}

function choose() {
  return arguments[randomInt(arguments.length)]
}

function saveFile(path, file) {
  fs.mkdirSync(path, {recursive:true})
  fs.writeFileSync(path+'/'+file)
}
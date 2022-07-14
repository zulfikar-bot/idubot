const http = require('http')
const fs = require('fs')
const {randomInt} = require('crypto')

const baileys = require('@adiwajshing/baileys')
const {useMultiFileAuthState, isJidGroup} = baileys

const port = process.env.PORT || 3000
const owner = process.env.OWNER
const numberEnding = '@s.whatsapp.net'

const bba = require('./bba')

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
      const groupdata = isJidGroup(room) ? (await sock.groupMetadata(room)) : undefined
      const isAdmin = groupdata?.participants.find(p=>p.id===sender).admin
      let msgDebug
      if (message.message?.imageMessage) msgDebug = '[IMAGE] '+message.message?.imageMessage.caption
      else if (message.message?.audioMessage) msgDebug = '[AUDIO]'
      else msgDebug = (message.message?.extendedTextMessage?.text || message.message?.conversation)
      console.log(`Message from ${message.pushName}: ${msgDebug}${groupdata?` (${groupdata.subject})`:''}`)
      
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
const codelist = Object.keys(lessonList)
const codeliststring = codelist.join(', ')

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
      saveFile('./.data/bba/subbers', c+'.json', JSON.stringify(subbers[c]))
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
    cmdList
      .filter(c=>!c.ownerOnly)
      .map(c=>{c.section ? `\n[${c.section}]` : prefix+c.name+' - '+c.info})
      .join('\n')+
    `\n\nKontak owner: +${owner}`
  ]}},
  
  {section:'Belajar Bahasa Asing'},
  {name:'sub', info:'Berlangganan pelajaran bahasa Asing (untuk grup)', adminOnly:true, run:(room,param)=>{
    if (!isJidGroup(room)) {return ['⚠ Perintah tersebut hanya berlaku di dalam grup']}
    const code = param[0]
    if (!code) {return [`⚠ Sertakan dengan kode bahasa pelajaran. (${codeliststring})\nContoh: ${prefix}sub ${codelist[0]}`]}
    if (!Object.keys(lessonList).includes(code)) {return [`⚠ Kode bahasa *${code}* tidak dikenali. Kode yang ada: ${codeliststring}`]}
    removeSubscription(room)
    if (!subbers[code].includes(room)) {
      subbers[code].push(room)
      saveFile('./.data/bba/subbers', code+'.json', JSON.stringify(subbers[code]))
    }
    return [`✅ Grup ini telah berlangganan materi *${lessonList[code]}*`]
  }},
  {name:'unsub', info:'Berhenti berlangganan pelajaran bahasa asing (untuk grup)', adminOnly:true, run:(room)=>{
    if (!isJidGroup(room)) {return ['⚠ Perintah tersebut hanya berlaku di dalam grup']}
    removeSubscription(room)
    return [`✅ Grup ini telah berhenti berlangganan materi bahasa asing`]
  }},
  {name:'materi', info:'Materi acak. Sertakan angka untuk memilih materi tertentu.', run:async(room,param)=>{
    const [code,params,error] = getSubCode(room, param, 'materi', ['','1'])
    if (!code) {return [error]}
    if (!params.length) {return [await bba.getRandomMaterial(code)]} 
    const material = await bba.getMaterial(code,params[0]-1)
    if (material===404) {return [`⚠ Nomor materi tersebut tidak ditemukan`]}
    return [material]
  }},
  {name:'list', info:'List materi', run: async (room,param)=>{
    const [code,params,error] = getSubCode(room,param,'list', [''])
    if (!code) {return [error]}
    const list = await bba.getList(code)
    const isGroup = isJidGroup(room)
    return [
      `*List Materi ${lessonList[code]}*\n\n`+
      list.map((v,i)=>`${i+1}) ${v.title}`).join('\n')+
      `\n\nUntuk menampilkan isi materi, gunakan perintah materi disertai dengan angka. Contoh:\n`+
      `${prefix}materi${isGroup?' '+code:''} ${randomInt(list.length)+1}`
    ]
  }},
  {name:'cari', info:'Cari materi', run:async(room,param)=>{
    const [code,params,error] = getSubCode(room,param,'cari', [''])
    if (!code) {return [error]}
    const isGroup = isJidGroup(room)
    if (!params.length) {return [`⚠ Sertakan dengan kata kunci.\nContoh: ${prefix}cari${isGroup?' '+code:''} tata bahasa`]}
    const result = await bba.searchMaterial(code,params)
    return [
      `*Hasil pencarian materi ${lessonList[code]}*\n`+
      `Kata kunci: ${params.join(' ')}\n\n`+
      result.map(r=>`${r.i+1}) ${r.title}`).join()
    ]
  }}
  
  // Owner Only
  {name:'showsub', ownerOnly:true, run:()=>[JSON.stringify(subbers, null, 1)]}
]
a
start()

async function processCommand (room, sender, msg, quoted, isAdmin) {
  if (!msg.startsWith(prefix)) {return}
  if (msg.length <= 1) {return}
  
  if ((sender||room) !== owner+numberEnding) {return [`Bot sementara dalam perbaikan`]}
  
  const inputs = msg.split(' ')
  const command = inputs[0].slice(1).toLowerCase()
  
  if (!command) {return [`⚠ Mohon perhatikan penulisan perintah bot yang benar.\nContoh: ${prefix}menu`]}
  
  const cmdItem = cmdList.find(c=>c.name===command)
  if (!cmdItem) {return [`⚠ Perintah *${command}* tidak ada. Ketik ${prefix}menu untuk melihat daftar perintah yang ada.`]}
  
  if (cmdItem.ownerOnly && ((sender||room)!== owner+numberEnding)) {return [`⚠ Hanya owner bot yang dapat menggunakan perintah tersebut`]}

  if (cmdItem.adminOnly && isJidGroup(room)) {
    if (!isAdmin && (sender !== owner+numberEnding)) {return [`⚠ Hanya admin grup dan owner bot yang dapat menggunakan perintah tersebut`]}
  }
  
  const params = inputs.slice(1)
  return cmdList.find(c=>c.name===command).run(room,params,quoted)
 
}

function choose() {
  return arguments[randomInt(arguments.length)]
}

function saveFile(path, file, content) {
  fs.mkdirSync(path, {recursive:true})
  fs.writeFileSync(path+'/'+file, content)
}

function getSubCode(room, param, cmdName, exParam) {
  if (!isJidGroup(room)) {
    const example = exParam.map(e=>`${prefix}${cmdName} ${codelist[0]} ${e}`).join('\n')
    if (!param[0]) {
      return [undefined,undefined,`⚠ Sertakan dengan kode bahasa. (${codeliststring})\nContoh:\n${example}`]
    } if (!codelist.includes(param[0])) {
      return [undefined,undefined,`⚠ Kode bahasa tidak terdeteksi. Sertakan dengan kode bahasa yang benar.\n(${codeliststring})\nContoh:\n${example}`]
    }
    return [param[0],param.slice(1)]
  }
  for (let s of Object.keys(subbers)) {
    if (subbers[s].includes(room)) {
      return [s, param]
    }
  } return [undefined,undefined,`⚠ Grup ini belum berlangganan materi bahasa asing.\nUntuk admin grup / owner bot silakan ketik ${prefix}sub diikuti kode bahasa (${codeliststring})\nContoh: ${prefix}sub ${codelist[0]}`]
}
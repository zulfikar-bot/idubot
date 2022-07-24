let aliveStart = Date.now()

// MODULES
const http = require("http");
const {request, submitForm} = require('./tools')
const fs = require("fs");
const { randomInt } = require("crypto")
const baileys = require("@adiwajshing/baileys");
const { useMultiFileAuthState, isJidGroup, downloadMediaMessage } = baileys;

// ENVIRONMENT VARIABLES
const port = process.env.PORT || 3000;
const owner = process.env.OWNER;
const numberEnding = "@s.whatsapp.net";

const happiKey = process.env.HAPPI
const apiNinjasKey = process.env.APININJAS

// VARIABLES
let ready = false

// SERVER
http.createServer(async (_, res) => {
  while (!ready) {await new Promise((resolve)=>setTimeout(resolve,1000))}
  res.end("Server is running");
  console.log('Server was pinged')
}).listen(port);
console.log("Server runs at port", port);

// TEMP FOLDER
fs.mkdirSync('./tmp', {recursive:true})

// BAILEYS
let sock
const retryMap = {}
const tempStore = {}
const getMessage = async (key) => {
  const {id} = key
  if (retryMap[id]===undefined) {retryMap[id] = 10}
  if (retryMap[id] <= 0) {return undefined}
  console.log(`Retrying to send ${id}...`)
  retryMap[id] --
  return tempStore[id]
}
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("./.data/wa_creds/");
  sock = baileys.default({ auth: state, getMessage });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    if (update.qr) console.log(`RECEIVED QR\n${update.qr}`);
    if (update.connection === "close") {
      if (update.lastDisconnect.error.output.statusCode === 401) {
        console.log("UNATHORIZED");
      } else {start()}
    } else if (update.connection === "open") {
      console.log("Connection open"); ready = true
    }
    if (update.receivedPendingNotifications) {
      console.log("Ready");
    }
  });
  sock.ev.on("messages.upsert", async (update) => {
    if (update.type !== "notify") return;
    await sock.readMessages(
      update.messages
        .filter((m) => m.key.remoteJid !== "status@broadcast")
        .map((m) => m.key)
    );
    for (let message of update.messages) {
      //console.log(message)
      if (message.key.fromMe) continue;
      const room = message.key.remoteJid;
      if (room === "status@broadcast") continue;
      if (!message.message) continue;
      
      const sender = message.key.participant;
      const quoted =
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage
          ?.conversation ||
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage
          ?.extendedTextMessage?.text;
      const groupdata = isJidGroup(room)
        ? await sock.groupMetadata(room) : undefined;
      const isAdmin = groupdata?.participants.find((p) => p.id === sender).admin;
      
      const msgType = Object.keys(message.message)[0]
      
      let body = '';
      switch (msgType) {
        case 'conversation':{
          body = message.message.conversation; break;
        } case 'extendedTextMessage': {
          body = message.message.extendedTextMessage.text; break;
        } case 'imageMessage':{
          body = message.message.imageMessage.caption; break;
        } case 'videoMessage':{
          body = message.message.videoMessage.caption; break;
        }
      } console.log(`Message from ${message.pushName}: `)
      
      if (message.message?.imageMessage) {
        msgDebug = "[IMAGE] " + message.message?.imageMessage.caption
        console.log(message)  
      }
      else if (message.message?.audioMessage) msgDebug = "[AUDIO]";
      else msgDebug =
          message.message?.extendedTextMessage?.text ||
          message.message?.conversation;
      console.log(
        `Message from ${message.pushName}: ${msgDebug}${groupdata ? ` (${groupdata.subject})` : ""}`
      )

      if (!msgDebug) {return}
      //console.log(JSON.stringify(message,null,1))
      
      if (quoted) {
        const keyId = message.message?.extendedTextMessage?.contextInfo?.stanzaId
        const cb = choices[keyId]
        if (cb) {await handleReply(room, await cb(msgDebug))}
      }
      
      const response = await processCommand(room,sender,msgDebug,quoted,isAdmin,message);
      if (!response) {return} 
      await handleReply(room,response)
    }
  });
}
a
// MY MODULES
// Belajar Bahasa Asing
const bba = require("./bba");
const lessonList = bba.getLessonList();
const codelist = Object.keys(lessonList);
const codeliststring = codelist.join(", ");

// OBJECTS
const choices = {}


// BOT CONTROL
const prefix = "!";
const cmdList = [
  {name: "ping", info: "Tes respon bot", run: () => [choose("Pong", "Halo", "Hadir", "Aktif")],},
  {name: "menu", info: "Tampilkan menu ini", run: (room) => {
    const isPrivate = !isJidGroup(room)
    const subCode = bba.getSubCode(room)
    return [
      "*MENU IDUBOT*\n============\n\n" +
        cmdList
          .filter((c) => {
            return !c.ownerOnly && (isPrivate||(!c.lang||(subCode===c.lang)))
          })
          .map((c) => {
            return c.section ?
            `\n[${c.section}]` :
            '*'+prefix+c.name+"* - " + c.info;
          })
          .join("\n") +
      `\n\nKontak owner: +${owner}`,
    ];
  }},

  { section: "Belajar Bahasa Asing" },
  {
    name: "sub",
    info: "Berlangganan pelajaran bahasa Asing (untuk grup)",
    adminOnly: true,
    run: (room, param) => {
      if (!isJidGroup(room)) {
        return ["⚠ Perintah tersebut hanya berlaku di dalam grup"];
      }
      const code = param[0];
      if (!code) {
        return [
          `⚠ Sertakan dengan kode bahasa pelajaran. (${codeliststring})\nContoh: ${prefix}sub ${codelist[0]}`,
        ];
      }
      if (!Object.keys(lessonList).includes(code)) {
        return [
          `⚠ Kode bahasa *${code}* tidak dikenali. Kode yang ada: ${codeliststring}`,
        ];
      }
      bba.removeSubscription(room);
      bba.addSubscription(code, room);
      return [`✅ Grup ini telah berlangganan materi *${lessonList[code]}*`];
    },
  },
  {
    name: "unsub",
    info: "Berhenti berlangganan pelajaran bahasa asing (untuk grup)",
    adminOnly: true,
    run: (room) => {
      if (!isJidGroup(room)) {
        return ["⚠ Perintah tersebut hanya berlaku di dalam grup"];
      }
      bba.removeSubscription(room);
      return [`✅ Grup ini telah berhenti berlangganan materi bahasa asing`];
    },
  },
  {
    name: "materi",
    info: "Materi acak. Sertakan angka untuk memilih materi tertentu.",
    run: async (room, param) => {
      const [code, params, error] = getSubCode(room, param, "materi", [
        "",
        "1",
      ]);
      if (!code) {
        return [error];
      }
      if (!params.length) {
        return [await bba.getRandomMaterial(code)];
      }
      const material = await bba.getMaterial(code, params[0] - 1);
      if (material === 404) {
        return [`⚠ Nomor materi tersebut tidak ditemukan`];
      }
      return [material];
    },
  },
  {
    name: "list",
    info: "List materi",
    run: async (room, param) => {
      const [code, params, error] = getSubCode(room, param, "list", [""]);
      if (!code) {
        return [error];
      }
      const list = await bba.getList(code);
      const isGroup = isJidGroup(room);
      return [
        `*List Materi ${lessonList[code]}*\n\n` +
          list.map((v, i) => `${i + 1}) ${v.title}`).join("\n") +
          `\n\nUntuk menampilkan isi materi, gunakan perintah materi disertai dengan angka. Contoh:\n` +
          `${prefix}materi${!isGroup ? " " + code : ""} ${
            randomInt(list.length) + 1
          }`,
      ];
    },
  },
  { name: "cari", info: "Cari materi", run: async (room, param) => {
    const [code, params, error] = getSubCode(room, param, "cari", ["tata bahasa"])
    if (!code) {return [error]}
    const isGroup = isJidGroup(room)
    if (!params.length) {
      return [
        `⚠ Sertakan dengan kata kunci.\nContoh: ${prefix}cari${!isGroup ? " " + code : ""} tata bahasa`,
      ]
    }
    const result = await bba.searchMaterial(code, params);
    return [
      `*Hasil pencarian materi ${lessonList[code]}*\n` +
        `Kata kunci: ${params.join(" ")}\n\n` +
        result.map((r) => `${r.i + 1}) ${r.title}`).join("\n") +
        `\n\nUntuk menampilkan isi materi, gunakan perintah materi disertai dengan angka. Contoh:\n` +
        `${prefix}materi${!isGroup ? " " + code : ""} ${
          randomInt(result.length) + 1
        }`,
    ]
  }},
  {
    name: "save",
    ownerOnly: true,
    run: async (_, param, quoted) => {
      let [code, title, tags] = param;
      if (!code) {
        return ["Missing code"];
      }
      if (!lessonList.includes(code)) {
        return ["Wrong code"];
      }
      if (!title) {
        return ["Missing title"];
      }
      if (!quoted) {
        return ["Missing content"];
      }
      title = title.replaceAll("_", " ");
      tags = tags || ""
      tags = tags.split(",");
      const id = await bba.saveMaterial(code, title, tags, quoted);
      return [`✅ Materi tersimpan di nomor ${id}`];
    }
  },
  {name: "trans", info:'Google Translate', run: async (_, param, quoted) => {
    //return ['Fitur ini sedang dikembangkan']
    const [from, to] = param
    let text = param.slice(2).join(' ')
    if (!from||!to) {return [`⚠ Sertakan dengan kode bahasa asal dan target.\nContoh: ${prefix}trans en id Good morning`]}
    if (!bba.translateSupported(from)) {return [`⚠ Kode *${from}* tidak dikenali. Ketik ${prefix}kodetrans untuk melihat daftar kode bahasa yang didukung.`]}
    if (!bba.translateSupported(to)) {return [`⚠ Kode *${to}* tidak dikenali. Ketik ${prefix}kodetrans untuk melihat daftar kode bahasa yang didukung.`]}
    if (!text) {text = quoted}
    if (!text) {return [`⚠ Sertakan dengan teks.\nContoh: ${prefix}trans en id Good morning.\nAtau reply pesan yang berisi teks sambil menggunakan perintah.`]}
    text = text.replace(/[_\*]/g,'')
    if (text.length>5000) {return [`⚠ Teks terlalu panjang`]}
    const result = await bba.translate(from, to, text)
    const fromName = bba.getLanguageName(from)
    const toName = bba.getLanguageName(to)
    return [
      `*Hasil Google Translate:*\n`+
      `${fromName} → ${toName}\n`+
      `${result.translation}`+
      `${result.translit?`\n(${result.translit})`:''}`
    ]
  }},
  {name: 'kodetrans', info:'Daftar kode bahasa G. Translate', run:()=>{
    return[
      '*Daftar Kode Bahasa Google Translate*\n'+
      '*Bahasa ----- Kode*\n'+
      bba.getTranslateCodes().map(l=>`${l.name} --- ${l.code}`).join('\n')
    ]
  }},
  {name: 'kalimat', info:'Contoh kalimat', run:async(room, param)=>{
    //return ['Fitur ini sedang dikembangkan']
    const [code, params, error] = getSubCode(room, param, "kalimat", ['','apple'])
    if (!code) {return [error]}
    const flag = { 'en':'🇬🇧', 'ja':'🇯🇵', 'de':'🇩🇪', 'es':'🇪🇸' }
    const sentence = await bba.getTatoeba(code, params.join(' '))
    if (!sentence) {return ['⚠ Kalimat dengan kata kunci tersebut tidak ditemukan']}
    const replies = []
    replies.push(
      '*Contoh Kalimat Acak*\n\n'+
      `${flag[code]} ${sentence.text}\n`+
      `${sentence.transcript?`(${sentence.transcript})\n`:''}`+
      `🇮🇩 ${sentence.translation}`
    )
    if (sentence.audiofile) {replies.push({audio:sentence.audiofile})}
    return replies
  }},
  
  {section: 'Belajar English', lang:'en'},
  {name: 'rr', info:'Teks read and record', lang:'en', run:async()=>{
    return [await bba.getReadRecord()]
  }},
  {name: 'tt', info:'Teks tongue twister', lang:'en', run:async()=>{
    return [await bba.getTongueTwister()]
  }},
  {name: 'dic', info:'Kamus Inggris-Inggris', lang:'en', run:async(_,param)=>{
    if (!param[0]) {return [`⚠ Sertakan dengan kata yang akan dicari.\nContoh: ${prefix}dic study`]}
      const query = param.join(' ')
      const result = JSON.parse(await bba.getDefinition(query))
      if (!result[0]) {return [`Kata tidak ditemukan`]}
      return [
        result.map(r=>{
          return `📖 *${r.word}* ${r.phonetic||''}\n`+
          r.meanings.map(m=>{
            return `[${m.partOfSpeech}]\n`+
            m.definitions.map((d,i)=>{
                return `${i+1}) ${d.definition}`+
                (d.example?`\n*Ex:* ${d.example}`:'')
            }).join('\n')+
            (m.synonyms.length?`\n*Synonyms:* _${m.synonyms.join(', ')}_`:'')+
            (m.antonyms.length?`\n*Antonyms:* _${m.antonyms.join(', ')}_`:'')
          }).join('\n')
        }).join('\n\n')
      ]
  }},
  {name: 'col', info:'Kamus Collocation Bhs. Inggris', lang:'en', run:async(_,param)=>{
    const input = param[0]
    if (!input) {return [`⚠ Sertakan dengan kata yang ingin dicari.\nContoh: ${prefix}col look`]}
    const result = await bba.getCollocation(input)
    if (result===404) {return [`⚠ Kata tersebut tidak ditemukan`]}
    else if (typeof result === 'string') {return [result]}
    else {return ['⚠ Terjadi error pada server kamus']}
  }},
  {name: 'read', info:'Bacakan teks bahasa Inggris', lang:'en', run:async(_,param,quoted)=>{
    const accentcode = { am:'en-US', br:'en-GB', au:'en-AU' }
    const accent = param[0]
    if (!accent) {return [`⚠ Sertakan kode aksen (am: Amerika, br:British, au:Australia)\nContoh: ${prefix}read am Good morning`]}
    if (!Object.keys(accentcode).includes(accent)) {return [`⚠ Kode aksen tidak terdeteksi. Silakan gunakan kode aksen setelah 'read'\n(am: Amerika, br:British, au:Australia)\nContoh: ${prefix}read am Good morning`]}
    let text = param.slice(1).join(' ')
    if (!text) {text = quoted}
    if (!text) {return [`⚠ Sertakan dengan teks yang akan dibacakan. Contoh: ${prefix}read am Good morning\nAtau gunakan perintah sambil me-reply pesan yang berisi teks.`]}
    if (text.length>=200) {return ['⚠ Teks terlalu panjang']}
    const filename = await bba.tts(accentcode[accent], text)
    if (typeof filename === 'number') {return [`🙈 Terjadi error ketika menghubungi server. (${filename})`]}
    return [{audio: filename}]
  }},
  {name: 'quote', info:'Quote bahasa Inggris', lang:'en', run:async()=>{
    const sources = [
      {url:'https://api.forismatic.com/api/1.0/?method=getQuote&lang=en&format=json', f:(r)=>[r.quoteText, r.quoteAuthor]},
      {url:'https://api.fisenko.net/v1/quotes/en/random', f:(r)=>[r.text, r.author?.name]}
    ]
    const [text, author] = await randomRequest(sources)
    return [`_${text}_\n- ${author||'Anonymous'}`.replace(/ +_/,'_')]
  }},
  {name: 'joke', info:'Lelucon bahasa Inggris', lang:'en', run:async()=>{
    const sources = [
      {url:'https://v2.jokeapi.dev/joke/Miscellaneous,Pun?blacklistFlags=nsfw,religious,racist&format=txt', format:'text'},
      {url:'https://icanhazdadjoke.com/', options:{headers:{Accept:'text/plain'}}, format:'text'}
    ]
    const joke = await randomRequest(sources)
    return [joke]
  }},
  {name: "fact", lang:"en", info:"Random fact", run:async()=>{
    const sources = [
      {url:'https://uselessfacts.jsph.pl/random.json?language=en', f:(r)=>r.text},
      {url:'https://asli-fun-fact-api.herokuapp.com/', f:(r)=>r.data.fact},
      {url:'https://api.api-ninjas.com/v1/facts', options:{headers:{'X-Api-Key':apiNinjasKey}}, f:(r)=>r[0].fact}
    ]
    const fact =  await randomRequest(sources)
    return [fact]
  }},
  {name: "advice", lang:'en', info:'Random advice', run:async()=>{
    return [JSON.parse((await request('GET','https://api.adviceslip.com/advice')).response).slip.advice]
  }},
  
  {section:'Alat'},
  {name:'gambar', info:'Cari gambar', run:async(r,p)=>{
    if (!p.length) {return [`Sertakan dengan kata kunci. Contoh:\n${prefix}cg kucing`]}
    const results = JSON.parse((await request('GET', 'https://imsea.herokuapp.com/api/1?q='+p.join(' '))).response)
    if (!results.results.length) {return ['Gambar tidak ditemukan']}
    return [{image:results.results[randomInt(results.results.length)]}]
  }},
  {name:'lirik', info:'Cari lirik lagu', run:async(r,p)=>{
    //return ['Fitur ini sedang dikembangkan']
    if (!p.length) {return [`Sertakan dengan kata kunci.\nContoh: ${prefix}linkin park numb`]}
    const result = JSON.parse((await request('GET', `https://api.happi.dev/v1/music?q=${p.join(' ')}&lyrics=true`, {headers:{
      'x-happi-key':happiKey
    }})).response)
    if (!result.length) {return ['Lirik tidak ditemukan']}
    return [
      {
        choice:
          result.result.map((r,i)=>`${i+1}) ${r.artist} - ${r.track}`).join('\n') +
          `\n\nReply ke pesan ini dengan angka. Jika tak ada respon lakukan pencarian ulang.`,
        callback:async(n)=>{
          if (!result.result[n-1]) {return ['Balas dengan angka yang tersedia pada pilihan']}
          const result2 = JSON.parse((await request('GET', result.result[n-1].api_lyrics, {headers:{
            'x-happi-key':happiKey
          }})).response)
          return [result2.result.lyrics]
       }
      }
    ]
    
  }},
  {name:'imread', info:'Ambil teks dari gambar', run:async(r,p,q,m)=>{
    return ['Fitur ini sedang dikembangkan']
    const result = await submitForm({
      host:'https://api.api-ninjas.com',
      path:'/v1/imagetotext',
      headers:{
        'X-Api-Key':apiNinjasKey
      },
    }, [{key:'image', value:fs.createReadStream}])
  }},

  // Owner Only
  { name: "showsub", ownerOnly: true, 
    run: () => [JSON.stringify(bba.getSubbers(), null, 1)],
  },
  { name: "alivetime", ownerOnly: true, 
    run: () => [`Time alive: ${Date.now() - aliveStart}`],
  },
];

start();

async function randomRequest(sources) {
  const picked = sources[randomInt(sources.length)]
  const result = picked.format==='text'?(await request('GET', picked.url, picked.options)).response:(await getJson(picked.url, picked.options))
  return picked.f?picked.f(result):result
}

async function getJson(url, options) {
  return (await request('GET', url, options, null, true)).response
}

async function processCommand(room, sender, msg, quoted, isAdmin, msgObject) {
  if (!msg.startsWith(prefix)) {return}
  if (msg.length <= 1) {return}

  //if ((sender||room) !== owner+numberEnding) {return [`Bot sementara dalam perbaikan`]}

  const aliveTime = Date.now() - aliveStart //miliseconds
  
  // This will only ping the app if needed, it will not always be triggered
  if (aliveTime > 4*60*1000) {
    aliveStart = Date.now()
    const test = await request('GET', 'https://idubot.glitch.me')
    //await sock.sendMessage(owner+numberEnding, {text:`Test:\n${test}`})
  }
  
  const inputs = msg.split(" ");
  const command = inputs[0].slice(1).toLowerCase();

  if (!command) {
    return [
      `⚠ Mohon perhatikan penulisan perintah bot yang benar.\nContoh: ${prefix}menu`,
    ];
  }

  const cmdItem = cmdList.find((c) => c.name === command);
  if (!cmdItem) {
    return [
      `⚠ Perintah *${command}* tidak ada. Ketik ${prefix}menu untuk melihat daftar perintah yang ada.`,
    ];
  }

  if (cmdItem.ownerOnly && (sender || room) !== owner + numberEnding) {
    return [`⚠ Hanya owner bot yang dapat menggunakan perintah tersebut`];
  }

  if (cmdItem.adminOnly && isJidGroup(room)) {
    if (!isAdmin && sender !== owner + numberEnding) {
      return [
        `⚠ Hanya admin grup dan owner bot yang dapat menggunakan perintah tersebut`,
      ];
    }
  }

  const params = inputs.slice(1);
  sock.sendPresenceUpdate('composing',room)
  return cmdList.find((c) => c.name === command).run(room, params, quoted, msgObject);
}

async function handleReply (room, response) {
  for (let r of response) {
    if (typeof r === "string") {
      const sent = await sock.sendMessage(room, { text: r }, { ephemeralExpiration: 86400 });
      tempStore[sent.key.id] = sent.message
    } else if (typeof r === 'object') {
      if (r.audio) {await sock.sendMessage(room, {audio:{url:r.audio}, mimetype:'audio/mp4'}); return}
      if (r.image) {await sock.sendMessage(room, {image:{url:r.image}, caption:r.caption}); return}
      if (r.choice) {
        const sent = await sock.sendMessage(room, {text:r.choice}, {ephemeralExpiration: 86400})
        choices[sent.key.id] = r.callback
      }
    }
  }
}

function choose() {
  return arguments[randomInt(arguments.length)];
}

function getSubCode(room, param, cmdName, exParam) {
  if (!isJidGroup(room)) {
    const example = exParam
      .map((e) => `${prefix}${cmdName} ${codelist[0]} ${e}`)
      .join("\n");
    if (!param[0]) {
      return [
        undefined,
        undefined,
        `⚠ Sertakan dengan kode bahasa. (${codeliststring})\nContoh:\n${example}`,
      ];
    }
    if (!codelist.includes(param[0])) {
      return [
        undefined,
        undefined,
        `⚠ Kode bahasa tidak terdeteksi. Sertakan dengan kode bahasa yang benar.\n(${codeliststring})\nContoh:\n${example}`,
      ];
    }
    return [param[0], param.slice(1)];
  }
  const subbers = bba.getSubbers();
  for (let s of Object.keys(subbers)) {
    if (subbers[s].includes(room)) {
      return [s, param];
    }
  }
  return [
    undefined,
    undefined,
    `⚠ Grup ini belum berlangganan materi bahasa asing.\nUntuk admin grup / owner bot silakan ketik ${prefix}sub diikuti kode bahasa (${codeliststring})\nContoh: ${prefix}sub ${codelist[0]}`,
  ];
}

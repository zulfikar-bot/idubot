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
//       if (update.lastDisconnect.error.output.statusCode === 401) {
        
//       }
      const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error.output.statusCode === 401
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
            // reconnect if not logged out
            if(shouldReconnect) {
                start()
            }
        } else if(connection === 'open') {
            console.log('opened connection')
        }
    }
  })
}

start()
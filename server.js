const http = require('http')
const port = process.env.PORT

const baileys = require('@adiwajshing/baileys')

http.createServer((_,res) => {
  res.end('Server is running')
}).listen(port)
console.log('Server runs at port',port)

console.log(typeof baile)
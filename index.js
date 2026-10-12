
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LAKA MINI BOT</title>
<style>body{background:#111;color:#fff;font-family:sans-serif;text-align:center;padding:20px}
.box{background:#222;padding:25px;border-radius:15px;max-width:380px;margin:30px auto}
input{padding:14px;width:90%;border-radius:10px;border:none;margin:10px 0;font-size:16px}
button{padding:14px 25px;background:#00ff88;color:#000;font-weight:bold;border:none;border-radius:10px;width:95%;font-size:18px}
h1{color:#00ff88}</style></head><body>
<h1>LAKA-MINI-BOT</h1>
<h3>Pair Your WhatsApp</h3>
<div class="box">
<p>Enter number with country code<br>Ex: 2348012345678</p>
<form action="/pair" method="GET">
<input type="number" name="number" placeholder="234xxxxxxxxxx" required>
<button type="submit">GET CODE</button>
</form></div></body></html>`);
});

app.get('/pair', async (req, res) => {
  let num = req.query.number;
  if(!num) return res.json({error:"Add ?number=234xxxx"});
  num = num.replace(/[^0-9]/g,'');
  const dir = './session';
  if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true,force:true});
  fs.mkdirSync(dir);
  try{
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const sock = makeWASocket({
      logger:pino({level:"silent"}),
      printQRInTerminal:false,
      auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,pino({level:"silent"}))},
      browser:["LAKA-MINI-BOT","Chrome","1.0"]
    });
    if(!sock.authState.creds.registered){
      await new Promise(r=>setTimeout(r,3000));
      let code = await sock.requestPairingCode(num);
      code = code?.match(/.{1,4}/g)?.join("-") || code;
      res.send(`<body style="background:#111;color:#fff;text-align:center;padding:30px;font-family:sans-serif">
      <h1 style="color:#00ff88">YOUR PAIR CODE</h1>
      <h2 style="font-size:42px;background:#00ff88;color:#000;padding:20px;border-radius:12px">${code}</h2>
      <p>WhatsApp > Linked Devices > Link with phone number</p></body>`);
    }
    sock.ev.on('creds.update', saveCreds);
  }catch(e){ res.json({error:e.message}); }
});

app.listen(process.env.PORT||3000, ()=>console.log("LIVE"));

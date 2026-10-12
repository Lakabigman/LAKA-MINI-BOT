const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>LAKA MINI BOT - Pair</title>
<style>
body{background:#111;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.box{background:#222;padding:25px;border-radius:15px;width:90%;max-width:400px;text-align:center}
input{width:90%;padding:12px;border-radius:8px;border:none;margin:10px 0;font-size:16px}
button{width:95%;padding:12px;background:#25D366;color:#fff;border:none;border-radius:8px;font-size:18px;font-weight:bold}
#code{font-size:32px;letter-spacing:5px;background:#000;padding:15px;margin-top:15px;border-radius:8px;display:none;word-break:break-all}
</style>
</head>
<body>
<div class="box">
<h2>LAKA MINI BOT</h2>
<p>Enter WhatsApp number with country code</p>
<p style="font-size:13px;color:#aaa">e.g 2348012345678</p>
<input id="num" placeholder="234XXXXXXXXXX" type="number"/>
<button onclick="getCode()">GET PAIRING CODE</button>
<div id="code"></div>
<p id="status" style="color:#25D366;margin-top:15px"></p>
</div>
<script>
async function getCode(){
  const n=document.getElementById('num').value;
  if(!n){alert('Enter number');return}
  document.getElementById('status').innerText='Generating... wait 20 sec';
  const res=await fetch('/pair?number='+n);
  const data=await res.json();
  if(data.code){
    document.getElementById('code').style.display='block';
    document.getElementById('code').innerText=data.code;
    document.getElementById('status').innerText='Go to WhatsApp > Linked Devices > Link with phone number > Enter this code';
  }else{
    document.getElementById('status').innerText='Error: '+(data.error||'try again');
  }
}
</script>
</body>
</html>
  `);
});

app.get('/pair', async (req, res) => {
  let num = req.query.number;
  if(!num) return res.json({error:'Number required'});
  num = num.replace(/[^0-9]/g,'');

  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_'+num);
    
    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
      await new Promise(r => setTimeout(r, 3000));
      let code = await sock.requestPairingCode(num);
      code = code?.match(/.{1,4}/g)?.join('-') || code;
      res.json({ code: code });
    } else {
      res.json({ error: 'Already registered' });
    }
  } catch(e){
    console.log(e);
    res.json({ error: e.message });
  }
});

app.listen(PORT, ()=> console.log('Live on '+PORT));

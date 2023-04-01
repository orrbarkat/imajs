const { Client, LocalAuth } = require("whatsapp-web.js");
const {Saver} = require("saver.js");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: false },
});

const saver = new Saver();

client.on("loading_screen", (percent, message) => {
  console.log("LOADING SCREEN", percent, message);
});

client.on("qr", (qr) => {
  // NOTE: This event will not be fired if a session is specified.
  console.log("QR RECEIVED", qr);
});

client.on("authenticated", () => {
  console.log("AUTHENTICATED");
});

client.on("auth_failure", (msg) => {
  // Fired if session restore was unsuccessful
  console.error("AUTHENTICATION FAILURE", msg);
});

client.on("ready", () => {
  console.log("READY");
});

client.on('message', async (message) => {
  if (message.hasMedia && message.type === 'image') {
    const media = await message.downloadMedia();
    saver.save(message, media);
  }
});

client.initialize();

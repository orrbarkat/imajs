import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import Saver, { MODE_WHATSAPP } from "./saver.js";
import ImageFilter from "./image_filter.js";
import qrcode from 'qrcode-terminal';
import AWS from 'aws-sdk';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';


const config = {
  storageMode: MODE_WHATSAPP,
  whatsappMediaRecipient: process.env.WHATSAPP_ID, // The number format: 972541234567@c.us
  refrenceImages: [
    // "s3://whatsapp-photos/IMG_1493.heic",
    "s3://whatsapp-photos/7e0bac58-87f6-4b64-b603-77efb2766bc7.jpg",
    "s3://whatsapp-photos/6d9264a8-178f-4db0-b039-c7982e9eb998.jpg",
    "s3://whatsapp-photos/4f1cbc4f-e242-46c9-94d6-c52ba450925d.jpg",
    "s3://whatsapp-photos/IMG_20160502_090658.jpg",
    "s3://whatsapp-photos/IMG_2220.JPG",
    "s3://whatsapp-photos/IMG_7024.jpg"
  ]
};

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_DEFAULT_REGION
});

const { stdout: chromiumPath } = await promisify(exec)("which chromium");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: chromiumPath.trim()
  },
});

const imageFilter = new ImageFilter(config.refrenceImages);
let saver = new Saver(config.storageMode, null);

client.on("loading_screen", (percent, message) => {
  console.log("LOADING SCREEN", percent, message);
});

client.on("qr", (qr) => {
  // NOTE: This event will not be fired if a session is specified.
  qrcode.generate(qr, { small: true });
  console.log("QR RECEIVED", qr);
});

client.on("authenticated", (session) => {
  console.log("AUTHENTICATED");
  console.log(JSON.stringify(session));
});

client.on("auth_failure", (msg) => {
  // Fired if session restore was unsuccessful
  console.error("AUTHENTICATION FAILURE", msg);
});

client.on("ready", async () => {
  console.log("READY");
  console.log(`info: ${JSON.stringify(client.info)}`);
  if (config.storageMode === MODE_WHATSAPP) {
    await createWhatsappSaver();
  }
});

async function createWhatsappSaver() {
  const chat = await client.getChatById(config.whatsappMediaRecipient);
  console.log(`Chat found for number: ${config.whatsappMediaRecipient}`, chat.id);
  saver = new Saver(config.storageMode, chat);
}

async function downloadMediaWithRetries(message) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const media = await message.downloadMedia();
      if (media) return media;
    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed to download media.`);
      if (attempt === 2) throw error;
    }
  }
  throw new Error("Failed to download media after 3 attempts.");
}

client.on('message', async (message) => {
  // console.debug(`New message from ${message.from}: ${message.body} `);
  if (message.hasMedia) {
    try {
      const media = await downloadMediaWithRetries(message);
      // Exclude data property from being logged
      const { data, ...mediaWithoutData } = media;
      console.debug(`Media JSON without data: ${JSON.stringify(mediaWithoutData)} `);
      const isFiltered = await imageFilter.filter(media);
      if (isFiltered) {
        saver.save(media);
      }
    } catch (e) {
      console.log("Error handling message media.");
      console.error(e);
    }
  }
});

client.initialize();
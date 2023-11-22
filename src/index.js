import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import Saver, { MODE_AWS } from "./saver.js";
import ImageFilter from "./image_filter.js";
import qrcode from 'qrcode-terminal';
import AWS from 'aws-sdk';

const config = {
  storageMode: MODE_AWS,
  refrenceImages: [
    "s3://whatsapp-photos/7e0bac58-87f6-4b64-b603-77efb2766bc7.jpg",
    // "s3://whatsapp-photos/IMG_1493.heic",
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

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // TODO - get chromium path programtically.
    executablePath: "/nix/store/n6m949x5r35yf75yfaw504cb37n0fxcw-chromium-114.0.5735.106/bin/chromium"
  },
});

const imageFilter = new ImageFilter(config.refrenceImages);
const saver = new Saver(config.storageMode);

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

client.on("ready", () => {
  console.log("READY");
});

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
  // console.debug(`New message from ${message.from}: ${message.body}`);
  if (message.hasMedia) {
    try {
      const media = await downloadMediaWithRetries(message);
      // Exclude data property from being logged
      const { data, ...mediaWithoutData } = media;
      console.debug(`Media JSON without data: ${JSON.stringify(mediaWithoutData)}`);
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


import AWS from 'aws-sdk';
import Saver, { MODE_AWS } from "./saver.js";
import ImageFilter from "./image_filter.js";
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;

const config = {
  storageMode: MODE_AWS,
  refrenceImages: [
    "s3://whatsapp-photos/7e0bac58-87f6-4b64-b603-77efb2766bc7.jpg",
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

const imageFilter = new ImageFilter(config.refrenceImages);
const saver = new Saver(config.storageMode);

const media = MessageMedia.fromFilePath("./images/IMG_7024.jpg");

console.log(media.mimetype);
const isFiltered = await imageFilter.filter(media);
if (isFiltered) {
  saver.save(media);
}




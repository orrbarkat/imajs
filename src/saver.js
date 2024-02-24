import fs from "fs";
import AWS from "aws-sdk";

const OUTPUT_PATH = "filtered";
export const MODE_LOCAL = 'local';
export const MODE_AWS = 'AWS';
export const MODE_WHATSAPP = 'whatsapp';

class Saver {
  constructor(mode, chat, s3 = new AWS.S3()) {
    if (![MODE_LOCAL, MODE_AWS, MODE_WHATSAPP].includes(mode)) {
      throw new Error("Mode must be 'local', 'AWS', or 'whatsapp'");
    }
    this.mode = mode;
    this._s3 = s3;
    this.whatsappChat = chat;
  }

  async save(media) {
    switch (this.mode) {
      case MODE_LOCAL:
        fs.writeFile(Saver.asPath(media), media.data, { encoding: "base64" });
        break;
      case MODE_AWS:
        await this.uploadFilteredPhoto(Saver.asPath(media), media);
        break;
      case MODE_WHATSAPP:
        await this.chat.sendMessage(media);
        break;
      default:
        throw new Error("Invalid mode");
    }
  }

  async uploadFilteredPhoto(path, media) {
    try {
      console.log(this._s3); // This should output the mock or the AWS S3 object
      const uploadData = await this._s3.upload({
        Bucket: 'whatsapp-photos',
        Key: path,
        Body: Buffer.from(media.data, "base64"),
        ContentType: media.mimetype,
      }).promise();

      console.log("Successfully uploaded: ", uploadData.Location);
    } catch (uploadErr) {
      console.error("Error uploading: ", uploadErr);
    }
  }

  static asPath(media) {
    const filename = media.filename ||
      `file_${Date.now()}.${media.mimetype.split("/").pop()}`;
    return `${OUTPUT_PATH}/${filename}`;
  }
}
export default Saver; // Exporting the Saver class
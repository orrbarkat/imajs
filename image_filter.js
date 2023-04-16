const AWS = require('aws-sdk');
const sharp = require('sharp');

const referenceImages = [];

class ImageFilter {
  constructor(){
    this._rekognition = new AWS.Rekognition();
  }

  async filter(message, media) {
    const imageBuffer = Buffer.from(media.data, "base64");

    for (const referenceImage of referenceImages) {
      const result = await _rekognition
        .compareFaces({
          SourceImage: { Bytes: imageBuffer },
          TargetImage: { Bytes: referenceImage.buffer },
          SimilarityThreshold: 70,
        })
        .promise()
      console
      if (result.FaceMatches.length > 0) {
        console.log(
          `Image ${message.id._serialized} matches reference image ${referenceImage.name}`
        );
        // do something with the matching image
        return true;
      }
    }
    return false;
  }
}

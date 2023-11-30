import AWS from 'aws-sdk';

class ImageFilter {
  constructor(referenceImagePaths) {
    this._rekognition = new AWS.Rekognition();
    this.referenceImagePaths = referenceImagePaths;
  }

  async filter(media) {
    if (!ImageFilter.validateImage(media)) {
      console.log(`Invalid image type, got: ${media.mimetype}`);
      return false;
    }
    if (!this.hasFaces(media.data)) {
      console.log(`No faces found in image`);
      return false;
    }
    const comparePromises = this.referenceImagePaths.map(
      imgPath => this.compareFaces(media.data, imgPath));
    const compareResults = await Promise.all(comparePromises);
    return compareResults.some(result => result.hasMatch);
  }

  static validateImage(media) {
    return media.mimetype === 'image/jpeg' || media.mimetype === 'image/png';
  }

  async hasFaces(image) {
    const params = {
      Image: { Bytes: Buffer.from(image, "base64") },
      Attributes: ['ALL']
    };
    try {
      const data = await this._rekognition.detectFaces(params).promise();
      return data.FaceDetails.length > 0;
    } catch (err) {
      console.error(`### detect faces message: ${err.message}`);
      console.error(`### detect faces type: ${err.__type}`);
    }
  }

  async compareFaces(sourceImage, referenceImagePath) {
    try {
      const referenceFilename = referenceImagePath.split('/').pop();
      // TODO - always convert to a mimetype that aws can handle.
      const result = await this._rekognition.compareFaces({
        SourceImage: { Bytes: Buffer.from(sourceImage) },
        TargetImage: { S3Object: { Bucket: 'whatsapp-photos', Name: referenceFilename } },
        SimilarityThreshold: 70,
      }).promise();

      let hasMatch = result.FaceMatches && result.FaceMatches.length > 0;
      console.log(`filename: ${referenceFilename}, hasMatch: ${hasMatch}`);
      return { "hasMatch": hasMatch, "result": result, "filename": referenceFilename };
    } catch (err) {
      console.error(`### cmp faces message: ${err.message}`);
      console.error(`### cmp faces type: ${err.__type}`);
      // console.error(err);

    }
    return { "hasMatch": false, "result": null }
  }
}

export default ImageFilter;

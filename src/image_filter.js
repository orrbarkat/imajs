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
    const comparePromises = this.referenceImagePaths.map(
      imgPath => this.compareFaces(media.data, imgPath));
    const compareResults = await Promise.all(comparePromises);
    return compareResults.some(result => result.hasMatch);
  }

  static validateImage(media) {
    return media.mimetype === 'image/jpeg' || media.mimeType === 'image/png';
  }

  async compareFaces(sourceImage, referenceImagePath) {
    try {
      const referenceFilename = referenceImagePath.split('/').pop();
      const result = await this._rekognition.compareFaces({
        SourceImage: { Bytes: Buffer.from(sourceImage, "base64") },
        TargetImage: { S3Object: { Bucket: 'whatsapp-photos', Name: referenceFilename } },
        SimilarityThreshold: 70,
      }).promise();

      let hasMatch = result.FaceMatches && result.FaceMatches.length > 0;
      console.log(`filename: ${referenceFilename}, hasMatch: ${hasMatch}`);
      return { "hasMatch": hasMatch, "result": result, "filename": referenceFilename };
    } catch (err) {
      console.error(err.message);
      console.error(err);

    }
    return { "hasMatch": false, "result": null }
  }
}

export default ImageFilter;
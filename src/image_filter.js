import AWS from 'aws-sdk';
import * as faceapi from 'face-api.js';

export const FILTER_MODE_LOCAL = 'LOCAL';
export const FILTER_MODE_AWS = 'AWS';


class ImageFilter {
  constructor(referenceImagePaths, filterMode) {
    switch (filterMode) {
      case FILTER_MODE_LOCAL:
        this._filter = new LocalImageFilter(referenceImagePaths);
        break;
      case FILTER_MODE_AWS:
        this._filter = new AwsImageFilter(referenceImagePaths);
        break;
      default:
        throw new Error(`Invalid filter mode: ${filterMode}`);
    }
  }

  async filter(media) {
    return this._filter.filter(media);
  }

  static async createFilter(referenceImagePaths, filterMode) {
    const filter = new ImageFilter(referenceImagePaths, filterMode);
    await filter._filter.init();
    return filter;
  }
}

// A class to leverage face-api.js for image filtering based on https://github.com/computervisioneng/face-recognition-javascript-webcam-faceapi/blob/main/script.js
class LocalImageFilter {
  constructor(referenceImagePaths) {
    this.referenceImagePaths = referenceImagePaths;
  }

  init() {
    return Promise.all([
      // load models
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
      // initialize LabeledFaceDescriptors based on referenceImagePaths
      this.createFaceMatcher().then(faceMatcher => this.faceMatcher = faceMatcher)
    ]);
  }

  async createFaceMatcher() {
    const faceDescriptors = await Promise.all(
      this.referenceImagePaths.map(async (path) => faceapi.fetchImage(path).then(img => faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors())
      ));
    return new faceapi.FaceMatcher(faceDescriptors);
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
    const img = await faceapi.bufferToImage(media.data);
    const detections = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
    const matchResults = detections.map(detection => this.faceMatcher.findBestMatch(detection.descriptor));
    return matchResults.some(matches => matches.some(match => match._label !== 'unknown'));
  }

  static validateImage(media) {
    return media.mimetype === 'image/jpeg' || media.mimetype === 'image/png';
  }

  async hasFaces(image) {
    const img = await faceapi.bufferToImage(image);
    const detections = await faceapi.detectAllFaces(img);
    return detections.length > 0;
  }
}

/**
 * Represents an AWS image filter.
 * @class
 */
class AwsImageFilter {

  constructor(referenceImagePaths) {
    this._rekognition = new AWS.Rekognition();
    this.referenceImagePaths = referenceImagePaths;
  }

  init() {}

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

import { MODE_LOCAL, MODE_AWS, Saver } from '../src/saver';
import AWS from 'aws-sdk';
import fs from 'fs';

jest.mock('fs', () => ({
  writeFile: jest.fn(),
}));

jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
    upload: jest.fn(() => ({
      promise: jest.fn(),
    })),
  })),
}));

describe('Saver class', () => {
  const media = {
    mimeType: 'image/jpeg',
    data: 'some_base64_string',
    filename: 'image',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if an invalid mode is given', () => {
    expect(() => new Saver('invalid-mode')).toThrow("Mode must be 'local' or 'AWS'");
  });

  it('should save media locally if mode is local', () => {
    const saver = new Saver(MODE_LOCAL);
    saver.save({ filename: 'test' }, media);
    expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), media.data, { encoding: 'base64' });
  });

  it('should upload media to AWS if mode is AWS', async () => {
    const uploadPromise = jest.fn();
    AWS.S3.prototype.upload = jest.fn(() => ({
      promise: uploadPromise,
    }));
    const saver = new Saver(MODE_AWS);
    await saver.uploadFilteredPhoto('test_filename', media);
    expect(AWS.S3.prototype.upload).toHaveBeenCalledWith({
      Bucket: 'whatsapp-photos',
      Key: 'filtered/test_filename',
      Body: expect.any(Buffer),
      ContentType: 'image/jpeg',
    });
    expect(uploadPromise).toHaveBeenCalled();
  });

  it('should return a file path from asPath method', () => {
    const filepath = Saver.asPath({ filename: 'test', mimeType: 'image/png' });
    expect(filepath).toBe('output/test.png');
  });
});
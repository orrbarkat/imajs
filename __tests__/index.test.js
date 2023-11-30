import { MODE_LOCAL, MODE_AWS } from '../src/saver.js';
import Saver from '../src/saver.js';
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

describe(Saver, () => {
  const media = {
    mimetype: 'image/jpeg',
    data: 'some_base64_string',
    filename: 'image',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if an invalid mode is given', () => {
    expect(() => new Saver('invalid-mode')).toThrow("Mode must be 'local', 'AWS', or 'whatsapp'");
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
    const filepath = Saver.asPath({ filename: 'test', mimetype: 'image/png' });
    expect(filepath).toBe('filtered/test');
  });

  it('should return a file path from asPath method when no filename exists', () => {
    const filepath = Saver.asPath({ mimetype: 'image/png' });
    expect(filepath).toMatch(/^filtered\/file_\d+\.png$/);
  });
});
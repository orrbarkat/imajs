# Imajs

## Description

This project is designed to listen to your whatsapp account and filter images of people you choose to a storage location. This should solve the problem of finding my kids images from the kindergarden's whatsapp.

## Features

- Filter images by comparing them to reference images
- Save processed images locally or to AWS S3

## Prerequisites

- Node.js
- AWS Account with configured AWS SDK
- Set of reference images

## Installation

To set up the project on your local machine, follow these steps:

1. Clone the repository

    ```sh
    git clone https://github.com/orrbarkat/imajs.git
    cd imajs
    ```

2. Install dependencies

    ```sh
    npm install
    ```

3. Set up your AWS credentials

    - Configure your AWS credentials using AWS CLI or by setting up environment variables.

4. Store your reference images in the `reference_images` part of the config.

## Usage

1. To start processing images, you can use the `try_upload.js` script:

    ```sh
    node src/try_upload.js
    ```
2. To run against whatsapp:

   ```sh
   node src/index.js
   ```

3. A QR code will appear in your terminal, scan it to allow whatsapp web client to authenticate to your account.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
const fs = require("fs");

const OUTPUT_PATH = "output";

class Saver {
  save(message, media) {
    fs.writeFile(this.asPath(message), media.data, { encoding: "base64" });
  }

  asPath(message) {
    return (
      OUTPUT_PATH +
      "/" +
      message.id._serialized +
      "." +
      media.mimetype.split("/")[1]
    );
  }
}

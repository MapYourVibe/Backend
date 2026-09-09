const QRCode = require("qrcode");

const generateQrDataUrl = async (payload) => {
  return QRCode.toDataURL(JSON.stringify(payload), {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
};

const generateQrBuffer = async (payload) => {
  return QRCode.toBuffer(JSON.stringify(payload), {
    type: "png",
    width: 300,
    margin: 2,
  });
};

module.exports = {
  generateQrDataUrl,
  generateQrBuffer,
};

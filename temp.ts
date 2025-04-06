import bs58 from 'bs58';

// Your signature from the transaction failure log (as an object)
const signatureObj = {
  "0": 110,
  "1": 148,
  "2": 66,
  "3": 103,
  "4": 136,
  "5": 246,
  "6": 60,
  "7": 220,
  "8": 246,
  "9": 238,
  "10": 130,
  "11": 232,
  "12": 50,
  "13": 208,
  "14": 6,
  "15": 134,
  "16": 235,
  "17": 230,
  "18": 54,
  "19": 39,
  "20": 64,
  "21": 238,
  "22": 39,
  "23": 145,
  "24": 27,
  "25": 77,
  "26": 223,
  "27": 7,
  "28": 255,
  "29": 75,
  "30": 219,
  "31": 127,
  "32": 27,
  "33": 228,
  "34": 57,
  "35": 42,
  "36": 64,
  "37": 144,
  "38": 192,
  "39": 230,
  "40": 11,
  "41": 43,
  "42": 202,
  "43": 38,
  "44": 109,
  "45": 184,
  "46": 131,
  "47": 215,
  "48": 45,
  "49": 79,
  "50": 55,
  "51": 125,
  "52": 31,
  "53": 31,
  "54": 227,
  "55": 159,
  "56": 155,
  "57": 151,
  "58": 103,
  "59": 119,
  "60": 34,
  "61": 146,
  "62": 165,
  "63": 1
};

// Convert the object values to a Uint8Array
const signatureUint8 = Uint8Array.from(Object.values(signatureObj) as number[]);

console.log('123: ', Buffer.from(Object.values(signatureObj)).toString('base64'));

// Convert the Uint8Array to a base58 string
const signatureString = bs58.encode(signatureUint8);

console.log("Signature string:", signatureString);
// You can now search for this signature string on the Solana Explorer:
// https://explorer.solana.com/tx/<signatureString>

import bs58 from 'bs58';

// Your signature from the transaction failure log (as an object)
const signatureObj = {
  "0": 59,
  "1": 88,
  "2": 134,
  "3": 136,
  "4": 51,
  "5": 33,
  "6": 81,
  "7": 140,
  "8": 59,
  "9": 220,
  "10": 109,
  "11": 117,
  "12": 254,
  "13": 61,
  "14": 130,
  "15": 166,
  "16": 130,
  "17": 175,
  "18": 8,
  "19": 252,
  "20": 227,
  "21": 27,
  "22": 100,
  "23": 47,
  "24": 90,
  "25": 25,
  "26": 2,
  "27": 126,
  "28": 81,
  "29": 204,
  "30": 27,
  "31": 174,
  "32": 101,
  "33": 97,
  "34": 233,
  "35": 93,
  "36": 218,
  "37": 31,
  "38": 9,
  "39": 198,
  "40": 138,
  "41": 198,
  "42": 57,
  "43": 136,
  "44": 224,
  "45": 166,
  "46": 90,
  "47": 173,
  "48": 125,
  "49": 87,
  "50": 137,
  "51": 217,
  "52": 18,
  "53": 242,
  "54": 113,
  "55": 127,
  "56": 21,
  "57": 113,
  "58": 161,
  "59": 90,
  "60": 125,
  "61": 243,
  "62": 7,
  "63": 0
};

// Convert the object values to a Uint8Array
const signatureUint8 = Uint8Array.from(Object.values(signatureObj) as number[]);

console.log('123: ', Buffer.from(Object.values(signatureObj)).toString('base64'));

// Convert the Uint8Array to a base58 string
const signatureString = bs58.encode(signatureUint8);

console.log("Signature string:", signatureString);
// You can now search for this signature string on the Solana Explorer:
// https://explorer.solana.com/tx/<signatureString>

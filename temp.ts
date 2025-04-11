import bs58 from 'bs58';

// Your signature from the transaction failure log (as an object)
const signatureObj = {
  "0": 1,
  "1": 56,
  "2": 50,
  "3": 68,
  "4": 16,
  "5": 165,
  "6": 142,
  "7": 196,
  "8": 132,
  "9": 227,
  "10": 25,
  "11": 130,
  "12": 85,
  "13": 2,
  "14": 56,
  "15": 143,
  "16": 203,
  "17": 216,
  "18": 106,
  "19": 151,
  "20": 141,
  "21": 115,
  "22": 164,
  "23": 94,
  "24": 181,
  "25": 121,
  "26": 128,
  "27": 28,
  "28": 194,
  "29": 13,
  "30": 102,
  "31": 132,
  "32": 234,
  "33": 120,
  "34": 223,
  "35": 249,
  "36": 242,
  "37": 76,
  "38": 138,
  "39": 127,
  "40": 202,
  "41": 98,
  "42": 210,
  "43": 239,
  "44": 155,
  "45": 33,
  "46": 240,
  "47": 116,
  "48": 137,
  "49": 233,
  "50": 97,
  "51": 35,
  "52": 44,
  "53": 130,
  "54": 155,
  "55": 221,
  "56": 228,
  "57": 30,
  "58": 16,
  "59": 18,
  "60": 16,
  "61": 193,
  "62": 4,
  "63": 15
};

// Convert the object values to a Uint8Array
const signatureUint8 = Uint8Array.from(Object.values(signatureObj) as number[]);

// Convert the Uint8Array to a base58 string
const signatureString = bs58.encode(signatureUint8);

console.log("Signature string:", signatureString);
// You can now search for this signature string on the Solana Explorer:
// https://explorer.solana.com/tx/<signatureString>

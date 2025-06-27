import bs58 from 'bs58';

// Your signature from the transaction failure log (as an object)
const signatureObj = {
  "0": 184,
  "1": 182,
  "2": 48,
  "3": 116,
  "4": 177,
  "5": 213,
  "6": 57,
  "7": 30,
  "8": 221,
  "9": 210,
  "10": 149,
  "11": 111,
  "12": 216,
  "13": 226,
  "14": 165,
  "15": 25,
  "16": 208,
  "17": 87,
  "18": 44,
  "19": 112,
  "20": 246,
  "21": 166,
  "22": 80,
  "23": 255,
  "24": 75,
  "25": 211,
  "26": 82,
  "27": 63,
  "28": 193,
  "29": 114,
  "30": 121,
  "31": 156,
  "32": 178,
  "33": 250,
  "34": 27,
  "35": 166,
  "36": 236,
  "37": 180,
  "38": 136,
  "39": 167,
  "40": 233,
  "41": 209,
  "42": 195,
  "43": 146,
  "44": 220,
  "45": 27,
  "46": 129,
  "47": 166,
  "48": 215,
  "49": 86,
  "50": 19,
  "51": 76,
  "52": 119,
  "53": 79,
  "54": 182,
  "55": 55,
  "56": 168,
  "57": 223,
  "58": 232,
  "59": 72,
  "60": 4,
  "61": 164,
  "62": 150,
  "63": 10
};

// Convert the object values to a Uint8Array
const signatureUint8 = Uint8Array.from(Object.values(signatureObj) as number[]);

// Convert the Uint8Array to a base58 string
const signatureString = bs58.encode(signatureUint8);

console.log("Signature string:", signatureString);
// You can now search for this signature string on the Solana Explorer:
// https://explorer.solana.com/tx/<signatureString>

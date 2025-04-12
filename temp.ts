import bs58 from 'bs58';

// Your signature from the transaction failure log (as an object)
const signatureObj = {
  "0": 26,
  "1": 1,
  "2": 234,
  "3": 80,
  "4": 23,
  "5": 232,
  "6": 26,
  "7": 192,
  "8": 200,
  "9": 192,
  "10": 119,
  "11": 141,
  "12": 203,
  "13": 132,
  "14": 146,
  "15": 37,
  "16": 188,
  "17": 70,
  "18": 23,
  "19": 87,
  "20": 19,
  "21": 227,
  "22": 2,
  "23": 255,
  "24": 207,
  "25": 65,
  "26": 90,
  "27": 205,
  "28": 236,
  "29": 241,
  "30": 250,
  "31": 115,
  "32": 8,
  "33": 45,
  "34": 31,
  "35": 159,
  "36": 114,
  "37": 51,
  "38": 189,
  "39": 184,
  "40": 147,
  "41": 143,
  "42": 126,
  "43": 150,
  "44": 44,
  "45": 152,
  "46": 145,
  "47": 121,
  "48": 243,
  "49": 92,
  "50": 242,
  "51": 174,
  "52": 203,
  "53": 23,
  "54": 195,
  "55": 242,
  "56": 95,
  "57": 255,
  "58": 120,
  "59": 208,
  "60": 110,
  "61": 184,
  "62": 95,
  "63": 13
};

// Convert the object values to a Uint8Array
const signatureUint8 = Uint8Array.from(Object.values(signatureObj) as number[]);

// Convert the Uint8Array to a base58 string
const signatureString = bs58.encode(signatureUint8);

console.log("Signature string:", signatureString);
// You can now search for this signature string on the Solana Explorer:
// https://explorer.solana.com/tx/<signatureString>

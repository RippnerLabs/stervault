import bs58 from 'bs58';

// Your signature from the transaction failure log (as an object)
const signatureObj = {
  "0": 242,
  "1": 83,
  "2": 149,
  "3": 247,
  "4": 188,
  "5": 253,
  "6": 224,
  "7": 148,
  "8": 78,
  "9": 127,
  "10": 64,
  "11": 118,
  "12": 173,
  "13": 51,
  "14": 59,
  "15": 167,
  "16": 26,
  "17": 105,
  "18": 138,
  "19": 168,
  "20": 230,
  "21": 36,
  "22": 219,
  "23": 201,
  "24": 26,
  "25": 145,
  "26": 94,
  "27": 121,
  "28": 243,
  "29": 100,
  "30": 158,
  "31": 167,
  "32": 117,
  "33": 173,
  "34": 192,
  "35": 114,
  "36": 198,
  "37": 168,
  "38": 8,
  "39": 111,
  "40": 250,
  "41": 50,
  "42": 178,
  "43": 246,
  "44": 136,
  "45": 73,
  "46": 44,
  "47": 191,
  "48": 126,
  "49": 201,
  "50": 18,
  "51": 216,
  "52": 122,
  "53": 188,
  "54": 19,
  "55": 156,
  "56": 238,
  "57": 6,
  "58": 251,
  "59": 35,
  "60": 120,
  "61": 164,
  "62": 217,
  "63": 6
};

// Convert the object values to a Uint8Array
const signatureUint8 = Uint8Array.from(Object.values(signatureObj) as number[]);

// Convert the Uint8Array to a base58 string
const signatureString = bs58.encode(signatureUint8);

console.log("Signature string:", signatureString);
// You can now search for this signature string on the Solana Explorer:
// https://explorer.solana.com/tx/<signatureString>

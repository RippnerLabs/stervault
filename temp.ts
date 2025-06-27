import bs58 from 'bs58';

// Your signature from the transaction failure log (as an object)
const signatureObj = {
  "0": 226,
  "1": 65,
  "2": 74,
  "3": 53,
  "4": 241,
  "5": 28,
  "6": 240,
  "7": 235,
  "8": 244,
  "9": 132,
  "10": 13,
  "11": 235,
  "12": 68,
  "13": 90,
  "14": 214,
  "15": 188,
  "16": 96,
  "17": 97,
  "18": 215,
  "19": 144,
  "20": 162,
  "21": 194,
  "22": 111,
  "23": 0,
  "24": 28,
  "25": 237,
  "26": 134,
  "27": 250,
  "28": 162,
  "29": 15,
  "30": 223,
  "31": 163,
  "32": 218,
  "33": 228,
  "34": 80,
  "35": 145,
  "36": 78,
  "37": 247,
  "38": 1,
  "39": 178,
  "40": 81,
  "41": 157,
  "42": 189,
  "43": 87,
  "44": 121,
  "45": 12,
  "46": 112,
  "47": 239,
  "48": 93,
  "49": 155,
  "50": 97,
  "51": 133,
  "52": 220,
  "53": 230,
  "54": 11,
  "55": 173,
  "56": 252,
  "57": 133,
  "58": 254,
  "59": 222,
  "60": 12,
  "61": 113,
  "62": 48,
  "63": 1
};

// Convert the object values to a Uint8Array
const signatureUint8 = Uint8Array.from(Object.values(signatureObj) as number[]);

// Convert the Uint8Array to a base58 string
const signatureString = bs58.encode(signatureUint8);

console.log("Signature string:", signatureString);
// You can now search for this signature string on the Solana Explorer:
// https://explorer.solana.com/tx/<signatureString>

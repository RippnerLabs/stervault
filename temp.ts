import bs58 from 'bs58';

// Your signature from the transaction failure log (as an object)
const signatureObj = {
  "0": 218,
  "1": 62,
  "2": 92,
  "3": 164,
  "4": 41,
  "5": 240,
  "6": 136,
  "7": 196,
  "8": 141,
  "9": 149,
  "10": 38,
  "11": 137,
  "12": 86,
  "13": 186,
  "14": 16,
  "15": 18,
  "16": 42,
  "17": 49,
  "18": 6,
  "19": 102,
  "20": 180,
  "21": 90,
  "22": 186,
  "23": 139,
  "24": 242,
  "25": 1,
  "26": 205,
  "27": 182,
  "28": 228,
  "29": 244,
  "30": 234,
  "31": 135,
  "32": 200,
  "33": 186,
  "34": 68,
  "35": 247,
  "36": 84,
  "37": 47,
  "38": 174,
  "39": 87,
  "40": 68,
  "41": 32,
  "42": 57,
  "43": 153,
  "44": 218,
  "45": 152,
  "46": 12,
  "47": 114,
  "48": 127,
  "49": 60,
  "50": 109,
  "51": 79,
  "52": 56,
  "53": 87,
  "54": 23,
  "55": 182,
  "56": 231,
  "57": 192,
  "58": 118,
  "59": 169,
  "60": 127,
  "61": 51,
  "62": 78,
  "63": 4
}

// Convert the object values to a Uint8Array
const signatureUint8 = Uint8Array.from(Object.values(signatureObj) as number[]);

// Convert the Uint8Array to a base58 string
const signatureString = bs58.encode(signatureUint8);

console.log("Signature string:", signatureString);
// You can now search for this signature string on the Solana Explorer:
// https://explorer.solana.com/tx/<signatureString>

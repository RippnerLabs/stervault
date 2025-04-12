import bs58 from 'bs58';

// Your signature from the transaction failure log (as an object)
const signatureObj = {
  "0": 239,
  "1": 62,
  "2": 0,
  "3": 41,
  "4": 126,
  "5": 0,
  "6": 69,
  "7": 199,
  "8": 104,
  "9": 121,
  "10": 116,
  "11": 87,
  "12": 38,
  "13": 78,
  "14": 23,
  "15": 120,
  "16": 109,
  "17": 3,
  "18": 181,
  "19": 114,
  "20": 218,
  "21": 65,
  "22": 165,
  "23": 191,
  "24": 252,
  "25": 133,
  "26": 151,
  "27": 178,
  "28": 96,
  "29": 18,
  "30": 25,
  "31": 207,
  "32": 16,
  "33": 90,
  "34": 50,
  "35": 188,
  "36": 35,
  "37": 9,
  "38": 155,
  "39": 130,
  "40": 97,
  "41": 59,
  "42": 49,
  "43": 58,
  "44": 191,
  "45": 89,
  "46": 194,
  "47": 241,
  "48": 247,
  "49": 194,
  "50": 134,
  "51": 194,
  "52": 150,
  "53": 79,
  "54": 121,
  "55": 172,
  "56": 5,
  "57": 147,
  "58": 172,
  "59": 124,
  "60": 251,
  "61": 93,
  "62": 5,
  "63": 9
};

// Convert the object values to a Uint8Array
const signatureUint8 = Uint8Array.from(Object.values(signatureObj) as number[]);

// Convert the Uint8Array to a base58 string
const signatureString = bs58.encode(signatureUint8);

console.log("Signature string:", signatureString);
// You can now search for this signature string on the Solana Explorer:
// https://explorer.solana.com/tx/<signatureString>

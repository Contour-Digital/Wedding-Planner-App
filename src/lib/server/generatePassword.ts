import { randomInt } from "crypto";

// Excludes visually ambiguous characters (0/O, 1/l/I) — this is meant to be
// read off a screen and typed or copy-pasted by hand into a phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generatePassword(length = 12) {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += ALPHABET[randomInt(ALPHABET.length)];
  }
  return password;
}

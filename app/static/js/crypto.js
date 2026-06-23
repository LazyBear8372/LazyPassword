// 영지식 클라이언트 암호 유틸 (Web Crypto API)
// 서버측 검증 스크립트와 파라미터가 반드시 일치해야 한다.

const PBKDF2_ITERATIONS = 600000;
const SALT_PREFIX = "lazypassword:";
const HKDF_SALT = new Uint8Array(32); // 32바이트 0
const KEY_LEN_BITS = 256;

const _enc = new TextEncoder();

function _bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function _base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// 마스터 키: PBKDF2(비번, "lazypassword:"+email) -> 32바이트
async function deriveMasterKey(password, email) {
  const baseKey = await crypto.subtle.importKey(
    "raw", _enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: _enc.encode(SALT_PREFIX + email),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    KEY_LEN_BITS
  );
  return new Uint8Array(bits);
}

// HKDF로 컨텍스트별 키 유도
async function _hkdf(masterKey, info) {
  const key = await crypto.subtle.importKey("raw", masterKey, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: HKDF_SALT, info: _enc.encode(info) },
    key,
    KEY_LEN_BITS
  );
  return new Uint8Array(bits);
}

// 서버로 보낼 인증값 (base64)
async function deriveAuthValue(password, email) {
  const masterKey = await deriveMasterKey(password, email);
  const auth = await _hkdf(masterKey, "auth");
  return _bufToBase64(auth);
}

// 볼트 암호화 키 (sessionStorage에 보관해 탭 세션 동안 사용)
async function deriveEncKey(password, email) {
  const masterKey = await deriveMasterKey(password, email);
  return await _hkdf(masterKey, "enc");
}

// --- encKey sessionStorage 보관 ---
const ENC_KEY_NAME = "lazypassword_enc_key";

function saveEncKey(encKeyBytes) {
  sessionStorage.setItem(ENC_KEY_NAME, _bufToBase64(encKeyBytes));
}

function loadEncKey() {
  const b64 = sessionStorage.getItem(ENC_KEY_NAME);
  return b64 ? _base64ToBytes(b64) : null;
}

function clearEncKey() {
  sessionStorage.removeItem(ENC_KEY_NAME);
}

// --- AES-GCM 항목 암복호화 ---
async function _importAesKey(encKeyBytes) {
  return crypto.subtle.importKey("raw", encKeyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

// 평문 객체 -> { ciphertext, nonce } (둘 다 base64)
async function encryptItem(encKeyBytes, obj) {
  const key = await _importAesKey(encKeyBytes);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const data = _enc.encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, data);
  return { ciphertext: _bufToBase64(ct), nonce: _bufToBase64(nonce) };
}

// { ciphertext, nonce } (base64) -> 평문 객체
async function decryptItem(encKeyBytes, ciphertext, nonce) {
  const key = await _importAesKey(encKeyBytes);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: _base64ToBytes(nonce) },
    key,
    _base64ToBytes(ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(pt));
}

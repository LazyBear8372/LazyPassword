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

// 볼트 암호화 키 (브라우저 메모리 전용, 볼트 기능에서 사용 예정)
async function deriveEncKey(password, email) {
  const masterKey = await deriveMasterKey(password, email);
  return await _hkdf(masterKey, "enc");
}

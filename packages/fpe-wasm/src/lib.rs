//! NIST SP 800-38G FF1 Format-Preserving Encryption
//!
//! This module provides a WebAssembly binding for the `fpe` crate,
//! implementing the FF1 algorithm as specified in NIST SP 800-38G.

use aes::Aes256;
use fpe::ff1::{FlexibleNumeralString, FF1};
use wasm_bindgen::prelude::*;

#[cfg(test)]
use wasm_bindgen_test::*;

const ALPHABET: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/// FF1 加密器 (AES-256)
#[wasm_bindgen]
pub struct FF1Cipher {
    inner: FF1<Aes256>,
    radix: u32,
}

#[wasm_bindgen]
impl FF1Cipher {
    /// 创建新的 FF1 加密器
    #[wasm_bindgen(constructor)]
    pub fn new(key: &[u8], radix: u32) -> Result<FF1Cipher, JsValue> {
        if key.len() != 32 {
            return Err(JsValue::from_str("Key must be 32 bytes for AES-256"));
        }

        if radix < 2 || radix > 36 {
            return Err(JsValue::from_str("Radix must be between 2 and 36"));
        }

        let inner = FF1::new(key, radix)
            .map_err(|e| JsValue::from_str(&format!("FF1 initialization failed: {:?}", e)))?;

        Ok(FF1Cipher { inner, radix })
    }

    /// 加密字节数组
    #[wasm_bindgen]
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, JsValue> {
        // 将 u8 转换为 u16
        let nums: Vec<u16> = plaintext.iter().map(|&b| b as u16).collect();
        let ns = FlexibleNumeralString::from(nums);

        // 使用空 tweak
        let tweak: &[u8] = &[];

        self.inner
            .encrypt(tweak, &ns)
            .map(|enc| {
                // 将 FlexibleNumeralString 转换回 Vec<u8>
                let vec_u16: Vec<u16> = enc.into();
                vec_u16.iter().map(|&v| v as u8).collect()
            })
            .map_err(|e| JsValue::from_str(&format!("Encryption failed: {:?}", e)))
    }

    /// 解密字节数组
    #[wasm_bindgen]
    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<Vec<u8>, JsValue> {
        // 将 u8 转换为 u16
        let nums: Vec<u16> = ciphertext.iter().map(|&b| b as u16).collect();
        let ns = FlexibleNumeralString::from(nums);

        // 使用空 tweak
        let tweak: &[u8] = &[];

        self.inner
            .decrypt(tweak, &ns)
            .map(|dec| {
                let vec_u16: Vec<u16> = dec.into();
                vec_u16.iter().map(|&v| v as u8).collect()
            })
            .map_err(|e| JsValue::from_str(&format!("Decryption failed: {:?}", e)))
    }

    /// 获取 radix
    #[wasm_bindgen(getter)]
    pub fn radix(&self) -> u32 {
        self.radix
    }
}

/// 加密字符串 (radix-36)
#[wasm_bindgen]
pub fn encrypt_string(cipher: &FF1Cipher, plaintext: &str) -> Result<String, JsValue> {
    let radix = cipher.radix() as usize;

    // 字符串转数字数组
    let nums: Vec<u8> = plaintext
        .chars()
        .map(|c| {
            let c_upper = c.to_ascii_uppercase() as u8;
            ALPHABET
                .iter()
                .position(|&b| b == c_upper)
                .filter(|&pos| pos < radix)
                .map(|pos| pos as u8)
                .ok_or_else(|| {
                    JsValue::from_str(&format!(
                        "Invalid character '{}' for radix {}",
                        c as char, radix
                    ))
                })
        })
        .collect::<Result<Vec<_>, _>>()?;

    // 加密
    let encrypted = cipher.encrypt(&nums)?;

    // 数字数组转字符串
    let result: String = encrypted
        .iter()
        .map(|&n| ALPHABET[n as usize] as char)
        .collect();

    Ok(result)
}

/// 解密字符串 (radix-36)
#[wasm_bindgen]
pub fn decrypt_string(cipher: &FF1Cipher, ciphertext: &str) -> Result<String, JsValue> {
    let radix = cipher.radix() as usize;

    // 字符串转数字数组
    let nums: Vec<u8> = ciphertext
        .chars()
        .map(|c| {
            let c_upper = c.to_ascii_uppercase() as u8;
            ALPHABET
                .iter()
                .position(|&b| b == c_upper)
                .filter(|&pos| pos < radix)
                .map(|pos| pos as u8)
                .ok_or_else(|| {
                    JsValue::from_str(&format!(
                        "Invalid character '{}' for radix {}",
                        c as char, radix
                    ))
                })
        })
        .collect::<Result<Vec<_>, _>>()?;

    // 解密
    let decrypted = cipher.decrypt(&nums)?;

    // 数字数组转字符串
    let result: String = decrypted
        .iter()
        .map(|&n| ALPHABET[n as usize] as char)
        .collect();

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[wasm_bindgen_test]
    fn test_ff1_cipher_new() {
        let key = [0u8; 32];
        let cipher = FF1Cipher::new(&key, 36).unwrap();
        assert_eq!(cipher.radix(), 36);
    }

    #[wasm_bindgen_test]
    fn test_ff1_cipher_new_with_different_radix() {
        let key = [1u8; 32];
        let cipher = FF1Cipher::new(&key, 10).unwrap();
        assert_eq!(cipher.radix(), 10);

        let cipher2 = FF1Cipher::new(&key, 2).unwrap();
        assert_eq!(cipher2.radix(), 2);
    }

    #[wasm_bindgen_test]
    fn test_encrypt_decrypt_bytes() {
        let key = [0u8; 32];
        let cipher = FF1Cipher::new(&key, 36).unwrap();
        let plaintext = vec![1, 2, 3, 4, 5, 6];
        let encrypted = cipher.encrypt(&plaintext).unwrap();
        let decrypted = cipher.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[wasm_bindgen_test]
    fn test_encrypt_decrypt_bytes_format_preserving() {
        let key = [42u8; 32];
        let cipher = FF1Cipher::new(&key, 36).unwrap();
        let plaintext = vec![1, 5, 10, 20, 30, 35];
        let encrypted = cipher.encrypt(&plaintext).unwrap();
        assert_eq!(encrypted.len(), plaintext.len());
        let decrypted = cipher.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[wasm_bindgen_test]
    fn test_encrypt_decrypt_string() {
        let key = [0u8; 32];
        let cipher = FF1Cipher::new(&key, 36).unwrap();
        let plaintext = "ABC123";
        let encrypted = encrypt_string(&cipher, plaintext).unwrap();
        let decrypted = decrypt_string(&cipher, &encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
        assert_eq!(encrypted.len(), plaintext.len());
    }

    #[wasm_bindgen_test]
    fn test_encrypt_string_deterministic() {
        let key = [0u8; 32];
        let cipher = FF1Cipher::new(&key, 36).unwrap();
        let plaintext = "XYZ789";
        let encrypted1 = encrypt_string(&cipher, plaintext).unwrap();
        let encrypted2 = encrypt_string(&cipher, plaintext).unwrap();
        assert_eq!(encrypted1, encrypted2);
    }

    #[wasm_bindgen_test]
    fn test_encrypt_string_different_inputs() {
        let key = [0u8; 32];
        let cipher = FF1Cipher::new(&key, 36).unwrap();
        let encrypted1 = encrypt_string(&cipher, "ABC123").unwrap();
        let encrypted2 = encrypt_string(&cipher, "ABC124").unwrap();
        assert_ne!(encrypted1, encrypted2);
    }

    #[wasm_bindgen_test]
    fn test_encrypt_string_valid_characters() {
        let key = [0u8; 32];
        let cipher = FF1Cipher::new(&key, 36).unwrap();
        let plaintext = "123456";
        let encrypted = encrypt_string(&cipher, plaintext).unwrap();
        for c in encrypted.chars() {
            assert!(c.is_ascii_digit() || (c.is_ascii_uppercase() && c <= 'Z'));
        }
    }

    #[wasm_bindgen_test]
    fn test_encrypt_string_case_insensitive_input() {
        let key = [0u8; 32];
        let cipher = FF1Cipher::new(&key, 36).unwrap();
        let encrypted_upper = encrypt_string(&cipher, "ABC123").unwrap();
        let encrypted_lower = encrypt_string(&cipher, "abc123").unwrap();
        assert_eq!(encrypted_upper, encrypted_lower);
    }

    #[wasm_bindgen_test]
    fn test_invalid_key_length() {
        let key = [0u8; 16];
        let result = FF1Cipher::new(&key, 36);
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn test_invalid_key_length_24() {
        let key = [0u8; 24];
        let result = FF1Cipher::new(&key, 36);
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn test_invalid_radix_too_low() {
        let key = [0u8; 32];
        let result = FF1Cipher::new(&key, 1);
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn test_invalid_radix_too_high() {
        let key = [0u8; 32];
        let result = FF1Cipher::new(&key, 37);
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn test_string_too_short() {
        let key = [0u8; 32];
        let cipher = FF1Cipher::new(&key, 36).unwrap();
        let result = encrypt_string(&cipher, "ABC");
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn test_string_invalid_character() {
        let key = [0u8; 32];
        let cipher = FF1Cipher::new(&key, 10).unwrap();
        let result = encrypt_string(&cipher, "ABC123");
        assert!(result.is_err());
    }

    #[wasm_bindgen_test]
    fn test_radix_10_digits_only() {
        let key = [0u8; 32];
        let cipher = FF1Cipher::new(&key, 10).unwrap();
        let plaintext = "123456";
        let encrypted = encrypt_string(&cipher, plaintext).unwrap();
        let decrypted = decrypt_string(&cipher, &encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
        for c in encrypted.chars() {
            assert!(c.is_ascii_digit());
        }
    }

    #[wasm_bindgen_test]
    fn test_radix_16_hex() {
        let key = [0u8; 32];
        let cipher = FF1Cipher::new(&key, 16).unwrap();
        let plaintext = "ABCDEF";
        let encrypted = encrypt_string(&cipher, plaintext).unwrap();
        let decrypted = decrypt_string(&cipher, &encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
        for c in encrypted.chars() {
            assert!(c.is_ascii_digit() || (c.is_ascii_uppercase() && c <= 'F'));
        }
    }
}

package com.aversa.admin.security;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

public class DataEncryptor {
    private static final String DEFAULT_KEY_ENV = "SECURITY_CRYPTO_KEY";
    private static final String DEFAULT_KEY_PROP = "security.crypto.key";
    private static volatile SecretKeySpec keySpec;
    private static final SecureRandom random = new SecureRandom();

    private static SecretKeySpec getKey() {
        if (keySpec == null) {
            synchronized (DataEncryptor.class) {
                if (keySpec == null) {
                    String key = System.getProperty(DEFAULT_KEY_PROP);
                    if (key == null || key.isBlank()) key = System.getenv(DEFAULT_KEY_ENV);
                    if (key == null || key.isBlank()) throw new IllegalStateException("Missing encryption key. Set security.crypto.key or SECURITY_CRYPTO_KEY");
                    byte[] kb = key.getBytes(StandardCharsets.UTF_8);
                    // Ensure 16/24/32 bytes for AES
                    byte[] normalized = new byte[32];
                    for (int i = 0; i < normalized.length; i++) normalized[i] = (i < kb.length) ? kb[i] : (byte) (i * 31);
                    keySpec = new SecretKeySpec(normalized, "AES");
                }
            }
        }
        return keySpec;
    }

    public static String encrypt(String plaintext) {
        if (plaintext == null) return null;
        try {
            byte[] iv = new byte[12];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, getKey(), new GCMParameterSpec(128, iv));
            byte[] ct = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(iv) + ":" + Base64.getEncoder().encodeToString(ct);
        } catch (Exception e) {
            throw new IllegalStateException("Encryption failure", e);
        }
    }

    public static String decrypt(String ciphertext) {
        if (ciphertext == null) return null;
        try {
            String[] parts = ciphertext.split(":", 2);
            if (parts.length != 2) return null;
            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] ct = Base64.getDecoder().decode(parts[1]);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, getKey(), new GCMParameterSpec(128, iv));
            byte[] pt = cipher.doFinal(ct);
            return new String(pt, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Decryption failure", e);
        }
    }

    public static String hmacSha256(String input) {
        if (input == null) return null;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(getKey().getEncoded(), "HmacSHA256"));
            byte[] h = mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(h.length * 2);
            for (byte b : h) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("HMAC failure", e);
        }
    }

    public static String normalizeEmail(String email){
        if (email == null) return null;
        return email.trim().toLowerCase();
    }

    public static String normalizePhone(String phone){
        if (phone == null) return null;
        return phone.replaceAll("[^0-9+]", "");
    }
}
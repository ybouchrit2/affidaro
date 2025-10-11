package com.aversa.admin.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

public class JwtUtil {
    private final Key key;
    private final long ttlMillis;

    public JwtUtil(String secret, long ttlMillis) {
        if (secret == null || secret.isBlank()) {
            secret = "change-this-secret-please"; // default unsafe, override in env
        }
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64(secret)));
        this.ttlMillis = ttlMillis <= 0 ? 8 * 60 * 60 * 1000L : ttlMillis; // default 8h
    }

    private String base64(String s){
        return java.util.Base64.getEncoder().encodeToString(s.getBytes());
    }

    public String createToken(String subject, Map<String, Object> claims) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusMillis(ttlMillis)))
                .addClaims(claims)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
    }
}
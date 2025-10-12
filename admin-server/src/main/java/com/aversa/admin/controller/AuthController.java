package com.aversa.admin.controller;

import com.aversa.admin.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final String adminUsername;
    private final String adminPasswordEncoded;

    public AuthController(
            JwtUtil jwtUtil,
            PasswordEncoder passwordEncoder,
            @Value("${admin.username:admin}") String adminUsername,
            @Value("${admin.password:admin123}") String adminPassword
    ) {
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.adminUsername = sanitizeUsername(adminUsername);
        this.adminPasswordEncoded = (isBcryptHash(adminPassword) || isIdPrefixedHash(adminPassword))
                ? adminPassword
                : passwordEncoder.encode(adminPassword);
    }

    static class LoginPayload { public String username; public String password; }

    @PostMapping(value = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> login(@RequestBody LoginPayload p, HttpServletRequest request){
        String ip = request.getRemoteAddr();
        String u = (p.username != null) ? p.username.trim() : "";
        String pw = (p.password != null) ? p.password : "";

        boolean userOk = adminUsername.equals(u);
        boolean passOk = StringUtils.hasText(pw) && passwordEncoder.matches(pw, adminPasswordEncoded);

        if(userOk && passOk){
            String token = jwtUtil.createToken(u, Map.of("role","ADMIN"));
            log.info("AUTH SUCCESS: user={} ip={} role=ADMIN", u, ip);
            return Map.of("status","ok","token", token);
        }
        log.warn("AUTH FAILED: user={} ip={} reason={}", u, ip, !userOk ? "bad_username" : "bad_password");
        throw new org.springframework.security.core.AuthenticationException("Invalid username or password") {};
    }

    private String sanitizeUsername(String input) {
        String cleaned = (input == null) ? "" : input.replaceAll("[^A-Za-z0-9._@-]", "");
        if (!StringUtils.hasText(cleaned)) {
            return "admin";
        }
        return cleaned;
    }

    private boolean isBcryptHash(String value) {
        return value != null && value.matches("^\\$2[aby]\\$[0-9]{2}\\$[A-Za-z0-9./]{53}$");
    }

    private boolean isIdPrefixedHash(String value) {
        return value != null && value.startsWith("{") && value.contains("}");
    }
}
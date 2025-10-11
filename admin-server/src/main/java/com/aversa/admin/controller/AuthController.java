package com.aversa.admin.controller;

import com.aversa.admin.security.JwtUtil;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    private final JwtUtil jwtUtil;

    public AuthController(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    static class LoginPayload { public String username; public String password; }

    @PostMapping(value = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> login(@RequestBody LoginPayload p){
        String adminUser = System.getenv().getOrDefault("ADMIN_USER", "admin");
        String adminPass = System.getenv().getOrDefault("ADMIN_PASS", "admin123");
        if(adminUser.equals(p.username) && adminPass.equals(p.password)){
            String token = jwtUtil.createToken(p.username, Map.of("role","ADMIN"));
            return Map.of("status","ok","token", token);
        }
        return Map.of("status","unauthorized");
    }
}
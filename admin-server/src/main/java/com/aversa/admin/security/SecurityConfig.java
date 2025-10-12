package com.aversa.admin.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${jwt.ttlMillis:28800000}")
    private long jwtTtlMillis;

    @Value("${allowed.origins:http://localhost,http://localhost:8001}")
    private String allowedOrigins;

    @Bean
    public JwtUtil jwtUtil(){
        return new JwtUtil(jwtSecret, jwtTtlMillis);
    }

    @Bean
    public JwtAuthFilter jwtAuthFilter(JwtUtil jwtUtil){
        return new JwtAuthFilter(jwtUtil);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(h -> h
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; " +
                                // Allow core CDNs for scripts
                                "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; " +
                                // Styles from jsDelivr, Google Fonts, Cloudflare CDNJS, and allow inline style attributes used by UI toggles
                                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://cdnjs.cloudflare.com https://www.gstatic.com; " +
                                // Fonts from Google Fonts, jsDelivr, and CDNJS (Font Awesome webfonts)
                                "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
                                // Images (including data URIs) and jsDelivr assets
                                "img-src 'self' data: https://cdn.jsdelivr.net; " +
                                // Allow XHR/fetch to self and jsDelivr (avoids sourcemap warnings and future API CDN use)
                                "connect-src 'self' https://cdn.jsdelivr.net; " +
                                "object-src 'none'; " +
                                "base-uri 'self'; " +
                                "frame-ancestors 'none'"
                        ))
                        .xssProtection(Customizer.withDefaults())
                        .frameOptions(fo -> fo.deny())
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/contact").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/visits").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/visits/stats").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        // صفحات عامة ومحتوى الموقع
                        .requestMatchers("/", "/index.html", "/home.html", "/landing.html", "/assets/**", "/sections/**", "/contact.html").permitAll()
                        // السماح بصفحة الدخول ومواردها فقط
                        .requestMatchers("/admin/login.html", "/admin/security.js", "/admin/admin.css", "/admin/admin.js").permitAll()
                        // حماية باقي صفحات الإدارة وواجهاتها
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        // حماية واجهات API الإدارية
                        .requestMatchers("/api/**").hasRole("ADMIN")
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization","Content-Type","X-Requested-With","Origin","Accept"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
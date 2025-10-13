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
import jakarta.annotation.PostConstruct;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${jwt.ttlMillis:28800000}")
    private long jwtTtlMillis;

    @Value("${allowed.origins:https://affidaro.com,https://www.affidaro.com,https://admin.affidaro.com}")
    private String allowedOrigins;

    @Value("${security.csp.allowUnsafeInline:false}")
    private boolean allowUnsafeInline;

    @Value("${security.crypto.key:}")
    private String cryptoKey;

    @Bean
    public JwtUtil jwtUtil(){
        return new JwtUtil(jwtSecret, jwtTtlMillis);
    }

    @PostConstruct
    public void initCryptoKey(){
        if (cryptoKey != null && !cryptoKey.isBlank()) {
            // Make the key available to non-Spring classes via system property
            System.setProperty("security.crypto.key", cryptoKey);
        }
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
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter, AuditLoggingFilter auditLoggingFilter) throws Exception {
        http
                .csrf(csrf -> csrf.csrfTokenRepository(org.springframework.security.web.csrf.CookieCsrfTokenRepository.withHttpOnlyFalse()))
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(h -> h
                        .contentSecurityPolicy(csp -> csp.policyDirectives(buildCspDirectives()))
                        .xssProtection(Customizer.withDefaults())
                        .frameOptions(fo -> fo.deny())
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/contact").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/visits").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/visits/stats").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        // Permit favicon and static resources
                        .requestMatchers("/favicon.ico").permitAll()
                        // صفحات عامة ومحتوى الموقع
                        .requestMatchers("/", "/index.html", "/home.html", "/landing.html", "/assets/**", "/sections/**", "/contact.html").permitAll()
                        // السماح بكافة صفحات وموارد الواجهة الإدارية (الحماية تتم على مستوى واجهات الـAPI)
                        .requestMatchers("/admin/**").permitAll()
                        // Restrict logs viewing to ADMIN only
                        .requestMatchers(HttpMethod.GET, "/api/logs/**").hasRole("ADMIN")
                        // حماية واجهات API: قراءة مسموحة لـ ADMIN/STAFF، والتعديل ADMIN فقط
                        .requestMatchers(HttpMethod.GET, "/api/**").hasAnyRole("ADMIN","STAFF")
                        .requestMatchers(HttpMethod.POST, "/api/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                // Block static resources when Origin is untrusted
                .addFilterBefore(staticResourceOriginFilter(), UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(auditLoggingFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private String buildCspDirectives(){
        StringBuilder sb = new StringBuilder();
        sb.append("default-src 'self'; ");
        // Scripts from self and trusted CDNs only; avoid unsafe-inline unless explicitly allowed for dev
        sb.append("script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com");
        if (allowUnsafeInline) sb.append(" 'unsafe-inline'");
        sb.append("; ");
        // Styles from self and jsDelivr; avoid unsafe-inline unless explicitly allowed for dev
        sb.append("style-src 'self' https://cdn.jsdelivr.net");
        if (allowUnsafeInline) sb.append(" 'unsafe-inline'");
        sb.append("; ");
        // Fonts from self and Google Fonts only (restrictive)
        sb.append("font-src 'self' https://fonts.gstatic.com; ");
        // Images and data URIs
        sb.append("img-src 'self' data:; ");
        // Allow XHR/fetch to same origin only
        sb.append("connect-src 'self'; ");
        // Harden other directives
        sb.append("object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
        return sb.toString();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization","Content-Type","X-Requested-With","Origin","Accept","X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    @Bean
    public StaticResourceOriginFilter staticResourceOriginFilter() {
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        return new StaticResourceOriginFilter(origins);
    }
}
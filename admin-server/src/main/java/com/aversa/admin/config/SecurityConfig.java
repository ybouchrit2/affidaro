package com.aversa.admin.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    public PasswordEncoder passwordEncoder() {
        // DelegatingPasswordEncoder supports {id} format and common encoders
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(
            PasswordEncoder encoder,
            @Value("${admin.username:admin}") String adminUsername,
            @Value("${admin.password:admin123}") String adminPassword
    ) {
        String rawUsername = StringUtils.hasText(adminUsername) ? adminUsername.trim() : "admin";
        String sanitizedUsername = sanitizeUsername(rawUsername);
        String password = StringUtils.hasText(adminPassword) ? adminPassword : "admin123";

        try {
            String finalPassword = (isBcryptHash(password) || isIdPrefixedHash(password))
                    ? password
                    : encoder.encode(password);

            UserDetails admin = User
                    .withUsername(sanitizedUsername)
                    // Use pre-encoded or encoder output; do not double-encode
                    .password(finalPassword)
                    .roles("ADMIN")
                    .build();
            return new InMemoryUserDetailsManager(admin);
        } catch (RuntimeException ex) {
            // Fallback to safe defaults if provided values are invalid
            log.warn("Invalid admin credentials provided. Falling back to defaults. Cause: {}", ex.getMessage());
            UserDetails fallback = User
                    .withUsername("admin")
                    .password(encoder.encode("admin123"))
                    .roles("ADMIN")
                    .build();
            return new InMemoryUserDetailsManager(fallback);
        }
    }

    private String sanitizeUsername(String input) {
        // Allow common username characters; strip anything problematic
        String cleaned = input.replaceAll("[^A-Za-z0-9._@-]", "");
        if (!StringUtils.hasText(cleaned)) {
            return "admin";
        }
        return cleaned;
    }

    private boolean isBcryptHash(String value) {
        // Basic BCrypt hash pattern: $2a$, $2b$, or $2y$
        return value != null && value.matches("^\\$2[aby]\\$[0-9]{2}\\$[A-Za-z0-9./]{53}$");
    }

    private boolean isIdPrefixedHash(String value) {
        // Spring {id} format, e.g., {bcrypt}...
        return value != null && value.startsWith("{") && value.contains("}");
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // السماح بنقاط POST العامة بدون CSRF، واستثناء مسار تسجيل الدخول والخروج
                .csrf(csrf -> csrf
                        .ignoringRequestMatchers(
                                new AntPathRequestMatcher("/api/contact"),
                                new AntPathRequestMatcher("/api/visits"),
                                new AntPathRequestMatcher("/login"),
                                new AntPathRequestMatcher("/logout")
                        )
                )
                .authorizeHttpRequests(auth -> auth
                        // السماح بصفحة الدخول والموارد العامة
                        .requestMatchers("/admin/login.html").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/contact", "/api/visits").permitAll()
                        // السماح بقراءة إحصائيات الزيارات للعامة
                        .requestMatchers(HttpMethod.GET, "/api/visits/stats").permitAll()
                        // حماية قراءات لوحة الإدارة
                        .requestMatchers("/api/contact/recent").hasRole("ADMIN")
                        // حماية صفحات/ملفات الإدارة
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        .anyRequest().permitAll()
                )
                .formLogin(form -> form
                        .loginPage("/admin/login.html")
                        .loginProcessingUrl("/login")
                        .defaultSuccessUrl("/admin/index.html", true)
                        .permitAll()
                )
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/admin/login.html?logout")
                        .permitAll()
                )
                .httpBasic(Customizer.withDefaults());

        return http.build();
    }
}
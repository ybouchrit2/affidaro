package com.aversa.admin.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.util.StringUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(
            PasswordEncoder encoder,
            @Value("${admin.username:admin}") String adminUsername,
            @Value("${admin.password:admin123}") String adminPassword
    ) {
        String username = StringUtils.hasText(adminUsername) ? adminUsername.trim() : "admin";
        String password = StringUtils.hasText(adminPassword) ? adminPassword : "admin123";

        UserDetails admin = User
                .withUsername(username)
                .passwordEncoder(encoder::encode)
                .password(password)
                .roles("ADMIN")
                .build();
        return new InMemoryUserDetailsManager(admin);
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
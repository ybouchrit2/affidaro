package com.aversa.admin.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Restricts access to static resources when the request originates from a non-approved Origin.
 * Direct navigations (no Origin header) are allowed; cross-origin fetches must match allowed origins.
 */
public class StaticResourceOriginFilter extends OncePerRequestFilter {

    private final Set<String> allowedOrigins;

    public StaticResourceOriginFilter(List<String> allowedOrigins) {
        this.allowedOrigins = new HashSet<>();
        if (allowedOrigins != null) {
            for (String o : allowedOrigins) {
                String trimmed = o == null ? null : o.trim();
                if (trimmed != null && !trimmed.isEmpty()) {
                    this.allowedOrigins.add(trimmed);
                }
            }
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();
        boolean isStatic = "/favicon.ico".equals(path) || path.startsWith("/assets/") || path.startsWith("/sections/");

        if (isStatic && "GET".equalsIgnoreCase(method)) {
            String origin = request.getHeader("Origin");
            // Allow direct navigations (no Origin header), but enforce allowed origins for cross-origin requests
            if (origin != null && !allowedOrigins.contains(origin)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write("Forbidden origin for static resource");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
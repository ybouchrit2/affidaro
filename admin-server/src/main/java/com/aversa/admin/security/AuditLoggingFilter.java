package com.aversa.admin.security;

import com.aversa.admin.model.InteractionLog;
import com.aversa.admin.model.User;
import com.aversa.admin.model.Client;
import com.aversa.admin.repository.InteractionLogRepository;
import com.aversa.admin.repository.UserRepository;
import com.aversa.admin.repository.ClientRepository;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class AuditLoggingFilter extends OncePerRequestFilter {

    private final InteractionLogRepository logRepo;
    private final UserRepository userRepo;
    private final ClientRepository clientRepo;
    private final MeterRegistry meterRegistry;
    private static final Pattern ID_PATTERN = Pattern.compile(".*/(\\d+)(/.*)?$");

    public AuditLoggingFilter(InteractionLogRepository logRepo, UserRepository userRepo, ClientRepository clientRepo, MeterRegistry meterRegistry) {
        this.logRepo = logRepo;
        this.userRepo = userRepo;
        this.clientRepo = clientRepo;
        this.meterRegistry = meterRegistry;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String method = request.getMethod();
        String path = request.getRequestURI();
        boolean isModify = "POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method);
        boolean isPublicGet = "GET".equalsIgnoreCase(method) && (
                "/".equals(path) || "/index.html".equals(path) || "/home.html".equals(path) || "/landing.html".equals(path) || "/contact.html".equals(path) ||
                "/favicon.ico".equals(path) || path.startsWith("/assets/") || path.startsWith("/sections/") || path.startsWith("/admin/") ||
                "/api/visits/stats".equals(path)
        );
        boolean isSensitiveGet = "GET".equalsIgnoreCase(method) && path.startsWith("/api/") && (
                path.startsWith("/api/clients") || path.startsWith("/api/agreements") || path.startsWith("/api/contracts") ||
                path.startsWith("/api/logs") || path.startsWith("/api/analytics") || path.startsWith("/api/communications") ||
                path.contains("/payout") || path.contains("/export") || path.contains("/admin-change")
        );
        filterChain.doFilter(request, response);
        if (!(isModify && path.startsWith("/api/")) && !isPublicGet && !isSensitiveGet) {
            return;
        }
        try {
            InteractionLog log = new InteractionLog();
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String userName = (auth != null) ? String.valueOf(auth.getPrincipal()) : "anonymous";
            log.setUserName(userName);
            if (auth != null && auth.getPrincipal() != null) {
                try {
                    User u = userRepo.findByUsernameIgnoreCase(String.valueOf(auth.getPrincipal()));
                    if (u != null) {
                        log.setUser(u);
                    }
                } catch (Exception ignored) {}
            }
            log.setTimestamp(Instant.now());
            log.setChannel("web");
            // Derive action from method and path for clarity
            String action = method.toLowerCase();
            if (path.contains("/cancel")) action = "cancel";
            else if (path.contains("/close")) action = "close";
            else if ("POST".equalsIgnoreCase(method)) action = "create";
            else if ("PUT".equalsIgnoreCase(method)) action = "update";
            else if ("DELETE".equalsIgnoreCase(method)) action = "delete";
            // Derive target type from path segment
            String[] parts = path.split("/");
            String targetType = parts.length >= 3 ? parts[2] : "unknown";
            // Normalize to domain names
            if ("clients".equalsIgnoreCase(targetType)) targetType = "Customer";
            else if ("agreements".equalsIgnoreCase(targetType)) targetType = "Contract";
            else if ("contracts".equalsIgnoreCase(targetType)) targetType = "Contract";
            else if (path.contains("/payout")) targetType = "payout";
            else if (path.contains("/export")) {
                // if exporting contracts, keep domain naming for clarity
                targetType = path.contains("agreements") || path.contains("contracts") ? "Contract" : "export";
            }
            else if (path.contains("/admin-change")) targetType = "admin-change";
            log.setTargetType(targetType);
            // Try to extract numeric ID from path
            Matcher m = ID_PATTERN.matcher(path);
            if (m.matches()) {
                try { log.setTargetId(Long.parseLong(m.group(1))); } catch (NumberFormatException ignored) {}
            }
            // Link to client entity if target is customer and id exists
            if ("Customer".equalsIgnoreCase(targetType) && log.getTargetId() != null) {
                try {
                    Client client = clientRepo.findById(log.getTargetId()).orElse(null);
                    if (client != null) {
                        log.setClient(client);
                    }
                } catch (Exception ignored) {}
            }
            log.setNotes(isPublicGet ? "public-get" : (isSensitiveGet ? "sensitive-read" : "auto-log"));
            boolean ok = response.getStatus() >= 200 && response.getStatus() < 300;
            // Classify failed auth/CSRF specifically on modifying endpoints
            if (!ok && isModify && path.startsWith("/api/")) {
                String xsrf = request.getHeader("X-XSRF-TOKEN");
                String authHeader = request.getHeader("Authorization");
                if (response.getStatus() == 401 || authHeader == null || authHeader.isBlank()) {
                    action = "failed_auth";
                } else if (response.getStatus() == 403 && (xsrf == null || xsrf.isBlank())) {
                    action = "csrf_fail";
                } else if (response.getStatus() == 403 && "DELETE".equalsIgnoreCase(method)) {
                    // Authorization failed on delete while CSRF token was present
                    action = "unauthorized_delete";
                }
            }
            // Normalize action to explicit domain combos for clearer alerts
            String actionForLog = action;
            if ("delete".equalsIgnoreCase(action) && "Customer".equalsIgnoreCase(log.getTargetType())) {
                actionForLog = "DELETE_CUSTOMER";
            } else if ("close".equalsIgnoreCase(action) && "Contract".equalsIgnoreCase(log.getTargetType())) {
                actionForLog = "CLOSE_CONTRACT";
            } else if ("create".equalsIgnoreCase(action) && "Customer".equalsIgnoreCase(log.getTargetType())) {
                actionForLog = "CREATE_CUSTOMER";
            } else if ("update".equalsIgnoreCase(action) && "Contract".equalsIgnoreCase(log.getTargetType())) {
                actionForLog = "UPDATE_CONTRACT";
            } else if ("unauthorized_delete".equalsIgnoreCase(action)) {
                actionForLog = "UNAUTHORIZED_DELETE";
            } else if ("failed_auth".equalsIgnoreCase(action)) {
                actionForLog = "FAILED_AUTH";
            } else if ("csrf_fail".equalsIgnoreCase(action)) {
                actionForLog = "CSRF_FAIL";
            }
            // Export detection: if path contains /export on contracts, mark explicit action
            if ("GET".equalsIgnoreCase(method) && path.startsWith("/api/") && path.contains("/export") && (path.contains("agreements") || path.contains("contracts"))) {
                actionForLog = "EXPORT_CONTRACTS";
            }
            log.setAction(actionForLog);
            String outcomeLabel = ok ? "success" : "error";
            log.setOutcome(ok ? "success" : "error:" + response.getStatus());
            // If export count header is present, attach to notes
            String exportCount = response.getHeader("X-Export-Count");
            if (exportCount != null && !exportCount.isBlank() && "EXPORT_CONTRACTS".equals(actionForLog)) {
                String prev = log.getNotes() == null ? "" : log.getNotes();
                log.setNotes((prev + (prev.isBlank()?"":"; ") + "export_count=" + exportCount).trim());
            }
            logRepo.save(log);
            // Metrics
            try {
                meterRegistry.counter(
                        "app_activity_total",
                        "action", actionForLog,
                        "target_type", targetType,
                        "outcome", outcomeLabel
                ).increment();
                if (!ok && isModify) {
                    String uid = (log.getUser() != null && log.getUser().getId() != null) ? String.valueOf(log.getUser().getId()) : "unknown";
                    meterRegistry.counter(
                            "app_failed_mod_attempts_total",
                            "user_id", uid,
                            "user_name", userName
                    ).increment();
                }
                if (response.getStatus() >= 500) {
                    meterRegistry.counter(
                            "app_http_error_total",
                            "status", String.valueOf(response.getStatus())
                    ).increment();
                }
            } catch (Exception ignored) {}
        } catch (Exception ignored) {
            // Avoid breaking the request flow if logging fails
        }
    }
}
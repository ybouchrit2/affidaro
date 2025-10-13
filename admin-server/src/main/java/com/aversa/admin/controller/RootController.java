package com.aversa.admin.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class RootController {
    @GetMapping("/")
    public String root() {
        // Serve public site at root; admin remains under /admin
        return "forward:/index.html";
    }

    @GetMapping("/admin")
    public String adminRoot() {
        // Serve admin UI when hitting /admin
        return "forward:/admin/index.html";
    }

    @GetMapping("/admin/dashboard.html")
    public String adminDashboardForward() {
        // Forward legacy admin path to actual dashboard location
        return "forward:/dashboard.html";
    }

    @GetMapping("/favicon.ico")
    public String faviconForward() {
        // Forward favicon to existing PNG asset to avoid 500 when ico missing
        return "forward:/assets/images/logowithouttitle.png";
    }
}
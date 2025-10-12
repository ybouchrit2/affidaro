package com.aversa.admin.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class RootController {
    @GetMapping("/")
    public String root() {
        // Serve admin login as the root page on the admin service
        return "forward:/admin/login.html";
    }
}
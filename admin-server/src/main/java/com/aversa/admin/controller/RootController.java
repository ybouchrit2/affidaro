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
}
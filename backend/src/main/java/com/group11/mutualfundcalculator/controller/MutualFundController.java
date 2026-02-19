package com.group11.mutualfundcalculator.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mutual-funds")
@CrossOrigin(origins = "http://localhost:3000")
public class MutualFundController {

    @GetMapping("/health")
    public String healthCheck() {
        return "Mutual Fund Calculator API is running";
    }

    // TODO: GET /api/mutual-funds - return list of mutual funds
    // TODO: GET /api/mutual-funds/calculate - calculate future value
}

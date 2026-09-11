package com.vexsa.wealth.settings;

import com.vexsa.wealth.settings.dto.UserSettingsRequest;
import com.vexsa.wealth.settings.dto.UserSettingsResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class UserSettingsController {

    private final UserSettingsService userSettingsService;

    @GetMapping
    public UserSettingsResponse get() {
        return userSettingsService.get();
    }

    @PutMapping
    public UserSettingsResponse update(@Valid @RequestBody UserSettingsRequest request) {
        return userSettingsService.update(request);
    }
}

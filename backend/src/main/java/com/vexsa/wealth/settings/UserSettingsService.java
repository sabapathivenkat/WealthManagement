package com.vexsa.wealth.settings;

import com.vexsa.wealth.common.CurrentUser;
import com.vexsa.wealth.settings.dto.UserSettingsRequest;
import com.vexsa.wealth.settings.dto.UserSettingsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserSettingsService {

    private final UserSettingsRepository userSettingsRepository;
    private final CurrentUser currentUser;

    public UserSettingsResponse get() {
        UserSettings settings = findOrCreate();
        return toResponse(settings);
    }

    public UserSettingsResponse update(UserSettingsRequest request) {
        UserSettings settings = findOrCreate();
        settings.setCurrency(request.currency());
        settings.setFyStartMonth(request.fyStartMonth());
        settings.setDefaultDebtStrategy(request.defaultDebtStrategy());
        userSettingsRepository.save(settings);
        return toResponse(settings);
    }

    private UserSettings findOrCreate() {
        return userSettingsRepository.findById(currentUser.id()).orElseGet(() -> {
            UserSettings settings = new UserSettings();
            settings.setUserId(currentUser.id());
            return userSettingsRepository.save(settings);
        });
    }

    private UserSettingsResponse toResponse(UserSettings s) {
        return new UserSettingsResponse(s.getCurrency(), s.getFyStartMonth(), s.getDefaultDebtStrategy());
    }
}

package com.vexsa.wealth.dashboard;

import com.vexsa.wealth.dashboard.dto.DashboardResponse;
import com.vexsa.wealth.dashboard.dto.YearlySummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Year;
import java.time.YearMonth;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public DashboardResponse summary(@RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return dashboardService.summary(month != null ? month : YearMonth.now());
    }

    @GetMapping("/yearly")
    public YearlySummaryResponse yearly(@RequestParam(required = false) Integer year) {
        return dashboardService.yearly(year != null ? Year.of(year) : currentFinancialYear());
    }

    /** Indian FY runs April-March; before April, the current FY started the previous calendar year. */
    private Year currentFinancialYear() {
        YearMonth now = YearMonth.now();
        return Year.of(now.getMonthValue() >= 4 ? now.getYear() : now.getYear() - 1);
    }
}

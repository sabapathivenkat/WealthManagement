package com.vexsa.wealth.goal;

import com.vexsa.wealth.goal.dto.GoalProgressResponse;
import com.vexsa.wealth.goal.dto.GoalRequest;
import com.vexsa.wealth.goal.dto.GoalResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
public class GoalController {

    private final GoalService goalService;

    @GetMapping
    public List<GoalResponse> list() {
        return goalService.list();
    }

    @PostMapping
    public ResponseEntity<GoalResponse> create(@Valid @RequestBody GoalRequest request) {
        return ResponseEntity.ok(goalService.create(request));
    }

    @PutMapping("/{id}")
    public GoalResponse update(@PathVariable Long id, @Valid @RequestBody GoalRequest request) {
        return goalService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        goalService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/progress")
    public GoalProgressResponse progress(@PathVariable Long id) {
        return goalService.progress(id);
    }
}

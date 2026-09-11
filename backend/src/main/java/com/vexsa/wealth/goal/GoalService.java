package com.vexsa.wealth.goal;

import com.vexsa.wealth.common.CurrentUser;
import com.vexsa.wealth.common.ResourceNotFoundException;
import com.vexsa.wealth.goal.dto.GoalProgressResponse;
import com.vexsa.wealth.goal.dto.GoalRequest;
import com.vexsa.wealth.goal.dto.GoalResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GoalService {

    private final GoalRepository goalRepository;
    private final CurrentUser currentUser;

    public List<GoalResponse> list() {
        return goalRepository.findByUserId(currentUser.id()).stream().map(this::toResponse).toList();
    }

    public GoalResponse create(GoalRequest request) {
        Goal goal = new Goal();
        goal.setUserId(currentUser.id());
        applyRequest(goal, request);
        goalRepository.save(goal);
        return toResponse(goal);
    }

    public GoalResponse update(Long id, GoalRequest request) {
        Goal goal = findOwned(id);
        applyRequest(goal, request);
        goalRepository.save(goal);
        return toResponse(goal);
    }

    public void delete(Long id) {
        goalRepository.delete(findOwned(id));
    }

    public GoalProgressResponse progress(Long id) {
        Goal goal = findOwned(id);

        BigDecimal remaining = goal.getTargetAmount().subtract(goal.getCurrentAmount()).max(BigDecimal.ZERO);
        long monthsRemaining = Math.max(1, ChronoUnit.MONTHS.between(LocalDate.now(), goal.getTargetDate()));
        BigDecimal requiredMonthlySaving = remaining.divide(BigDecimal.valueOf(monthsRemaining), 2, RoundingMode.HALF_UP);
        BigDecimal percentComplete = goal.getTargetAmount().signum() == 0
                ? BigDecimal.ZERO
                : goal.getCurrentAmount().multiply(BigDecimal.valueOf(100))
                        .divide(goal.getTargetAmount(), 2, RoundingMode.HALF_UP)
                        .min(BigDecimal.valueOf(100));

        return new GoalProgressResponse(remaining, monthsRemaining, requiredMonthlySaving, percentComplete);
    }

    private void applyRequest(Goal goal, GoalRequest request) {
        goal.setName(request.name());
        goal.setTargetAmount(request.targetAmount());
        goal.setTargetDate(request.targetDate());
        goal.setCurrentAmount(request.currentAmount());
    }

    private Goal findOwned(Long id) {
        Goal goal = goalRepository.findByIdAndUserId(id, currentUser.id());
        if (goal == null) {
            throw new ResourceNotFoundException("Goal not found");
        }
        return goal;
    }

    private GoalResponse toResponse(Goal g) {
        return new GoalResponse(g.getId(), g.getName(), g.getTargetAmount(), g.getTargetDate(), g.getCurrentAmount());
    }
}

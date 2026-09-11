package com.vexsa.wealth.category;

import com.vexsa.wealth.category.dto.CategoryRequest;
import com.vexsa.wealth.category.dto.CategoryResponse;
import com.vexsa.wealth.common.CategoryKind;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public List<CategoryResponse> list(@RequestParam(required = false) CategoryKind kind,
                                        @RequestParam(required = false, defaultValue = "false") boolean includeInactive) {
        return categoryService.list(kind, includeInactive);
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.create(request));
    }

    @PutMapping("/{id}")
    public CategoryResponse update(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return categoryService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> archive(@PathVariable Long id) {
        categoryService.archive(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    public CategoryResponse restore(@PathVariable Long id) {
        return categoryService.restore(id);
    }
}

package com.vexsa.wealth.category;

import com.vexsa.wealth.category.dto.CategoryRequest;
import com.vexsa.wealth.category.dto.CategoryResponse;
import com.vexsa.wealth.common.CategoryKind;
import com.vexsa.wealth.common.CurrentUser;
import com.vexsa.wealth.common.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CurrentUser currentUser;

    public List<CategoryResponse> list(CategoryKind kind, boolean includeInactive) {
        List<Category> categories = categoryRepository.findByUserIdIsNullOrUserId(currentUser.id());
        return categories.stream()
                .filter(c -> kind == null || c.getKind() == kind)
                .filter(c -> includeInactive || c.isActive())
                .map(this::toResponse)
                .toList();
    }

    public CategoryResponse create(CategoryRequest request) {
        Category category = new Category();
        category.setUserId(currentUser.id());
        category.setName(request.name());
        category.setKind(request.kind());
        category.setDefault(false);
        category.setActive(true);
        categoryRepository.save(category);
        return toResponse(category);
    }

    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = findVisible(id);
        category.setName(request.name());
        categoryRepository.save(category);
        return toResponse(category);
    }

    public void archive(Long id) {
        Category category = findVisible(id);
        category.setActive(false);
        categoryRepository.save(category);
    }

    public CategoryResponse restore(Long id) {
        Category category = findVisible(id);
        category.setActive(true);
        categoryRepository.save(category);
        return toResponse(category);
    }

    public Map<Long, String> nameMap() {
        return categoryRepository.findByUserIdIsNullOrUserId(currentUser.id()).stream()
                .collect(java.util.stream.Collectors.toMap(Category::getId, Category::getName));
    }

    /**
     * A category is "visible" (and therefore editable/archivable) if it's a shared default or
     * belongs to the current user. Categories have no per-user cloning, so editing a shared
     * default renames/archives it for every user — acceptable for this single-tenant deployment.
     */
    private Category findVisible(Long id) {
        Category category = categoryRepository.findById(id).orElse(null);
        if (category == null || (category.getUserId() != null && !category.getUserId().equals(currentUser.id()))) {
            throw new ResourceNotFoundException("Category not found");
        }
        return category;
    }

    private CategoryResponse toResponse(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getKind(), c.isDefault(), c.isActive());
    }
}

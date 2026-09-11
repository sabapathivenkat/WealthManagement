package com.vexsa.wealth.category;

import com.vexsa.wealth.common.CategoryKind;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByUserIdIsNullOrUserId(Long userId);

    List<Category> findByKindAndUserIdIsNullOrKindAndUserId(CategoryKind kind1, Long userId1, CategoryKind kind2, Long userId2);

    Category findByIdAndUserId(Long id, Long userId);
}

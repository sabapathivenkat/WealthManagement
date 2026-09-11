package com.vexsa.wealth.common;

import com.vexsa.wealth.user.User;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {

    public User get() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public Long id() {
        return get().getId();
    }
}

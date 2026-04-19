---
name: frontend-development-standards
description: Apply consistent frontend conventions for React, Vue, and Node.js projects. Use for component/file naming, folder organization, or CSS/BEM standards.
license: MIT
---

# Frontend Development Standards Skill

## Overview

Use this skill when naming and organizing frontend components, services, and files in React, Vue, Node.js, or similar frameworks. This workflow ensures consistency across files, directories, and team codebases.

## Naming Principles

**Core Rules**

1. **Semantic & Clear** – Names should describe functionality or purpose, not implementation
2. **Consistency** – Unified style within project/team (casing rules, word connection patterns)
3. **Modularity** – Names reflect module structure for easy location and reuse
4. **Avoid Abbreviations** – Use full words unless industry-standard (e.g., `ID`, `API`)
5. **Simplicity** – Concise but expressive; avoid unnecessary prefixes
6. **International** – Use English in code; add Chinese comments/docs as needed
7. **Framework Conventions** – Follow React, Vue, Node.js naming patterns

## Naming Reference Table

| Category                      | Style                        | Example                                                        | Notes                                                                 |
| :---------------------------- | :--------------------------- | :------------------------------------------------------------- | :-------------------------------------------------------------------- |
| Variables, functions, methods | `camelCase`                  | `userName`, `getUserInfo()`, `isEmpty`                         | Vars = nouns; functions = verb-first. Booleans: `is*`, `has*`, `can*` |
| Classes, constructors         | `PascalCase`                 | `class UserModel {}`, `function Car() {}`                      | Nouns; indicates "type" or "instance factory"                         |
| Constants                     | `UPPER_SNAKE_CASE`           | `const API_BASE_URL = '...'`, `const MAX_COUNT = 100`          | Immutable values in app lifecycle                                     |
| Files (non-component)         | `kebab-case`                 | `user-service.js`, `date-utils.js`, `main.css`                 | Web convention; URL/file safe                                         |
| Components (React/Vue)        | `PascalCase`                 | `<UserProfile />`, `<NavigationMenu />`                        | Matches class naming; reusable UI unit                                |
| Component files               | `PascalCase`                 | `UserCard.vue`, `Button.jsx`, `Modal.tsx`                      | **File name = component name**; suffix per framework                  |
| Directories/folders           | `kebab-case`                 | `src/`, `components/`, `assets/images/`                        | Lowercase + hyphens; plural for collections (`components`)            |
| CSS class names, IDs          | `kebab-case`                 | `.primary-button`, `#user-avatar`, `.block__element--modifier` | Aligns with BEM or similar strategies                                 |
| Private members (convention)  | `_camelCase`                 | `this._internalValue`, `_privateMethod()`                      | Underscore prefix = "do not access externally"; not language-enforced |
| Enums                         | `UPPER_SNAKE_CASE` (members) | `Status.SUCCESS`, `Role.ADMIN`                                 | TS: enum name = `PascalCase`; member = `UPPER_SNAKE_CASE`             |
| Types, interfaces (TS)        | `PascalCase`                 | `interface UserProps {}`, `type ApiResponse = {...}`           | Custom type structures                                                |
| Event handlers                | `camelCase`                  | `handleButtonClick`, `onUserLogin`                             | Start with `handle` or `on`; clear event + action                     |
| Higher-order components (HOC) | `PascalCase`                 | `withAuth`, `withLoading`                                      | React-specific; start with `with`; describe feature                   |
| Custom Hooks                  | `camelCase`                  | `useUserData`, `useFetchApi`                                   | React-specific; start with `use`; describe Hook purpose               |

## Component Naming Rules

### General Principles

**Naming Format**

- Use `PascalCase`: `UserProfileCard`, `NavigationMenu`
- Semantic: clearly describe functionality/purpose; prefer nouns/noun phrases
    - ✓ `UserProfileCard` (user summary card)
    - ✗ `Card` (too generic, lacks context)

**Singular vs. Plural**

- Single entity: `TodoItem`
- Collection/list: `TodoList`

**Avoid Redundant Suffixes**

- ✓ `Button`, `Modal`
- ✗ `ButtonComponent`, `ModalWidget`

### Framework-Specific Patterns

**React**

- Function and class components: both use `PascalCase`
- HOCs (High-Order Components): start with `with`
    - Examples: `withAuth`, `withLoading`

**Vue**

- Component names: `PascalCase` in code; use `kebab-case` in templates
    - Example: `<user-profile-card />`

### Component File Organization

**Per-Component Directory** (Recommended for larger projects)

```txt
components/UserProfileCard/
  UserProfileCard.jsx
  UserProfileCard.scss
  UserProfileCard.test.jsx
```

**Module Organization** (Group by feature)

```txt
components/
  common/
    Button.jsx
    Input.jsx
  user/
    UserProfileCard.jsx
    UserAvatar.jsx
  dashboard/
    DashboardSidebar.jsx
    DashboardChart.jsx
```

## Module & File Organization

### Module Files

- **Non-component files**: `kebab-case`, describe function
    - Examples: `user-service.js`, `date-utils.js`

- **Module directories**: `kebab-case`, plural for collections
    - Examples: `components`, `services`, `utils`

### Node.js Patterns

| Type           | Style        | Example                            |
| :------------- | :----------- | :--------------------------------- |
| Middleware     | `camelCase`  | `authMiddleware`, `errorHandler`   |
| Routes         | `kebab-case` | `user-routes.js`, `auth-routes.js` |
| Models/Schemas | `PascalCase` | `UserModel`, `OrderSchema`         |

## CSS/Styling

### File Naming

- CSS/SCSS files: `PascalCase` matching component name
- Example: `UserProfileCard.scss`

### Class Naming (BEM Convention)

```css
.user-profile-card {
} /* Block */
.user-profile-card__title {
} /* Element */
.user-profile-card--active {
} /* Modifier */
```

### File Organization

```txt
components/UserProfileCard/
  UserProfileCard.jsx
  UserProfileCard.scss
```

## Index Files

- Use `index.js` or `index.tsx` as module entry point
- Export related module contents for cleaner imports
- Import using directory name, not file name

## Checklist

- [ ] Variables/functions use `camelCase`
- [ ] Classes/components use `PascalCase`
- [ ] Files use `kebab-case` (non-components) or `PascalCase` (components)
- [ ] Directories use `kebab-case`, plural for collections
- [ ] Component names semantic and non-redundant (no `-Component` suffix)
- [ ] CSS classes use `kebab-case` with BEM pattern
- [ ] Private members marked with `_` prefix
- [ ] Framework conventions (React HOC, Vue templates, Node.js middleware) followed
- [ ] Consistent naming style across entire project

# Coding Conventions

**Analysis Date:** 2026-02-28

## Naming Patterns

**Files:**
- React components: PascalCase with `.tsx` extension (e.g., `Sidebar.tsx`, `PatientForm.tsx`)
- Custom hooks: camelCase with `use` prefix (e.g., `useApi.ts`, `useMutation.ts`)
- Utilities/services: camelCase (e.g., `api.ts`, `types.ts`)
- Serializers (Django): PascalCase with `Serializer` suffix (e.g., `PatientListSerializer`)
- Views (Django): PascalCase with `ViewSet` suffix (e.g., `PatientViewSet`)
- Models (Django): PascalCase (e.g., `Patient`, `Consultation`)

**Functions & Components:**
- React components: PascalCase (e.g., `export function PatientForm() {}`)
- React hooks: camelCase with `use` prefix (e.g., `export function useApi<T>() {}`)
- Helper functions: camelCase (e.g., `updateField`, `validate`, `clearDraft`)
- Django methods: snake_case (e.g., `get_serializer_class`, `import_preview`)
- Properties/properties in types: camelCase (e.g., `isLoading`, `firstName`, `clinicName`)

**Variables & Constants:**
- Local variables: camelCase (e.g., `clinicName`, `mobileOpen`, `errors`)
- Constants: UPPER_SNAKE_CASE for global constants (e.g., `INDIAN_PHONE_REGEX`)
- Type/Interface properties: camelCase (e.g., `consultation_date`, `blood_group` - matches backend API)
- Object literals used as config/data: camelCase keys (e.g., `{ label: "...", icon: ..., href: "/" }`)

**Types:**
- Type definitions: PascalCase with `Type` suffix (e.g., `UserRole`, `Patient`, `Consultation`)
- Union types: Use specific domain values (e.g., `Gender = "male" | "female" | "other"`)
- Generic type parameters: Single uppercase letter (e.g., `<T>`, `<TResponse>`)
- Props types: Component name + `Props` suffix (e.g., `PatientBannerProps`, `FormFieldProps`)

## Code Style

**Formatting:**
- Framework: Next.js (TypeScript by default)
- Lint tool: ESLint with Next.js config (`eslint-config-next`)
- Configured via: `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/frontend/.eslintrc.json`
- Backend: Django with Django REST Framework; no Prettier/Black config detected
- Line length: Not explicitly configured; codebase shows ~80-100 character lines

**Linting:**
- Frontend: `next lint` runs ESLint
- Extends: `next/core-web-vitals` and `next/typescript`
- Type checking: Strict TypeScript mode enabled (`"strict": true`)
- Module system: ES modules with `moduleResolution: "bundler"`
- JSX: Preserved (Next.js 14 with React 18)

**Key settings from tsconfig:**
```json
{
  "lib": ["dom", "dom.iterable", "esnext"],
  "strict": true,
  "noEmit": true,
  "esModuleInterop": true,
  "resolveJsonModule": true,
  "isolatedModules": true,
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

## Import Organization

**Order:**
1. React hooks and imports (from `react`)
2. Next.js imports (from `next/*`)
3. Third-party libraries (axios, lucide-react)
4. Internal components/hooks (from `@/components`, `@/hooks`)
5. Internal utilities/types (from `@/lib`)

**Example from `Sidebar.tsx`:**
```typescript
"use client";

import {
  LayoutDashboard,
  Users,
  Stethoscope,
  FileText,
  Menu,
  X,
  Search,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { KbdBadge } from "@/components/ui/KbdBadge";
import { useShortcuts } from "@/components/layout/KeyboardProvider";
import { useAuth } from "@/components/auth/AuthProvider";
```

**Path Aliases:**
- `@/*` maps to `./src/*` in frontend
- Used for clean imports: `@/components`, `@/hooks`, `@/lib`

## Error Handling

**Frontend patterns:**
- Custom hooks return state with `error` field (type `ApiError | null`)
- Error object structure: `{ detail?: string; non_field_errors?: string[]; [field: string]: string[] | string | undefined }`
- Network errors caught and mapped to: `{ detail: "Network error" }`
- Form validation errors shown inline with `aria-invalid` attributes
- Invalid form fields focused using: `document.querySelector('[aria-invalid="true"]')`

**Example from `useApi.ts`:**
```typescript
try {
  const res = await api.get<T>(target, { signal: controller.signal });
  if (!controller.signal.aborted) {
    setState({ data: res.data, error: null, isLoading: false });
  }
} catch (err: unknown) {
  if (controller.signal.aborted) return;
  const apiErr =
    err && typeof err === "object" && "response" in err
      ? ((err as { response?: { data?: ApiError } }).response?.data ?? {
          detail: "Something went wrong",
        })
      : { detail: "Network error" };
  setState({ data: null, error: apiErr as ApiError, isLoading: false });
}
```

**Backend patterns:**
- Use Django REST Framework serializers for validation
- Custom validation in serializer methods (`validate`, `create`, `update`)
- Atomic transactions for critical operations (see `Patient.save()`)
- Return appropriate HTTP status codes (201 for creation, 400 for validation errors)

## Logging

**Framework:** Console logging only

**Patterns:**
- No structured logging framework detected
- Silent error handling where appropriate (e.g., in `useAutoSave.ts`, storage errors ignored)
- Comments indicate intentional silent failures: `// storage full — silently ignore`

## Comments

**When to Comment:**
- Explain non-obvious logic or workarounds
- Clarify business rules (e.g., phone number validation for Indian numbers)
- Document intentional error suppression

**Example from `useAutoSave.ts`:**
```typescript
} catch {
  // storage full — silently ignore
}
```

**JSDoc/TSDoc:**
- Not heavily used in codebase
- Some type documentation via TypeScript interfaces
- Comments use inline explanations rather than block documentation

## Function Design

**Size:**
- Small, focused functions preferred
- Component functions typically 50-150 lines
- Helper functions 10-50 lines
- Larger forms broken into components: `PatientForm` (150+ lines uses nested functions)

**Parameters:**
- Prefer props objects for components
- Use destructuring (e.g., `{ label, required, error, hint, children }`)
- Generic type parameters for reusable hooks (e.g., `useApi<T>`, `useMutation<TPayload, TResponse>`)

**Return Values:**
- Hooks return object with state and functions: `{ data, error, isLoading, refetch }`
- Components return JSX.Element (implicit)
- Utility functions return null for "not found" rather than undefined

**Example from `useApi.ts`:**
```typescript
export function useApi<T>(url: string | null) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: url !== null,
  });
  // ...
  return { ...state, refetch };
}
```

## Module Design

**Exports:**
- Named exports for components and hooks: `export function PatientForm() {}`
- Named exports for utilities: `export const Button = forwardRef(...)`
- Prefer named over default exports for consistency

**Barrel Files:**
- Not observed in codebase
- Direct imports from component files (e.g., `from "@/components/ui/Button"`)

**Component Structure:**
- Single responsibility per component
- UI components in `src/components/ui/` (Button, Input, Select, KbdBadge)
- Feature components in `src/components/{feature}/` (PatientForm, ConsultationForm)
- Layout components in `src/components/layout/` (Sidebar, KeyboardProvider)
- Auth components in `src/components/auth/` (AuthProvider, AuthGuard)

## Django-Specific Patterns (Backend)

**Models:**
- Use descriptive field names with `max_length`, `blank=True`, `default=""`
- Define `Meta` class with `ordering`, `indexes`, `constraints`
- Use `readonly` properties via `@property` decorator
- Override `save()` for business logic (e.g., auto-generating `record_id`)

**Serializers:**
- Separate list and detail serializers for efficiency
- Handle nested creates/updates in `create()` and `update()` methods
- Read-only fields marked explicitly: `read_only_fields = [...]`

**ViewSets:**
- Use mixins for common behavior (e.g., `TenantQuerySetMixin`)
- Override `get_serializer_class()` to use different serializers per action
- Use `@action` decorator for custom endpoints

## Tailwind & Styling

**Class naming:**
- Utility-first CSS via Tailwind classes
- Color scheme: Emerald green primary color, gray/red for secondary
- Responsive classes: `sm:`, `md:`, `lg:` prefixes used
- No custom CSS observed; pure Tailwind composition

**Example from `Sidebar.tsx`:**
```typescript
className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
  active
    ? "bg-emerald-50 font-medium text-emerald-700"
    : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
}`}
```

---

*Convention analysis: 2026-02-28*

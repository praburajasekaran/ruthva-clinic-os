# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Frontend:**
- No test framework detected in `package.json`
- Jest/Vitest not configured
- No test files found in frontend codebase

**Backend:**
- Runner: Django TestCase (built-in to Django)
- Framework: Django test framework + Django REST framework test utilities
- Config: Tests run via `python manage.py test` (standard Django)
- Test files located at: `{app}/tests.py`

**Run Commands:**
```bash
# Backend - Run all tests
python manage.py test

# Backend - Run specific app tests
python manage.py test patients

# Backend - Run specific test class
python manage.py test patients.tests.PatientModelTest

# Backend - With verbosity
python manage.py test --verbosity=2

# Backend - Create test database
python manage.py test --keepdb
```

## Test File Organization

**Backend Location:**
- Django convention: `{app}/tests.py` (e.g., `patients/tests.py`, `users/tests.py`)
- Test files found at:
  - `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/patients/tests.py`
  - `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/users/tests.py`
  - `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/consultations/tests.py`
  - `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/clinics/tests.py`

**Test Class Naming:**
- Model tests: `{ModelName}ModelTest`
- API/ViewSet tests: `{ModelName}APITest`
- Other tests: descriptive suffix (e.g., `PatientImportTest`)

**Frontend:**
- No test organization patterns exist (no tests found)

## Test Structure

**Django Test Pattern (from `patients/tests.py`):**

```python
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

class PatientModelTest(TestCase):
    def test_record_id_auto_generation(self):
        patient = Patient.objects.create(
            name="Test Patient", age=30, gender="male", phone="9876543210"
        )
        year = timezone.now().year
        self.assertEqual(patient.record_id, f"PAT-{year}-001")

class PatientAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="doctor", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

    def test_create_patient(self):
        data = {
            "name": "API Patient",
            "age": 35,
            "gender": "male",
            "phone": "9876543299",
        }
        response = self.client.post("/api/v1/patients/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

**Patterns:**
- Setup: `setUp()` method initializes test fixtures
- Teardown: Implicit via Django's test database cleanup (no explicit teardown needed)
- Assertion: Django's `self.assertEqual()`, `self.assertIn()`, etc.
- HTTP client: `APIClient()` from DRF for API testing
- Authentication: `self.client.force_authenticate(user=self.user)`

## Mocking

**Framework:** Django's built-in mock (Python standard library)

**Patterns:**
- Not heavily used in observed test files
- Django's `TestCase` provides database isolation automatically
- API mocking not observed; tests use real database with fixtures

**What to Mock:**
- External API calls (Resend email, AWS S3, etc.)
- Time-dependent operations via `timezone.now()`
- Third-party services not critical to unit test

**What NOT to Mock:**
- Database operations (use Django's transaction isolation instead)
- Internal service methods (test via API endpoints when possible)
- Model relationships (use `select_related()`, `prefetch_related()` for optimization)

## Fixtures and Factories

**Test Data Creation Pattern (from `patients/tests.py`):**

```python
class PatientAPITest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="doctor", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
```

**Location:**
- Inline in test methods via Django ORM
- `setUp()` method for shared fixtures across test class
- No factory library (Factory Boy, Faker) observed

**Creating Related Objects:**
```python
def test_medical_history_relation(self):
    patient = Patient.objects.create(
        name="Test", age=30, gender="male", phone="9876543210"
    )
    MedicalHistory.objects.create(
        patient=patient, disease="Diabetes", duration="5 years"
    )
    self.assertEqual(patient.medical_history.count(), 1)
```

## Coverage

**Requirements:** Not enforced (no coverage configuration detected)

**Tools:**
- Not configured in backend
- Frontend: No test framework means no coverage tracking

**View Coverage:**
```bash
# Install coverage tool
pip install coverage

# Run tests with coverage
coverage run --source='.' manage.py test

# View coverage report
coverage report
```

## Test Types

**Unit Tests:**
- Scope: Single model/method/function
- Approach: Django `TestCase` with isolated database
- Example: `test_record_id_auto_generation()` in `PatientModelTest`
- Pattern: Create minimal test data, call method, assert result

**Integration Tests:**
- Scope: Full request/response cycle with database
- Approach: API tests using `APIClient` in `TestCase`
- Example: `test_create_patient()` in `PatientAPITest`
- Pattern: Create fixtures, make HTTP request, verify status and data

**E2E Tests:**
- Framework: Not detected
- Not currently implemented in codebase

## Common Patterns

**Async Testing:**
- Not observed (Django tests are synchronous)
- Django 3.1+ supports `AsyncTestCase` if needed

**Error Testing:**
```python
def test_create_patient(self):
    data = {"name": "API Patient", "age": 35, "gender": "male"}
    # Missing required phone field
    response = self.client.post("/api/v1/patients/", data, format="json")
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

**Testing Nested/Related Data:**
```python
def test_create_patient_with_nested_history(self):
    data = {
        "name": "Nested Patient",
        "age": 40,
        "gender": "female",
        "phone": "9876543298",
        "medical_history": [
            {"disease": "Diabetes", "duration": "5 years", "medication": "..."}
        ],
    }
    response = self.client.post("/api/v1/patients/", data, format="json")
    self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

## Frontend Testing Notes

**Current State:**
- No test framework installed (no Jest, Vitest, etc.)
- No test files in codebase
- No testing configuration

**To Add Tests:**
1. Install test framework: `npm install --save-dev vitest` or `jest`
2. Create test files alongside components: `Component.test.tsx`
3. Follow React Testing Library patterns if using Jest
4. Test custom hooks with `@testing-library/react`

**Recommended Patterns for Existing Codebase:**

```typescript
// Example: Testing a custom hook
import { renderHook, act } from '@testing-library/react';
import { useApi } from '@/hooks/useApi';

describe('useApi', () => {
  it('should fetch data and update state', async () => {
    const { result } = renderHook(() => useApi('/test-endpoint'));

    expect(result.current.isLoading).toBe(true);

    // Wait for async operation
    await act(async () => {
      // test assertions
    });
  });
});
```

```typescript
// Example: Testing a React component
import { render, screen } from '@testing-library/react';
import { PatientForm } from '@/components/patients/PatientForm';

describe('PatientForm', () => {
  it('should display validation errors', () => {
    render(<PatientForm />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
  });
});
```

## Django Test Utilities

**APIClient Methods (from `/Users/praburajasekaran/Documents/local-htdocs/sivanethram/backend/patients/tests.py`):**
- `client.post(url, data, format="json")` - POST request
- `client.get(url)` - GET request
- `client.put(url, data)` - PUT request
- `client.patch(url, data)` - PATCH request
- `client.delete(url)` - DELETE request
- `client.force_authenticate(user=user)` - Set authenticated user

**Assertion Methods:**
- `self.assertEqual(a, b)` - Assert equality
- `self.assertIn(a, b)` - Assert membership
- `self.assertTrue(condition)` - Assert truthy
- `self.assertIsNone(value)` - Assert None

---

*Testing analysis: 2026-02-28*

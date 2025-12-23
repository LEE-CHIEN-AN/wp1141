# Tests

This directory contains test scripts for the NTU-COOL shadow navigation system.

## Test Files

### `test_api_endpoints.py`
Tests the FastAPI backend endpoints:
- Health check endpoint (`/healthz`)
- Route calculation endpoints (`/route`, `/route/shortest`)
- Shadow calculation endpoint (`/shadows`)
- Error handling and validation

### `test_database_integration.py`
Tests database integration:
- Supabase connection
- PostGIS queries
- Building data retrieval
- Cache functionality

### `test_integration.py`
End-to-end integration tests:
- Full routing workflow
- Shadow calculation workflow
- API response validation
- Data consistency checks

## Running Tests

### Run all tests:
```bash
python -m pytest tests/
```

### Run specific test file:
```bash
python tests/test_api_endpoints.py
python tests/test_database_integration.py
python tests/test_integration.py
```

### Run with verbose output:
```bash
python -m pytest tests/ -v
```

## Prerequisites

- Python 3.11+
- All dependencies from `requirements.txt`
- Backend server running (for API tests)
- Environment variables configured (`.env` file)

## Environment Setup

Tests require the following environment variables:
- `SUPABASE_URL` (for database tests)
- `SUPABASE_KEY` (for database tests)
- Backend API URL (defaults to `http://localhost:8000`)

## Notes

- Some tests require the backend to be running
- Database tests require valid Supabase credentials
- Integration tests may take longer to run


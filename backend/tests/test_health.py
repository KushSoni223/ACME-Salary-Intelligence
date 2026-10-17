
from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import main


@pytest.fixture
def client():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    main.Base.metadata.create_all(test_engine)
    test_sessions = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)
    with test_sessions() as session:
        session.add_all(
            [
                main.Employee(
                    employee_id="AC-00001",
                    first_name="Avery",
                    last_name="Chen",
                    email="avery.chen@example.com",
                    department="Engineering",
                    country="Canada",
                    currency="CAD",
                    annual_salary=Decimal("120000.00"),
                    status="Active",
                    effective_date=date(2025, 1, 1),
                ),
                main.Employee(
                    employee_id="AC-00002",
                    first_name="Sam",
                    last_name="Rivera",
                    email="sam.rivera@example.com",
                    department="People",
                    country="United States",
                    currency="USD",
                    annual_salary=Decimal("100000.00"),
                    status="Active",
                    effective_date=date(2025, 1, 1),
                ),
                main.Employee(
                    employee_id="AC-00003",
                    first_name="Jordan",
                    last_name="Patel",
                    email="jordan.patel@example.com",
                    department="Engineering",
                    country="Canada",
                    currency="CAD",
                    annual_salary=Decimal("140000.00"),
                    status="On leave",
                    effective_date=date(2025, 1, 1),
                ),
            ]
        )
        session.commit()

    def override_get_db():
        with test_sessions() as session:
            yield session

    main.app.dependency_overrides[main.get_db] = override_get_db
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()
    test_engine.dispose()


def test_health_check_returns_ok(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_employee_directory_filters_search_and_paginates(client: TestClient) -> None:
    response = client.get(
        "/api/v1/employees",
        params={"q": "chen", "country": "Canada", "page_size": 1},
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["employee_id"] == "AC-00001"


def test_employee_directory_sorts_salary_descending(client: TestClient) -> None:
    response = client.get(
        "/api/v1/employees",
        params={"sort_by": "annual_salary", "sort_order": "desc", "page_size": 1},
    )

    assert response.status_code == 200
    assert response.json()["items"][0]["employee_id"] == "AC-00003"


def test_employee_directory_sorts_by_status(client: TestClient) -> None:
    response = client.get(
        "/api/v1/employees",
        params={"sort_by": "status", "sort_order": "desc", "page_size": 1},
    )

    assert response.status_code == 200
    assert response.json()["items"][0]["employee_id"] == "AC-00003"


def test_analytics_never_combines_currencies(client: TestClient) -> None:
    response = client.get("/api/v1/analytics", params={"department": "Engineering"})

    assert response.status_code == 200
    analytics = response.json()
    assert analytics["employee_count"] == 2
    assert set(analytics["currencies"]) == {"CAD"}
    assert analytics["currencies"]["CAD"]["total_annual"] == "260000.00"
    assert analytics["currencies"]["CAD"]["median_annual"] == "130000.00"
    assert [person["employee_id"] for person in analytics["top_earners_by_currency"]["CAD"]] == [
        "AC-00003",
        "AC-00001",
    ]


def test_compensation_update_persists_and_normalizes_currency(client: TestClient) -> None:
    response = client.patch(
        "/api/v1/employees/AC-00001/compensation",
        json={"annual_salary": "125500.50", "currency": "cad", "effective_date": "2026-07-01"},
    )

    assert response.status_code == 200
    assert response.json()["annual_salary"] == "125500.50"
    assert response.json()["currency"] == "CAD"
    persisted = client.get("/api/v1/employees", params={"q": "AC-00001"}).json()["items"][0]
    assert persisted["annual_salary"] == "125500.50"


def test_compensation_update_rejects_invalid_salary(client: TestClient) -> None:
    response = client.patch(
        "/api/v1/employees/AC-00001/compensation",
        json={"annual_salary": 0, "currency": "CAD", "effective_date": "2026-07-01"},
    )

    assert response.status_code == 422


def test_compensation_update_returns_not_found(client: TestClient) -> None:
    response = client.patch(
        "/api/v1/employees/AC-99999/compensation",
        json={"annual_salary": 100000, "currency": "USD", "effective_date": "2026-07-01"},
    )

    assert response.status_code == 404


def test_employee_can_be_created(client: TestClient) -> None:
    response = client.post(
        "/api/v1/employees",
        json={
            "employee_id": "ac-10000",
            "first_name": "Alex",
            "last_name": "Morgan",
            "email": "ALEX.MORGAN@EXAMPLE.COM",
            "department": "Product",
            "country": "United Kingdom",
            "currency": "gbp",
            "annual_salary": "85000",
            "status": "Active",
            "effective_date": "2026-10-01",
        },
    )

    assert response.status_code == 201
    assert response.json()["employee_id"] == "AC-10000"
    assert response.json()["email"] == "alex.morgan@example.com"
    assert response.json()["currency"] == "GBP"


def test_employee_creation_rejects_duplicate_identity(client: TestClient) -> None:
    payload = {
        "employee_id": "AC-00001",
        "first_name": "Alex",
        "last_name": "Morgan",
        "email": "alex.morgan@example.com",
        "department": "Product",
        "country": "Canada",
        "currency": "CAD",
        "annual_salary": 85000,
        "effective_date": "2026-10-01",
    }

    response = client.post("/api/v1/employees", json=payload)

    assert response.status_code == 409

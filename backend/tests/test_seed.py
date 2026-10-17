from app.seed import EMPLOYEE_COUNT, generate_seed_records


def test_seed_contains_ten_thousand_unique_employees() -> None:
    records = generate_seed_records()

    assert len(records) == EMPLOYEE_COUNT == 10_000
    assert len({record["employee_id"] for record in records}) == EMPLOYEE_COUNT
    assert len({record["email"] for record in records}) == EMPLOYEE_COUNT


def test_seed_data_is_deterministic() -> None:
    assert generate_seed_records(3) == generate_seed_records(3)
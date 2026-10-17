from datetime import date, timedelta
import random

from sqlalchemy import func, insert, select

from app.main import Employee, SessionLocal


EMPLOYEE_COUNT = 10_000
COUNTRIES = {
    "Australia": ("AUD", 90_000, 190_000),
    "Canada": ("CAD", 70_000, 150_000),
    "France": ("EUR", 42_000, 105_000),
    "Germany": ("EUR", 48_000, 120_000),
    "India": ("INR", 900_000, 3_000_000),
    "Singapore": ("SGD", 65_000, 145_000),
    "United Kingdom": ("GBP", 42_000, 110_000),
    "United States": ("USD", 75_000, 175_000),
}
DEPARTMENTS = (
    "Engineering",
    "Finance",
    "Human Resources",
    "Legal",
    "Marketing",
    "Operations",
    "Product",
    "Sales",
)
FIRST_NAMES = (
    "Avery", "Cameron", "Casey", "Devon", "Emerson", "Finley", "Harper", "Jordan",
    "Kai", "Logan", "Morgan", "Parker", "Quinn", "Riley", "Sam", "Taylor",
)
LAST_NAMES = (
    "Adams", "Bennett", "Chen", "Diaz", "Evans", "Foster", "Garcia", "Hughes",
    "Ivanov", "Jones", "Khan", "Lewis", "Morgan", "Patel", "Reed", "Singh",
)


def generate_seed_records(count: int = EMPLOYEE_COUNT) -> list[dict[str, object]]:
    generator = random.Random(20261017)
    countries = tuple(COUNTRIES.items())
    start_date = date(2021, 1, 1)
    date_span = (date(2026, 9, 30) - start_date).days
    records = []
    for number in range(1, count + 1):
        first_name = generator.choice(FIRST_NAMES)
        last_name = generator.choice(LAST_NAMES)
        country, (currency, minimum, maximum) = generator.choice(countries)
        records.append(
            {
                "employee_id": f"AC-{number:05d}",
                "first_name": first_name,
                "last_name": last_name,
                "email": f"{first_name.lower()}.{last_name.lower()}.{number:05d}@acme.example",
                "department": generator.choice(DEPARTMENTS),
                "country": country,
                "currency": currency,
                "annual_salary": round(generator.uniform(minimum, maximum), 2),
                "status": generator.choices(("Active", "On leave", "Inactive"), weights=(90, 6, 4))[0],
                "effective_date": start_date + timedelta(days=generator.randrange(date_span + 1)),
            }
        )
    return records


def seed_database() -> int:
    with SessionLocal.begin() as session:
        existing_count = session.scalar(select(func.count()).select_from(Employee)) or 0
        if existing_count:
            raise RuntimeError(
                f"Database already contains {existing_count} employees; refusing to add duplicate seed data."
            )
        session.execute(insert(Employee), generate_seed_records())
    return EMPLOYEE_COUNT


if __name__ == "__main__":
    print(f"Seeded {seed_database():,} employees.")
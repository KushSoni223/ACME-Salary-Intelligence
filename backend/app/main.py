
from datetime import date
from decimal import Decimal
from pathlib import Path
import os
import re
from statistics import median
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import Date, Numeric, String, create_engine, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(180), unique=True)
    department: Mapped[str] = mapped_column(String(80), index=True)
    country: Mapped[str] = mapped_column(String(80), index=True)
    currency: Mapped[str] = mapped_column(String(3), index=True)
    annual_salary: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(16), index=True)
    effective_date: Mapped[date] = mapped_column(Date)


def make_engine(database_url: str):
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(database_url, connect_args=connect_args)


DATABASE_URL = os.getenv(
    "DATABASE_URL", f"sqlite:///{Path(__file__).resolve().parents[1] / 'acme_salary.db'}"
)
engine = make_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
Base.metadata.create_all(engine)

app = FastAPI(
    title="ACME Salary Intelligence",
    description="Employee compensation management and analytics.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "PATCH"],
    allow_headers=["*"],
)


def get_db():
    with SessionLocal() as session:
        yield session


DbSession = Annotated[Session, Depends(get_db)]


class EmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: str
    first_name: str
    last_name: str
    email: str
    department: str
    country: str
    currency: str
    annual_salary: Decimal
    status: str
    effective_date: date


class EmployeePage(BaseModel):
    items: list[EmployeeResponse]
    total: int
    page: int
    page_size: int


class CompensationUpdate(BaseModel):
    annual_salary: Decimal = Field(gt=0, le=999_999_999)
    currency: str = Field(min_length=3, max_length=3)
    effective_date: date

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        code = value.upper()
        if not re.fullmatch(r"[A-Z]{3}", code):
            raise ValueError("Currency must be a three-letter ISO code")
        return code


class EmployeeCreate(BaseModel):
    employee_id: str = Field(min_length=8, max_length=16)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=5, max_length=180)
    department: str = Field(min_length=1, max_length=80)
    country: str = Field(min_length=1, max_length=80)
    currency: str = Field(min_length=3, max_length=3)
    annual_salary: Decimal = Field(gt=0, le=999_999_999)
    status: str = "Active"
    effective_date: date

    @field_validator("employee_id")
    @classmethod
    def normalize_employee_id(cls, value: str) -> str:
        employee_id = value.strip().upper()
        if not re.fullmatch(r"AC-\d{5,}", employee_id):
            raise ValueError("Employee ID must use the format AC-00001")
        return employee_id

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        email = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            raise ValueError("Enter a valid email address")
        return email

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        code = value.upper()
        if not re.fullmatch(r"[A-Z]{3}", code):
            raise ValueError("Currency must be a three-letter ISO code")
        return code

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in {"Active", "On leave", "Inactive"}:
            raise ValueError("Status must be Active, On leave, or Inactive")
        return value


def apply_filters(
    statement,
    *,
    q: str | None,
    country: str | None,
    department: str | None,
    status: str | None,
    currency: str | None,
):
    if q:
        term = f"%{q.strip()}%"
        statement = statement.where(
            or_(
                Employee.employee_id.ilike(term),
                Employee.first_name.ilike(term),
                Employee.last_name.ilike(term),
                Employee.email.ilike(term),
            )
        )
    if country:
        statement = statement.where(Employee.country == country)
    if department:
        statement = statement.where(Employee.department == department)
    if status:
        statement = statement.where(Employee.status == status)
    if currency:
        statement = statement.where(Employee.currency == currency.upper())
    return statement


def filter_parameters(
    q: str | None,
    country: str | None,
    department: str | None,
    status: str | None,
    currency: str | None,
) -> dict[str, str | None]:
    return {
        "q": q,
        "country": country,
        "department": department,
        "status": status,
        "currency": currency,
    }


@app.get("/api/v1/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/meta")
def get_filter_options(db: DbSession) -> dict[str, list[str] | dict[str, str]]:
    country_currencies = db.execute(
        select(Employee.country, Employee.currency)
        .distinct()
        .order_by(Employee.country, Employee.currency)
    ).all()
    return {
        "countries": list(db.scalars(select(Employee.country).distinct().order_by(Employee.country))),
        "departments": list(db.scalars(select(Employee.department).distinct().order_by(Employee.department))),
        "statuses": list(db.scalars(select(Employee.status).distinct().order_by(Employee.status))),
        "currencies": list(db.scalars(select(Employee.currency).distinct().order_by(Employee.currency))),
        "country_currencies": {
            country: currency for country, currency in country_currencies
        },
    }


@app.get("/api/v1/employees", response_model=EmployeePage)
def list_employees(
    db: DbSession,
    q: str | None = None,
    country: str | None = None,
    department: str | None = None,
    status: str | None = None,
    currency: str | None = None,
    sort_by: Literal[
        "employee_id", "name", "department", "country", "status", "annual_salary"
    ] = "employee_id",
    sort_order: Literal["asc", "desc"] = "asc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 25,
):
    filters = filter_parameters(q, country, department, status, currency)
    statement = apply_filters(select(Employee), **filters)
    count_statement = apply_filters(select(func.count()).select_from(Employee), **filters)
    total = db.scalar(count_statement) or 0
    sort_columns = {
        "employee_id": (Employee.employee_id,),
        "name": (Employee.last_name, Employee.first_name),
        "department": (Employee.department,),
        "country": (Employee.country,),
        "status": (Employee.status,),
        "annual_salary": (Employee.annual_salary,),
    }
    direction = "desc" if sort_order == "desc" else "asc"
    ordering = [
        column.desc() if direction == "desc" else column.asc()
        for column in sort_columns[sort_by]
    ]
    if sort_by != "employee_id":
        ordering.append(Employee.employee_id.asc())
    rows = db.scalars(
        statement.order_by(*ordering).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return {"items": rows, "total": total, "page": page, "page_size": page_size}


@app.post("/api/v1/employees", response_model=EmployeeResponse, status_code=201)
def create_employee(employee_data: EmployeeCreate, db: DbSession):
    employee = Employee(**employee_data.model_dump())
    db.add(employee)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Employee ID or email already exists") from error
    db.refresh(employee)
    return employee


@app.get("/api/v1/analytics")
def get_analytics(
    db: DbSession,
    q: str | None = None,
    country: str | None = None,
    department: str | None = None,
    status: str | None = None,
    currency: str | None = None,
):
    filters = filter_parameters(q, country, department, status, currency)
    statement = apply_filters(select(Employee), **filters)
    employees = db.scalars(statement).all()
    currency_summaries: dict[str, dict[str, int | float | str]] = {}
    for code in sorted({employee.currency for employee in employees}):
        amounts = [employee.annual_salary for employee in employees if employee.currency == code]
        currency_summaries[code] = {
            "count": len(amounts),
            "total_annual": str(sum(amounts, Decimal("0.00"))),
            "average_annual": str(sum(amounts, Decimal("0.00")) / len(amounts)),
            "median_annual": str(median(amounts)),
        }

    department_totals: dict[tuple[str, str], list[Decimal]] = {}
    country_totals: dict[tuple[str, str], list[Decimal]] = {}
    for employee in employees:
        department_totals.setdefault((employee.department, employee.currency), []).append(employee.annual_salary)
        country_totals.setdefault((employee.country, employee.currency), []).append(employee.annual_salary)

    def summarize_groups(groups: dict[tuple[str, str], list[Decimal]], key: str):
        return [
            {
                key: label,
                "currency": code,
                "count": len(amounts),
                "average_annual": str(sum(amounts, Decimal("0.00")) / len(amounts)),
            }
            for (label, code), amounts in sorted(groups.items())
        ]

    return {
        "employee_count": len(employees),
        "currencies": currency_summaries,
        "by_department": summarize_groups(department_totals, "department"),
        "by_country": summarize_groups(country_totals, "country"),
        "top_earners_by_currency": {
            code: [
                EmployeeResponse.model_validate(employee).model_dump(mode="json")
                for employee in sorted(
                    (item for item in employees if item.currency == code),
                    key=lambda item: item.annual_salary,
                    reverse=True,
                )[:5]
            ]
            for code in currency_summaries
        },
    }


@app.patch("/api/v1/employees/{employee_id}/compensation", response_model=EmployeeResponse)
def update_compensation(employee_id: str, update: CompensationUpdate, db: DbSession):
    employee = db.scalar(select(Employee).where(Employee.employee_id == employee_id))
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    employee.annual_salary = update.annual_salary
    employee.currency = update.currency
    employee.effective_date = update.effective_date
    db.commit()
    db.refresh(employee)
    return employee

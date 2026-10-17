import { useDeferredValue, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  Globe2,
  LayoutDashboard,
  Search,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react";
import "./App.css";

type Employee = {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  country: string;
  currency: string;
  annual_salary: string;
  status: string;
  effective_date: string;
};

type EmployeePage = {
  items: Employee[];
  total: number;
  page: number;
  page_size: number;
};
type GroupSummary = {
  department?: string;
  country?: string;
  currency: string;
  count: number;
  average_annual: string;
};
type Analytics = {
  employee_count: number;
  currencies: Record<
    string,
    {
      count: number;
      total_annual: string;
      average_annual: string;
      median_annual: string;
    }
  >;
  by_department: GroupSummary[];
  by_country: GroupSummary[];
  top_earners_by_currency: Record<string, Employee[]>;
};
type FilterOptions = {
  countries: string[];
  departments: string[];
  statuses: string[];
  currencies: string[];
  country_currencies: Record<string, string>;
};
type SortField =
  | "employee_id"
  | "name"
  | "department"
  | "country"
  | "status"
  | "annual_salary";

const emptyOptions: FilterOptions = {
  countries: [],
  departments: [],
  statuses: [],
  currencies: [],
  country_currencies: {},
};
const pageSize = 12;

function formatMoney(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function currencySymbol(currency: string) {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? currency
    );
  } catch {
    return currency;
  }
}

function initials(employee: Employee) {
  return `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase();
}

function App() {
  const [activeView, setActiveView] = useState<"overview" | "people">(
    "overview",
  );
  const [searchText, setSearchText] = useState("");
  const deferredSearch = useDeferredValue(searchText);
  const [filters, setFilters] = useState({
    country: "",
    department: "",
    status: "",
    currency: "",
  });
  const [options, setOptions] = useState<FilterOptions>(emptyOptions);
  const [employeePage, setEmployeePage] = useState<EmployeePage | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>("employee_id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const [formCountry, setFormCountry] = useState("");
  const [formCurrency, setFormCurrency] = useState("");
  const [saving, setSaving] = useState(false);
  const [insight, setInsight] = useState<"department" | "country">(
    "department",
  );
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/v1/meta")
      .then((response) => response.json())
      .then((data: FilterOptions) => setOptions(data))
      .catch(() =>
        setError(
          "Could not load filter options. Check that the API is running.",
        ),
      );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      sort_by: sortBy,
      sort_order: sortOrder,
    });
    const analyticsParams = new URLSearchParams();
    if (deferredSearch.trim()) {
      params.set("q", deferredSearch.trim());
      analyticsParams.set("q", deferredSearch.trim());
    }
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
        analyticsParams.set(key, value);
      }
    });
    Promise.all([
      fetch(`/api/v1/employees?${params}`, { signal: controller.signal }),
      fetch(`/api/v1/analytics?${analyticsParams}`, {
        signal: controller.signal,
      }),
    ])
      .then(async ([employeesResponse, analyticsResponse]) => {
        if (!employeesResponse.ok || !analyticsResponse.ok)
          throw new Error("The salary data could not be loaded.");
        const [employees, summary] = await Promise.all([
          employeesResponse.json(),
          analyticsResponse.json(),
        ]);
        setEmployeePage(employees);
        setAnalytics(summary);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        )
          return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [deferredSearch, filters, page, refreshKey, sortBy, sortOrder]);

  const currencyEntries = Object.entries(analytics?.currencies ?? {});
  const displayCurrency = filters.currency || currencyEntries[0]?.[0] || "USD";
  const displayCurrencySummary = analytics?.currencies[displayCurrency];
  const groups =
    (insight === "department"
      ? analytics?.by_department
      : analytics?.by_country) ?? [];
  const visibleGroups = groups.filter(
    (group) => group.currency === displayCurrency,
  );
  const topEarners = analytics?.top_earners_by_currency[displayCurrency] ?? [];
  const maxGroupAverage = Math.max(
    ...visibleGroups.map((group) => Number(group.average_annual)),
    1,
  );
  const pageCount = Math.max(
    1,
    Math.ceil((employeePage?.total ?? 0) / pageSize),
  );

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  function updateSort(field: SortField) {
    setSortOrder((current) =>
      sortBy === field
        ? current === "asc"
          ? "desc"
          : "asc"
        : field === "annual_salary"
          ? "desc"
          : "asc",
    );
    setSortBy(field);
    setPage(1);
  }

  function exportCurrentPage() {
    if (!employeePage) return;
    const columns = [
      "employee_id",
      "first_name",
      "last_name",
      "email",
      "department",
      "country",
      "annual_salary",
      "currency",
      "status",
    ] as const;
    const csv = [
      columns.join(","),
      ...employeePage.items.map((employee) =>
        columns
          .map(
            (column) => `"${String(employee[column]).replaceAll('"', '""')}"`,
          )
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `acme-employees-page-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function saveCompensation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing && !creating) return;
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const payload = {
        annual_salary: formData.get("annual_salary"),
        currency: formData.get("currency"),
        effective_date: formData.get("effective_date"),
        ...(creating
          ? {
              employee_id: formData.get("employee_id"),
              first_name: formData.get("first_name"),
              last_name: formData.get("last_name"),
              email: formData.get("email"),
              department: formData.get("department"),
              country: formData.get("country"),
              status: formData.get("status"),
            }
          : {}),
      };
      const response = await fetch(
        creating
          ? "/api/v1/employees"
          : `/api/v1/employees/${editing?.employee_id}/compensation`,
        {
          method: creating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const body = await response.json();
        const detail =
          typeof body.detail === "string" ? body.detail : body.detail?.[0]?.msg;
        throw new Error(detail ?? "Could not save this compensation change.");
      }
      setEditing(null);
      setCreating(false);
      setNotice(
        creating
          ? "Employee added to the directory."
          : `Compensation updated for ${editing?.first_name} ${editing?.last_name}.`,
      );
      setRefreshKey((value) => value + 1);
      window.setTimeout(() => setNotice(""), 3500);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save this compensation change.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#overview"
          onClick={() => setActiveView("overview")}
        >
          <span className="brand-mark">
            <CircleDollarSign size={21} />
          </span>
          <span>
            <strong>ACME</strong>
            <small>PEOPLE OPERATIONS</small>
          </span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <button
            title="Overview"
            className={
              activeView === "overview" ? "nav-link active" : "nav-link"
            }
            onClick={() => setActiveView("overview")}
          >
            <LayoutDashboard size={18} /> Overview
          </button>
          <button
            title="People"
            className={activeView === "people" ? "nav-link active" : "nav-link"}
            onClick={() => setActiveView("people")}
          >
            <UsersRound size={18} /> People{" "}
            <span className="nav-count">10k</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="live-dot" /> Salary data synced
          </div>
          <div className="user-profile">
            <div className="profile-avatar">HR</div>
            <div>
              <strong>HR Manager</strong>
              <small>ACME Organization</small>
            </div>
            <span className="profile-menu">···</span>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <strong>{activeView === "overview" ? "Overview" : "People"}</strong>
          </div>
          <div className="topbar-meta">
            <span className="period-label">COMPENSATION CYCLE</span>
            <span className="period-value">
              FY 2026 <span className="period-dot">·</span> Annual
            </span>
            <div className="topbar-avatar">HR</div>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">PEOPLE &amp; PAY</p>
              <h1>
                {activeView === "overview"
                  ? "Compensation overview"
                  : "Employee directory"}
              </h1>
              <p className="page-subtitle">
                A clear view of how ACME compensates its people around the
                world.
              </p>
            </div>
            <div className="heading-actions">
              <label className="top-country-control">
                <Globe2 size={15} aria-hidden="true" />
                <span>Country</span>
                <select
                  aria-label="Dashboard country"
                  value={filters.country}
                  onChange={(event) =>
                    updateFilter("country", event.target.value)
                  }
                >
                  <option value="">All countries</option>
                  {options.countries.map((country) => (
                    <option key={country}>{country}</option>
                  ))}
                </select>
              </label>
              <button
                className="button secondary export-button"
                onClick={exportCurrentPage}
                disabled={!employeePage?.items.length}
              >
                <Download size={16} /> Export page
              </button>
              <button
                className="button primary add-button"
                onClick={() => {
                  setEditing(null);
                  const country = options.countries[0] ?? "";
                  setFormCountry(country);
                  setFormCurrency(
                    options.country_currencies[country] ??
                      options.currencies[0] ??
                      "USD",
                  );
                  setCreating(true);
                }}
              >
                <span>+</span> Add employee
              </button>
            </div>
          </section>

          {error && (
            <div className="alert error-alert" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success-alert" role="status">
              {notice}
            </div>
          )}

          {activeView === "overview" && (
            <>
              <section
                className="metric-grid"
                aria-label="Compensation summary"
              >
                <article className="metric-card people-metric">
                  <div className="metric-topline">
                    <span>PEOPLE IN SCOPE</span>
                    <span className="metric-icon">
                      <UsersRound size={17} />
                    </span>
                  </div>
                  <strong className="metric-value">
                    {loading && !analytics
                      ? "—"
                      : (analytics?.employee_count ?? 0).toLocaleString("en")}
                  </strong>
                  <div className="metric-foot">
                    <span className="metric-indicator">
                      <ArrowUpRight size={14} /> Workforce
                    </span>
                    <span>across all entities</span>
                  </div>
                </article>
                <article className="metric-card payroll-metric">
                  <div className="metric-topline">
                    <span>ANNUAL PAYROLL</span>
                    <span className="metric-icon">
                      <CircleDollarSign size={17} />
                    </span>
                  </div>
                  <strong className="metric-value money-value">
                    {displayCurrencySummary
                      ? formatMoney(
                          displayCurrencySummary.total_annual,
                          displayCurrency,
                        )
                      : "—"}
                  </strong>
                  <div className="metric-foot">
                    <span className="metric-indicator">{displayCurrency}</span>
                    <span>
                      {displayCurrencySummary?.count.toLocaleString("en") ?? 0}{" "}
                      employees
                    </span>
                  </div>
                </article>
                <article className="metric-card median-metric">
                  <div className="metric-topline">
                    <span>MEDIAN ANNUAL PAY</span>
                    <span className="metric-icon">
                      <ArrowDownRight size={17} />
                    </span>
                  </div>
                  <strong className="metric-value money-value">
                    {displayCurrencySummary
                      ? formatMoney(
                          displayCurrencySummary.median_annual,
                          displayCurrency,
                        )
                      : "—"}
                  </strong>
                  <div className="metric-foot">
                    <span className="metric-indicator">{displayCurrency}</span>
                    <span>middle of the range</span>
                  </div>
                </article>
                <article className="metric-card market-metric">
                  <div className="metric-topline">
                    <span>PAY CURRENCIES</span>
                    <span className="metric-icon">
                      <Globe2 size={17} />
                    </span>
                  </div>
                  <strong className="metric-value">
                    {currencyEntries.length || "—"}
                  </strong>
                  <div className="metric-foot">
                    <span className="metric-indicator">
                      {options.countries.length || "—"} countries
                    </span>
                    <span>shown separately</span>
                  </div>
                </article>
              </section>

              <section className="analysis-grid">
                <article className="panel analysis-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">PAY DISTRIBUTION</p>
                      <h2>Where compensation sits</h2>
                    </div>
                    <div
                      className="segmented-control"
                      role="group"
                      aria-label="Group analysis by"
                    >
                      <button
                        className={insight === "department" ? "selected" : ""}
                        onClick={() => setInsight("department")}
                      >
                        <BriefcaseBusiness size={14} /> Team
                      </button>
                      <button
                        className={insight === "country" ? "selected" : ""}
                        onClick={() => setInsight("country")}
                      >
                        <Globe2 size={14} /> Country
                      </button>
                    </div>
                  </div>
                  <div className="chart-currency">
                    <span>AVERAGE ANNUAL PAY</span>
                    <span>
                      {displayCurrency} <span className="currency-swatch" />
                    </span>
                  </div>
                  {visibleGroups.length ? (
                    <div className="bar-list">
                      {visibleGroups.slice(0, 8).map((group) => {
                        const label = group.department ?? group.country ?? "";
                        const amount = Number(group.average_annual);
                        return (
                          <div
                            className="bar-row"
                            key={`${label}-${group.currency}`}
                          >
                            <div className="bar-label">
                              <span>{label}</span>
                              <strong>
                                {formatMoney(amount, group.currency)}
                              </strong>
                            </div>
                            <div className="bar-track">
                              <span
                                style={{
                                  width: `${Math.max(3, (amount / maxGroupAverage) * 100)}%`,
                                }}
                              />
                            </div>
                            <div className="bar-subtext">
                              {group.count.toLocaleString("en")} people
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-analysis">
                      No salary data matches these filters.
                    </div>
                  )}
                </article>

                <article className="panel earners-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">TOP OF RANGE</p>
                      <h2>Highest paid</h2>
                    </div>
                    <span className="currency-pill">{displayCurrency}</span>
                  </div>
                  <p className="panel-description">
                    Ranked within the selected currency.
                  </p>
                  {topEarners.length ? (
                    <div className="earner-list">
                      {topEarners.slice(0, 5).map((employee, index) => (
                        <div className="earner-row" key={employee.employee_id}>
                          <span className={`rank rank-${index + 1}`}>
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="person-avatar">
                            {initials(employee)}
                          </div>
                          <div className="earner-person">
                            <strong>
                              {employee.first_name} {employee.last_name}
                            </strong>
                            <span>
                              {employee.department} · {employee.country}
                            </span>
                          </div>
                          <strong className="earner-salary">
                            {formatMoney(
                              employee.annual_salary,
                              employee.currency,
                            )}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-analysis">
                      No people found for this currency.
                    </div>
                  )}
                  <div className="currency-footnote">
                    <CircleDollarSign size={14} /> Comparisons are kept within
                    currency.
                  </div>
                </article>
              </section>
            </>
          )}

          <section className="panel directory-panel">
            <div className="directory-heading">
              <div>
                <p className="eyebrow">EMPLOYEE RECORDS</p>
                <h2>
                  {activeView === "overview"
                    ? "People at ACME"
                    : "All employees"}
                </h2>
                <p className="panel-description">
                  Search and manage employee compensation across every location.
                </p>
              </div>
              <div className="directory-total">
                <strong>
                  {(employeePage?.total ?? 0).toLocaleString("en")}
                </strong>
                <span>records</span>
              </div>
            </div>
            <div className="filter-bar">
              <label className="search-field">
                <Search size={16} />
                <input
                  aria-label="Search employees"
                  placeholder="Search name, email or ID"
                  value={searchText}
                  onChange={(event) => {
                    setSearchText(event.target.value);
                    setPage(1);
                  }}
                />
                <kbd>/</kbd>
              </label>
              <div className="filter-divider">
                <SlidersHorizontal size={15} />
                <span>FILTER</span>
              </div>
              <select
                aria-label="Filter by country"
                value={filters.country}
                onChange={(event) =>
                  updateFilter("country", event.target.value)
                }
              >
                <option value="">All countries</option>
                {options.countries.map((country) => (
                  <option key={country}>{country}</option>
                ))}
              </select>
              <select
                aria-label="Filter by department"
                value={filters.department}
                onChange={(event) =>
                  updateFilter("department", event.target.value)
                }
              >
                <option value="">All teams</option>
                {options.departments.map((department) => (
                  <option key={department}>{department}</option>
                ))}
              </select>
              <select
                aria-label="Filter by status"
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
              >
                <option value="">All statuses</option>
                {options.statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <select
                aria-label="Filter by currency"
                value={filters.currency}
                onChange={(event) =>
                  updateFilter("currency", event.target.value)
                }
              >
                <option value="">All currencies</option>
                {options.currencies.map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
              <select
                aria-label="Sort employees"
                value={sortBy}
                onChange={(event) =>
                  updateSort(event.target.value as SortField)
                }
              >
                <option value="employee_id">Sort: employee ID</option>
                <option value="name">Sort: name</option>
                <option value="department">Sort: team</option>
                <option value="country">Sort: country</option>
                <option value="status">Sort: status</option>
                <option value="annual_salary">Sort: salary</option>
              </select>
              <button
                className="icon-button sort-direction"
                title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
                aria-label={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
                onClick={() =>
                  setSortOrder((current) =>
                    current === "asc" ? "desc" : "asc",
                  )
                }
              >
                {sortOrder === "asc" ? (
                  <ArrowUp size={15} />
                ) : (
                  <ArrowDown size={15} />
                )}
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th
                      aria-sort={
                        sortBy === "name"
                          ? sortOrder === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        className="table-sort"
                        onClick={() => updateSort("name")}
                      >
                        EMPLOYEE
                        {sortBy === "name" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp size={11} />
                          ) : (
                            <ArrowDown size={11} />
                          ))}
                      </button>
                    </th>
                    <th
                      aria-sort={
                        sortBy === "department"
                          ? sortOrder === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        className="table-sort"
                        onClick={() => updateSort("department")}
                      >
                        TEAM
                        {sortBy === "department" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp size={11} />
                          ) : (
                            <ArrowDown size={11} />
                          ))}
                      </button>
                    </th>
                    <th
                      aria-sort={
                        sortBy === "country"
                          ? sortOrder === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        className="table-sort"
                        onClick={() => updateSort("country")}
                      >
                        LOCATION
                        {sortBy === "country" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp size={11} />
                          ) : (
                            <ArrowDown size={11} />
                          ))}
                      </button>
                    </th>
                    <th
                      aria-sort={
                        sortBy === "annual_salary"
                          ? sortOrder === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        className="table-sort"
                        onClick={() => updateSort("annual_salary")}
                      >
                        ANNUAL COMPENSATION
                        {sortBy === "annual_salary" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp size={11} />
                          ) : (
                            <ArrowDown size={11} />
                          ))}
                      </button>
                    </th>
                    <th
                      aria-sort={
                        sortBy === "status"
                          ? sortOrder === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        className="table-sort"
                        onClick={() => updateSort("status")}
                      >
                        STATUS
                        {sortBy === "status" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp size={11} />
                          ) : (
                            <ArrowDown size={11} />
                          ))}
                      </button>
                    </th>
                    <th>EFFECTIVE</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employeePage?.items.map((employee) => (
                    <tr key={employee.employee_id}>
                      <td>
                        <div className="employee-cell">
                          <div className="person-avatar">
                            {initials(employee)}
                          </div>
                          <div>
                            <strong>
                              {employee.first_name} {employee.last_name}
                            </strong>
                            <span>
                              {employee.employee_id} · {employee.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="department-name">
                          {employee.department}
                        </span>
                      </td>
                      <td>
                        <div className="location-cell">
                          <Building2 size={14} /> {employee.country}
                        </div>
                      </td>
                      <td>
                        <div className="salary-cell">
                          <strong>
                            {formatMoney(
                              employee.annual_salary,
                              employee.currency,
                            )}
                          </strong>
                          <span>{employee.currency} / year</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${employee.status.toLowerCase().replaceAll(" ", "-")}`}
                        >
                          <span />
                          {employee.status}
                        </span>
                      </td>
                      <td>
                        <span className="effective-date">
                          {new Intl.DateTimeFormat("en", {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          }).format(
                            new Date(`${employee.effective_date}T00:00:00`),
                          )}
                        </span>
                      </td>
                      <td>
                        <button
                          className="icon-button edit-button"
                          title={`Edit compensation for ${employee.first_name} ${employee.last_name}`}
                          aria-label={`Edit compensation for ${employee.first_name} ${employee.last_name}`}
                          onClick={() => {
                            setCreating(false);
                            setFormCountry(employee.country);
                            setFormCurrency(employee.currency);
                            setEditing(employee);
                          }}
                        >
                          <CircleDollarSign size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && !employeePage?.items.length && (
                    <tr>
                      <td className="empty-table" colSpan={7}>
                        No employees match these filters.
                      </td>
                    </tr>
                  )}
                  {loading && !employeePage && (
                    <tr>
                      <td className="empty-table" colSpan={7}>
                        Loading employee records…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>
                Showing{" "}
                <strong>
                  {employeePage?.total ? (page - 1) * pageSize + 1 : 0}–
                  {Math.min(page * pageSize, employeePage?.total ?? 0)}
                </strong>{" "}
                of{" "}
                <strong>
                  {(employeePage?.total ?? 0).toLocaleString("en")}
                </strong>
              </span>
              <div className="pagination">
                <button
                  className="icon-button"
                  aria-label="Previous page"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => current - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  Page <strong>{page}</strong> of <strong>{pageCount}</strong>
                </span>
                <button
                  className="icon-button"
                  aria-label="Next page"
                  disabled={page >= pageCount || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </section>
          <footer className="page-footer">
            <span>ACME SALARY INTELLIGENCE</span>
            <span>
              Amounts shown in local currency · Updated when compensation is
              saved
            </span>
          </footer>
        </div>
      </main>

      {(editing || creating) && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setEditing(null);
              setCreating(false);
            }
          }}
        >
          <section
            className="edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">
                  {creating ? "NEW EMPLOYEE" : "COMPENSATION RECORD"}
                </p>
                <h2 id="edit-title">
                  {creating ? "Add employee" : "Update salary"}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
            {editing && (
              <div className="modal-employee">
                <div className="person-avatar">{initials(editing)}</div>
                <div>
                  <strong>
                    {editing.first_name} {editing.last_name}
                  </strong>
                  <span>
                    {editing.employee_id} · {editing.department}
                  </span>
                </div>
              </div>
            )}
            <form onSubmit={saveCompensation}>
              {creating && (
                <>
                  <label>
                    Employee ID
                    <input
                      name="employee_id"
                      placeholder="AC-10001"
                      pattern="AC-[0-9]{5,}"
                      required
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      First name
                      <input name="first_name" maxLength={80} required />
                    </label>
                    <label>
                      Last name
                      <input name="last_name" maxLength={80} required />
                    </label>
                  </div>
                  <label>
                    Email
                    <input name="email" type="email" maxLength={180} required />
                  </label>
                  <div className="form-row">
                    <label>
                      Department
                      <select
                        name="department"
                        defaultValue={options.departments[0]}
                        required
                      >
                        {options.departments.map((department) => (
                          <option key={department}>{department}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Country
                      <select
                        name="country"
                        value={formCountry || options.countries[0] || ""}
                        onChange={(event) => {
                          const country = event.target.value;
                          setFormCountry(country);
                          const currency = options.country_currencies[country];
                          if (currency) setFormCurrency(currency);
                        }}
                        required
                      >
                        {options.countries.map((country) => (
                          <option key={country}>{country}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Status
                    <select name="status" defaultValue="Active">
                      <option>Active</option>
                      <option>On leave</option>
                      <option>Inactive</option>
                    </select>
                  </label>
                </>
              )}
              <label>
                Annual salary
                <div className="salary-input-wrap">
                  <span>
                    {currencySymbol(
                      formCurrency || options.currencies[0] || "USD",
                    )}
                  </span>
                  <input
                    name="annual_salary"
                    type="number"
                    min="1"
                    max="999999999"
                    step="0.01"
                    defaultValue={editing?.annual_salary}
                    required
                  />
                </div>
              </label>
              <label>
                Currency
                <select
                  name="currency"
                  value={formCurrency || options.currencies[0] || "USD"}
                  onChange={(event) => setFormCurrency(event.target.value)}
                  required
                >
                  {options.currencies.map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </select>
              </label>
              <label>
                Effective date
                <input
                  name="effective_date"
                  type="date"
                  defaultValue={
                    editing?.effective_date ??
                    new Date().toISOString().slice(0, 10)
                  }
                  required
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setEditing(null);
                    setCreating(false);
                  }}
                >
                  Cancel
                </button>
                <button className="button primary" disabled={saving}>
                  {saving
                    ? "Saving…"
                    : creating
                      ? "Create employee"
                      : "Save compensation"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;

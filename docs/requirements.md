# ACME Salary Intelligence — Product Requirements

## Goal

Replace ACME's spreadsheet-based salary management process with a reliable web application that allows an HR Manager to manage employee compensation data for 10,000 employees across multiple countries and answer questions about the organization's pay structure.

## Primary user

**HR Manager:** Needs a centralized, searchable view of employee compensation and trustworthy summaries to support HR decisions.

## Scope and features

1. **Employee directory:** View, search, sort and paginate employee records by employee ID, name, department, country and employment status.
2. **Salary management:** Create and edit employee salary records, with validation for required fields, valid salary amounts, currency and effective dates.
3. **Compensation overview:** Display total employees, total annual salary by currency, average salary, median salary and salary distributions. Clearly distinguish currencies rather than adding unlike amounts.
4. **Filtering and analysis:** Filter by country, department, employment status and currency. Provide summaries for the selected population.
5. **Salary insights:** Answer common questions through structured filters and predefined analytics, such as salary distribution by department, average salary by country and highest-paid employees within a selected currency.
6. **Data integrity:** Use a relational database, enforce employee identity constraints, validate inputs and use transactions for writes.
7. **Usability:** Provide a responsive interface, understandable error messages, loading and empty states, and clear feedback after saving changes.
8. **Reproducibility:** Supply a deterministic seed script for 10,000 employees, automated tests, setup instructions and a demo.

## Deliberately out of scope

- Payroll execution, bank transfers, tax filing and payslip generation: these require jurisdiction-specific rules and financial integrations.
- Live exchange-rate conversion: conversion introduces rate-source, timestamp and accounting-policy decisions. Initial analytics remain grouped by currency.
- Full authentication, enterprise SSO and fine-grained authorization: the assessment prototype focuses on the HR workflow; this must be addressed before real organizational deployment.
- Historical compensation approvals and complex audit workflows: basic effective dates and timestamps can be supported, but a full compliance-grade history system is deferred.
- AI-generated salary recommendations: salary decisions require explainability, fairness controls and reliable policy data. Initial insights use deterministic calculations.

## Success criteria

- The seeded database contains exactly 10,000 unique employees.
- HR can search, filter, paginate and update records through the UI.
- Analytics use the selected filters and produce reproducible results.
- Salary figures are never summed across currencies without explicit conversion.
- Core business logic and API behavior are covered by fast, deterministic tests.
- A new developer can run the application using the README.
- The application is deployed, and a short demonstration shows the main workflow.

## Key assumptions

The assessment does not define a compensation formula, country-specific salary rules or foreign-exchange policy. The prototype therefore stores explicitly stated salary amounts and currencies and avoids inventing payroll rules. These assumptions should be revisited with ACME HR before production use.

# Specification: Database Migration Tracking

## Naming Convention
-   **Format:** `YYYYMMDD_seq_description.sql`
-   **Examples:**
    -   `20260223_001_initial_schema.sql`
    -   `20260223_002_project_scoping.sql`
-   **Enforcement:** Files must begin with an 8-digit date and a 3-digit sequence number to ensure deterministic ordering.

## Migration Tracking Table
A new table `migrations` will be created in the `public` schema (project-independent, as it manages the physical schema):

```sql
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- The filename
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Migration Manager Logic
1.  **Check Table:** Ensure the `migrations` table exists.
2.  **Scan Directory:** Read all `.sql` files in `src/state/migrations/`.
3.  **Sort:** Sort files numerically/alphabetically by their prefix.
4.  **Filter:** Query the `migrations` table to find which files have already been applied.
5.  **Apply:** For each unapplied file:
    -   Start a Transaction.
    -   Execute the SQL content.
    -   Insert the filename into the `migrations` table.
    -   Commit Transaction.

## Transition Plan
-   Rename current migrations to follow the new format:
    -   `001_initial_schema.sql` -> `20260222_001_initial_schema.sql`
    -   `002_project_scoping.sql` -> `20260223_001_project_scoping.sql`
    -   `003_role_hierarchy.sql` -> `20260223_002_role_hierarchy.sql`

# payroll-backend

This backend no longer uses Supabase.  
It connects directly to a PostgreSQL database using the `pg` driver and stores uploaded task photos on local disk.

## Environment variables

Create a `.env` file in the project root with at least:

```bash
PORT=4000
DATABASE_URL=postgres://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME
```

Replace `USERNAME`, `PASSWORD`, `HOST`, and `DATABASE_NAME` with your own PostgreSQL connection details.

## Running locally

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

The API will be available at `http://localhost:4000`.

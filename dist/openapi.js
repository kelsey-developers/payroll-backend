"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openapiSpec = void 0;
const bearerAuth = {
    bearerAuth: [],
};
exports.openapiSpec = {
    openapi: '3.0.3',
    info: {
        title: "Kelsey's Payroll API",
        version: '1.0.0',
        description: 'DTR, Employees, Charges, and Payroll Periods for Kelsey\'s Homestay.',
    },
    servers: [
        { url: 'http://localhost:4000', description: 'Local dev' },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT from the auth service (kelsey.idateph.com)',
            },
        },
        schemas: {
            Employee: {
                type: 'object',
                properties: {
                    employee_id: { type: 'integer' },
                    employee_code: { type: 'string' },
                    full_name: { type: 'string' },
                    email: { type: 'string', nullable: true },
                    hire_date: { type: 'string', format: 'date' },
                    position: { type: 'string' },
                    employment_type: { type: 'string', enum: ['DAILY', 'MONTHLY', 'COMMISSION'] },
                    current_rate: { type: 'number' },
                    role: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'inactive'] },
                },
            },
            DTRRecord: {
                type: 'object',
                properties: {
                    dtr_id: { type: 'integer' },
                    employee_id: { type: 'integer' },
                    work_date: { type: 'string', format: 'date' },
                    time_in: { type: 'string', format: 'date-time', nullable: true },
                    time_out: { type: 'string', format: 'date-time', nullable: true },
                    hours_worked: { type: 'number' },
                    overtime_hours: { type: 'number' },
                    status: { type: 'string', enum: ['OPEN', 'CLOSED'] },
                    shift_start: { type: 'string', example: '09:00', nullable: true },
                    shift_end: { type: 'string', example: '15:00', nullable: true },
                    notes: { type: 'string', nullable: true },
                    full_name: { type: 'string' },
                    position: { type: 'string' },
                    employee_code: { type: 'string' },
                },
            },
            Charge: {
                type: 'object',
                properties: {
                    charge_id: { type: 'integer' },
                    employee_id: { type: 'integer' },
                    charge_date: { type: 'string', format: 'date' },
                    description: { type: 'string' },
                    amount: { type: 'number' },
                },
            },
            PayrollPeriod: {
                type: 'object',
                properties: {
                    payroll_id: { type: 'string' },
                    period_start: { type: 'string', format: 'date' },
                    period_end: { type: 'string', format: 'date' },
                    status: { type: 'string', enum: ['pending', 'approved', 'processed', 'paid'] },
                    total_gross: { type: 'number' },
                    total_deductions: { type: 'number' },
                    total_net_pay: { type: 'number' },
                    employee_count: { type: 'integer' },
                    notes: { type: 'string', nullable: true },
                },
            },
            Error: {
                type: 'object',
                properties: {
                    error: { type: 'string' },
                },
            },
        },
    },
    paths: {
        // ── Health ──────────────────────────────────────────────────────────────
        '/health': {
            get: {
                tags: ['System'],
                summary: 'Health check',
                responses: {
                    '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } },
                },
            },
        },
        // ── Employees ───────────────────────────────────────────────────────────
        '/api/employees/roles': {
            get: {
                tags: ['Employees'],
                summary: 'Get email→role map (public)',
                description: 'Returns an object mapping each employee email to their role. No auth required.',
                responses: {
                    '200': { description: 'Email to role map', content: { 'application/json': { schema: { type: 'object', additionalProperties: { type: 'string' } } } } },
                },
            },
        },
        '/api/employees': {
            get: {
                tags: ['Employees'],
                summary: 'List all employees',
                security: [bearerAuth],
                parameters: [
                    { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive'] } },
                ],
                responses: {
                    '200': { description: 'Employee list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Employee' } } } } },
                },
            },
            post: {
                tags: ['Employees'],
                summary: 'Create an employee',
                security: [bearerAuth],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['full_name', 'position', 'employment_type', 'current_rate', 'hire_date'],
                                properties: {
                                    full_name: { type: 'string' },
                                    email: { type: 'string' },
                                    hire_date: { type: 'string', format: 'date' },
                                    position: { type: 'string' },
                                    employment_type: { type: 'string', enum: ['DAILY', 'MONTHLY', 'COMMISSION'] },
                                    current_rate: { type: 'number' },
                                    role: { type: 'string', default: 'employee' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } } },
                    '400': { description: 'Bad request' },
                },
            },
        },
        '/api/employees/{id}': {
            get: {
                tags: ['Employees'],
                summary: 'Get employee by ID',
                security: [bearerAuth],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Employee', content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } } },
                    '404': { description: 'Not found' },
                },
            },
            put: {
                tags: ['Employees'],
                summary: 'Update employee',
                security: [bearerAuth],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    full_name: { type: 'string' },
                                    email: { type: 'string' },
                                    position: { type: 'string' },
                                    employment_type: { type: 'string', enum: ['DAILY', 'MONTHLY', 'COMMISSION'] },
                                    current_rate: { type: 'number' },
                                    role: { type: 'string' },
                                    status: { type: 'string', enum: ['active', 'inactive'] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } } },
                    '404': { description: 'Not found' },
                },
            },
            delete: {
                tags: ['Employees'],
                summary: 'Delete employee',
                security: [bearerAuth],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Deleted' },
                    '404': { description: 'Not found' },
                },
            },
        },
        // ── DTR — Public (no auth) ───────────────────────────────────────────────
        '/api/dtr/public/employees': {
            get: {
                tags: ['DTR — Public'],
                summary: 'List active employees (for QR scan page)',
                responses: {
                    '200': { description: 'Active employees', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Employee' } } } } },
                },
            },
        },
        '/api/dtr/public/today/{employee_id}': {
            get: {
                tags: ['DTR — Public'],
                summary: "Get today's DTR for an employee",
                parameters: [{ name: 'employee_id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'DTR record or null', content: { 'application/json': { schema: { oneOf: [{ $ref: '#/components/schemas/DTRRecord' }, { type: 'object', nullable: true }] } } } },
                },
            },
        },
        '/api/dtr/public/clock-in': {
            post: {
                tags: ['DTR — Public'],
                summary: 'Clock in by employee_id (QR scan)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['employee_id'],
                                properties: {
                                    employee_id: { type: 'integer' },
                                    shift_start: { type: 'string', example: '09:00', description: 'HH:MM format' },
                                    shift_end: { type: 'string', example: '15:00', description: 'HH:MM format' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'DTR record', content: { 'application/json': { schema: { $ref: '#/components/schemas/DTRRecord' } } } },
                    '409': { description: 'Already clocked in' },
                },
            },
        },
        '/api/dtr/public/clock-out': {
            post: {
                tags: ['DTR — Public'],
                summary: 'Clock out by employee_id (QR scan)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['employee_id'],
                                properties: {
                                    employee_id: { type: 'integer' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Updated DTR record', content: { 'application/json': { schema: { $ref: '#/components/schemas/DTRRecord' } } } },
                    '409': { description: 'Not clocked in / already clocked out' },
                },
            },
        },
        // ── DTR — Employee self-service (auth required) ─────────────────────────
        '/api/dtr/my-profile': {
            get: {
                tags: ['DTR — Employee'],
                summary: 'Get own employee profile',
                security: [bearerAuth],
                responses: {
                    '200': { description: 'Employee profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } } },
                    '401': { description: 'Unauthorized' },
                    '404': { description: 'No employee record linked to account' },
                },
            },
        },
        '/api/dtr/my': {
            get: {
                tags: ['DTR — Employee'],
                summary: 'Get own DTR records',
                security: [bearerAuth],
                parameters: [
                    { name: 'start', in: 'query', schema: { type: 'string', format: 'date' } },
                    { name: 'end', in: 'query', schema: { type: 'string', format: 'date' } },
                ],
                responses: {
                    '200': { description: 'DTR records', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DTRRecord' } } } } },
                },
            },
        },
        '/api/dtr/clock-in': {
            post: {
                tags: ['DTR — Employee'],
                summary: 'Clock in (authenticated employee)',
                security: [bearerAuth],
                responses: {
                    '201': { description: 'DTR record', content: { 'application/json': { schema: { $ref: '#/components/schemas/DTRRecord' } } } },
                    '409': { description: 'Already clocked in' },
                },
            },
        },
        '/api/dtr/clock-out': {
            post: {
                tags: ['DTR — Employee'],
                summary: 'Clock out (authenticated employee)',
                security: [bearerAuth],
                responses: {
                    '200': { description: 'Updated DTR record', content: { 'application/json': { schema: { $ref: '#/components/schemas/DTRRecord' } } } },
                    '409': { description: 'Not clocked in / already clocked out' },
                },
            },
        },
        // ── DTR — Admin ─────────────────────────────────────────────────────────
        '/api/dtr/scan-clock': {
            post: {
                tags: ['DTR — Admin'],
                summary: 'Admin scans employee QR to clock in or out',
                security: [bearerAuth],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['employee_code', 'action'],
                                properties: {
                                    employee_code: { type: 'string' },
                                    action: { type: 'string', enum: ['in', 'out'] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'DTR record', content: { 'application/json': { schema: { $ref: '#/components/schemas/DTRRecord' } } } },
                    '404': { description: 'Employee not found' },
                    '409': { description: 'Already clocked in/out' },
                },
            },
        },
        '/api/dtr': {
            get: {
                tags: ['DTR — Admin'],
                summary: 'List DTR records',
                security: [bearerAuth],
                parameters: [
                    { name: 'start', in: 'query', schema: { type: 'string', format: 'date' } },
                    { name: 'end', in: 'query', schema: { type: 'string', format: 'date' } },
                    { name: 'employee_id', in: 'query', schema: { type: 'integer' } },
                ],
                responses: {
                    '200': { description: 'DTR records', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DTRRecord' } } } } },
                },
            },
            post: {
                tags: ['DTR — Admin'],
                summary: 'Create a DTR record manually',
                security: [bearerAuth],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['employee_id', 'work_date'],
                                properties: {
                                    employee_id: { type: 'integer' },
                                    work_date: { type: 'string', format: 'date' },
                                    time_in: { type: 'string', format: 'date-time' },
                                    time_out: { type: 'string', format: 'date-time' },
                                    notes: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/DTRRecord' } } } },
                },
            },
        },
        '/api/dtr/{id}': {
            put: {
                tags: ['DTR — Admin'],
                summary: 'Update a DTR record',
                security: [bearerAuth],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    work_date: { type: 'string', format: 'date' },
                                    time_in: { type: 'string', format: 'date-time' },
                                    time_out: { type: 'string', format: 'date-time' },
                                    status: { type: 'string', enum: ['OPEN', 'CLOSED'] },
                                    notes: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/DTRRecord' } } } },
                    '404': { description: 'Not found' },
                },
            },
            delete: {
                tags: ['DTR — Admin'],
                summary: 'Delete a DTR record',
                security: [bearerAuth],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Deleted' },
                    '404': { description: 'Not found' },
                },
            },
        },
        // ── Charges ─────────────────────────────────────────────────────────────
        '/api/charges': {
            get: {
                tags: ['Charges'],
                summary: 'List charges',
                security: [bearerAuth],
                parameters: [
                    { name: 'employee_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'start', in: 'query', schema: { type: 'string', format: 'date' } },
                    { name: 'end', in: 'query', schema: { type: 'string', format: 'date' } },
                ],
                responses: {
                    '200': { description: 'Charges', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Charge' } } } } },
                },
            },
            post: {
                tags: ['Charges'],
                summary: 'Create a charge',
                security: [bearerAuth],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['employee_id', 'charge_date', 'description', 'amount'],
                                properties: {
                                    employee_id: { type: 'integer' },
                                    charge_date: { type: 'string', format: 'date' },
                                    description: { type: 'string' },
                                    amount: { type: 'number' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Charge' } } } },
                },
            },
        },
        '/api/charges/{id}': {
            put: {
                tags: ['Charges'],
                summary: 'Update a charge',
                security: [bearerAuth],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                requestBody: {
                    content: { 'application/json': { schema: { type: 'object', properties: { description: { type: 'string' }, amount: { type: 'number' } } } } },
                },
                responses: {
                    '200': { description: 'Updated' },
                    '404': { description: 'Not found' },
                },
            },
            delete: {
                tags: ['Charges'],
                summary: 'Delete a charge',
                security: [bearerAuth],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                responses: {
                    '200': { description: 'Deleted' },
                    '404': { description: 'Not found' },
                },
            },
        },
        // ── Payroll Periods ──────────────────────────────────────────────────────
        '/api/payroll-periods': {
            get: {
                tags: ['Payroll Periods'],
                summary: 'List payroll periods',
                security: [bearerAuth],
                responses: {
                    '200': { description: 'Payroll periods', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PayrollPeriod' } } } } },
                },
            },
        },
        '/api/payroll-periods/generate': {
            post: {
                tags: ['Payroll Periods'],
                summary: 'Generate a payroll period',
                security: [bearerAuth],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['period_start', 'period_end'],
                                properties: {
                                    period_start: { type: 'string', format: 'date' },
                                    period_end: { type: 'string', format: 'date' },
                                    notes: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/PayrollPeriod' } } } },
                    '400': { description: 'Bad request' },
                },
            },
        },
        '/api/payroll-periods/{id}': {
            get: {
                tags: ['Payroll Periods'],
                summary: 'Get a payroll period by ID',
                security: [bearerAuth],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    '200': { description: 'Payroll period', content: { 'application/json': { schema: { $ref: '#/components/schemas/PayrollPeriod' } } } },
                    '404': { description: 'Not found' },
                },
            },
            patch: {
                tags: ['Payroll Periods'],
                summary: 'Update payroll period status',
                security: [bearerAuth],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['status'],
                                properties: {
                                    status: { type: 'string', enum: ['pending', 'approved', 'processed', 'paid'] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Updated' },
                    '400': { description: 'Bad request' },
                    '404': { description: 'Not found' },
                },
            },
            delete: {
                tags: ['Payroll Periods'],
                summary: 'Delete a payroll period',
                security: [bearerAuth],
                parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                responses: {
                    '200': { description: 'Deleted' },
                    '404': { description: 'Not found' },
                },
            },
        },
    },
};

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: "Kelsey's Homestay API",
    version: '1.0.0',
    description: 'Backend API for DTR, Employees, and Payroll.',
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Local dev' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'OK',
          },
        },
      },
    },

    // -------------------- Employees --------------------
    '/api/employees': {
      get: {
        summary: 'List employees',
        responses: {
          '200': {
            description: 'Employees',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Employee' },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create employee',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateEmployeeRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Employee' },
              },
            },
          },
          '400': { description: 'Bad request' },
          '500': { description: 'Server error' },
        },
      },
    },

    // -------------------- Sites --------------------
    '/api/sites': {
      get: {
        summary: 'List QR sites (units/locations)',
        responses: {
          '200': {
            description: 'Sites',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Site' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Create a new QR site',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateSiteRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created site',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Site' },
              },
            },
          },
          '400': { description: 'Bad request' },
        },
      },
    },

    // -------------------- DTR --------------------
    '/api/dtr': {
      get: {
        summary: 'Get DTR by employee and date',
        parameters: [
          { name: 'employee_id', in: 'query', required: true, schema: { type: 'integer' } },
          { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'DTR record or null',
            content: {
              'application/json': {
                schema: { oneOf: [{ $ref: '#/components/schemas/DTRRecord' }, { type: 'null' }] },
              },
            },
          },
          '400': { description: 'Bad request' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/dtr/time-in': {
      post: {
        summary: 'Time in (requires on-site QR site_id)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TimeInRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created DTR record',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DTRRecord' } },
            },
          },
          '400': { description: 'Bad request / invalid site_id' },
          '403': { description: 'Outside allowed area' },
          '409': { description: 'Already timed in' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/dtr/time-out': {
      post: {
        summary: 'Time out (requires on-site QR site_id)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TimeOutRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated DTR record',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DTRRecord' } },
            },
          },
          '400': { description: 'Bad request / site mismatch' },
          '403': { description: 'Outside allowed area' },
          '404': { description: 'DTR not found' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/dtr/tasks': {
      get: {
        summary: 'Get task logs for an employee on a date',
        parameters: [
          { name: 'employee_id', in: 'query', required: true, schema: { type: 'integer' } },
          { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'Task logs',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/TaskLog' } },
              },
            },
          },
        },
      },
      post: {
        summary: 'Upload task photo (multipart/form-data)',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/UploadTaskRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created task log',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TaskLog' } },
            },
          },
        },
      },
    },
    '/api/dtr/summary': {
      get: {
        summary: 'DTR summary (days worked per employee)',
        parameters: [
          { name: 'start', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'end', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': {
            description: 'Summary rows',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/DTRSummaryRow' } },
              },
            },
          },
        },
      },
    },

    // -------------------- Payroll --------------------
    '/api/payroll': {
      get: {
        summary: 'List payroll records',
        parameters: [
          {
            name: 'type',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['DAILY', 'MONTHLY', 'COMMISSION', 'all'] },
          },
        ],
        responses: {
          '200': {
            description: 'Payroll records',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/PayrollRecord' } },
              },
            },
          },
        },
      },
    },
    '/api/payroll/generate': {
      post: {
        summary: 'Generate payroll record (manual inputs)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GeneratePayrollRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Bad request' },
          '500': { description: 'Server error' },
        },
      },
    },
    '/api/payroll/{id}': {
      get: {
        summary: 'Get payroll record by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Payroll record' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/payroll/{id}/status': {
      patch: {
        summary: 'Update payroll status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdatePayrollStatusRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Updated' },
          '400': { description: 'Bad request' },
        },
      },
    },
    '/api/payroll/commission/mark-paid': {
      patch: {
        summary: 'Mark commission booking as paid',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MarkCommissionPaidRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Updated' },
        },
      },
    },
  },
  components: {
    schemas: {
      Employee: {
        type: 'object',
        properties: {
          employee_id: { type: 'integer' },
          full_name: { type: 'string' },
          position: { type: 'string' },
          employment_type: { type: 'string', enum: ['DAILY', 'MONTHLY', 'COMMISSION'] },
          current_rate: { type: 'number' },
          role: { type: 'string' },
        },
      },
      Site: {
        type: 'object',
        properties: {
          site_id: { type: 'string' },
          name: { type: 'string' },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
          radius_m: { type: 'integer', nullable: true },
        },
      },
      CreateSiteRequest: {
        type: 'object',
        required: ['site_id', 'name'],
        properties: {
          site_id: { type: 'string' },
          name: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          radius_m: { type: 'integer' },
        },
      },
      CreateEmployeeRequest: {
        type: 'object',
        required: ['full_name', 'position', 'employment_type', 'current_rate'],
        properties: {
          full_name: { type: 'string' },
          position: { type: 'string' },
          employment_type: { type: 'string', enum: ['DAILY', 'MONTHLY', 'COMMISSION'] },
          current_rate: { type: 'number' },
          role: { type: 'string' },
        },
      },
      DTRRecord: {
        type: 'object',
        properties: {
          dtr_id: { type: 'integer' },
          employee_id: { type: 'integer' },
          work_date: { type: 'string', format: 'date' },
          time_in: { type: 'string', format: 'date-time' },
          time_out: { type: 'string', format: 'date-time', nullable: true },
          hours_worked: { type: 'number', nullable: true },
          status: { type: 'string', enum: ['OPEN', 'CLOSED'] },
          shift_start: { type: 'string', nullable: true },
          shift_end: { type: 'string', nullable: true },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
          site_id: { type: 'string', nullable: true },
        },
      },
      TaskLog: {
        type: 'object',
        properties: {
          task_id: { type: 'integer' },
          dtr_id: { type: 'integer' },
          employee_id: { type: 'integer' },
          unit_name: { type: 'string' },
          task_type: { type: 'string' },
          proof_photo_url: { type: 'string' },
          completed_at: { type: 'string', format: 'date-time' },
          status: { type: 'string' },
        },
      },
      UploadTaskRequest: {
        type: 'object',
        required: ['employee_id', 'dtr_id', 'task_type', 'location'],
        properties: {
          file: { type: 'string', format: 'binary' },
          employee_id: { type: 'string' },
          dtr_id: { type: 'string' },
          task_type: { type: 'string' },
          location: { type: 'string' },
          completed_at: { type: 'string', format: 'date-time' },
        },
      },
      TimeInRequest: {
        type: 'object',
        required: ['employee_id', 'work_date', 'site_id'],
        properties: {
          employee_id: { type: 'integer' },
          work_date: { type: 'string', format: 'date' },
          shift_start: { type: 'string' },
          shift_end: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          site_id: { type: 'string' },
        },
      },
      TimeOutRequest: {
        type: 'object',
        required: ['employee_id', 'dtr_id', 'site_id'],
        properties: {
          employee_id: { type: 'integer' },
          dtr_id: { type: 'integer' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          site_id: { type: 'string' },
        },
      },
      DTRSummaryRow: {
        type: 'object',
        properties: {
          employee_id: { type: 'integer' },
          employee: { $ref: '#/components/schemas/Employee' },
          days_worked: { type: 'integer' },
          total_hours: { type: 'number' },
        },
      },
      PayrollRecord: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          employment_type: { type: 'string', enum: ['DAILY', 'MONTHLY', 'COMMISSION'] },
          employee_id: { type: 'integer', nullable: true },
          agent_id: { type: 'integer', nullable: true },
          payPeriodStart: { type: 'string', format: 'date' },
          payPeriodEnd: { type: 'string', format: 'date' },
          status: { type: 'string' },
          daysWorked: { type: 'integer', nullable: true },
          dailyRate: { type: 'number', nullable: true },
          monthlyRate: { type: 'number', nullable: true },
          grossIncome: { type: 'number' },
          totalDeductions: { type: 'number' },
          netPay: { type: 'number' },
          reference_number: { type: 'string' },
        },
      },
      GeneratePayrollRequest: {
        type: 'object',
        required: ['employment_type', 'pay_period_start', 'pay_period_end'],
        properties: {
          employment_type: { type: 'string', enum: ['DAILY', 'MONTHLY', 'COMMISSION'] },
          employee_id: { type: 'integer' },
          agent_id: { type: 'integer' },
          pay_period_start: { type: 'string', format: 'date' },
          pay_period_end: { type: 'string', format: 'date' },
          days_worked: { type: 'integer' },
          daily_rate: { type: 'number' },
          monthly_rate: { type: 'number' },
          booking_commissions: { type: 'array', items: { type: 'number' } },
        },
      },
      UpdatePayrollStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['pending', 'approved', 'processed', 'paid', 'declined'] },
          payment_date: { type: 'string', format: 'date' },
        },
      },
      MarkCommissionPaidRequest: {
        type: 'object',
        required: ['payroll_id', 'booking_id'],
        properties: {
          payroll_id: { type: 'string' },
          booking_id: { type: 'integer' },
          gcash_reference: { type: 'string' },
          gcash_receipt_url: { type: 'string' },
        },
      },
    },
  },
} as const;


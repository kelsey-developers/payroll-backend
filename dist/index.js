"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const dtr_1 = __importDefault(require("./routes/dtr"));
const payroll_1 = __importDefault(require("./routes/payroll"));
const employees_1 = __importDefault(require("./routes/employees"));
const sites_1 = __importDefault(require("./routes/sites"));
const openapi_1 = require("./openapi");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT ?? 4000;
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json());
// Routes
app.use('/api/dtr', dtr_1.default);
app.use('/api/payroll', payroll_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/sites', sites_1.default);
// Swagger / OpenAPI
app.get('/openapi.json', (_req, res) => {
    res.json(openapi_1.openapiSpec);
});
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openapi_1.openapiSpec));
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});

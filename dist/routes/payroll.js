"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payrollController_1 = require("../controllers/payrollController");
const router = (0, express_1.Router)();
// Specific routes first — must come before /:id to avoid param capture
router.post('/generate', payrollController_1.generatePayroll);
router.post('/preview', payrollController_1.previewPayroll);
router.patch('/commission/mark-paid', payrollController_1.markCommissionPaid);
// Parameterized routes last
router.get('/', payrollController_1.getPayroll);
router.get('/:id', payrollController_1.getPayrollById);
router.patch('/:id/status', payrollController_1.updatePayrollStatus);
exports.default = router;

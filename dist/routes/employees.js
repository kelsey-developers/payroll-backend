"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employeesController_1 = require("../controllers/employeesController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public — returns { email: 'employee' } map so the frontend can resolve role without market backend
router.get('/roles', employeesController_1.getEmployeeRoles);
// Public — used by manage-users to assign the Employee role without going through the auth service
router.patch('/roles', employeesController_1.patchEmployeeRole);
router.get('/', auth_1.requireAuth, employeesController_1.listEmployees);
router.get('/:id', auth_1.requireAuth, employeesController_1.getEmployee);
router.post('/', auth_1.requireAuth, employeesController_1.createEmployee);
router.put('/:id', auth_1.requireAuth, employeesController_1.updateEmployee);
router.patch('/:id', auth_1.requireAuth, employeesController_1.updateEmployee);
router.delete('/:id', auth_1.requireAuth, employeesController_1.deleteEmployee);
exports.default = router;

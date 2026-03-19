"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminDtrController_1 = require("../controllers/adminDtrController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public — no auth, used by /dtr/scan/[token] QR page
router.get('/public/employees', adminDtrController_1.publicGetEmployees);
router.get('/public/today/:employee_id', adminDtrController_1.publicGetToday);
router.post('/public/clock-in', adminDtrController_1.publicClockIn);
router.post('/public/clock-out', adminDtrController_1.publicClockOut);
// Employee self-service — must be before /:id
router.get('/my-profile', auth_1.requireAuth, adminDtrController_1.getMyProfile);
router.get('/my', auth_1.requireAuth, adminDtrController_1.getMyDTR);
router.post('/clock-in', auth_1.requireAuth, adminDtrController_1.clockIn);
router.post('/clock-out', auth_1.requireAuth, adminDtrController_1.clockOut);
// Admin QR scanner clock — requires admin/HR auth
router.post('/scan-clock', auth_1.requireAuth, adminDtrController_1.scanClock);
router.get('/', auth_1.requireAuth, adminDtrController_1.listDTR);
router.post('/', auth_1.requireAuth, adminDtrController_1.createDTR);
router.put('/:id', auth_1.requireAuth, adminDtrController_1.updateDTR);
router.delete('/:id', auth_1.requireAuth, adminDtrController_1.deleteDTR);
exports.default = router;

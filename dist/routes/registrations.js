"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const registrationsController_1 = require("../controllers/registrationsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public — employees submit their own registration request
router.post('/', registrationsController_1.submitRegistration);
// Admin only
router.get('/', auth_1.requireAuth, registrationsController_1.listRegistrations);
router.patch('/:id', auth_1.requireAuth, registrationsController_1.reviewRegistration);
exports.default = router;

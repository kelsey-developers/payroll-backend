"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sitesController_1 = require("../controllers/sitesController");
const router = (0, express_1.Router)();
router.get('/', sitesController_1.getSites);
router.post('/', sitesController_1.createSite);
exports.default = router;

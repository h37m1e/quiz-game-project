const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");

// GET /api/questions/, /api/questions?keyword=http
router.get("/", async (req, res) => {
    const { keyword } = req.query;
    const where = keyword
        ? { keywords: { some: { name: keyword } } }
        : {};

    const questions = await prisma.question.findMany({
        where,
        include: { keywords: true },
        orderBy: { id: "asc" },
    });

    res.json(questions);
});

// GET /api/questions/:qId
router.get("/:qId", async (req, res) => {
    const qId = Number(req.params.qId);
    const question = await prisma.question.findUnique({
        where: { id: qId },
        include: { keywords: true },
    });

    if (!question) {
        return res.status(404).json({ msg: "Question not found" });
    }
    res.json(question);
});

// POST /api/questions
router.post("/", async (req, res) => {
    const { question, subject, answer, keywords } = req.body;
    if (!question || !subject || !answer) {
        return res.status(400).json({ msg: "Question, subject and answer are required" });
    }
    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const newQuestion = await prisma.question.create({
        data: {
            question, subject, answer,
            keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw },
                    create: { name: kw },
                })),
            },
        },
        include: { keywords: true },
    });
    res.status(201).json(newQuestion);
});

// PUT /api/questions/:qId
router.put("/:qId", async (req, res) => {
    const qId = Number(req.params.qId);
    const { question, subject, answer, keywords } = req.body;

    const existing = await prisma.question.findUnique({ where: { id: qId } });
    if (!existing) {
        return res.status(404).json({ msg: "Question not found" });
    }

    if (!question || !subject || !answer) {
        return res.status(400).json({ msg: "question, subject and answer are required" });
    }

    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const updated = await prisma.question.update({
        where: { id: qId },
        data: {
            question, subject, answer,
            keywords: {
                set: [],
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw },
                    create: { name: kw },
                })),
            },
        },
        include: { keywords: true },
    });
    res.json(updated);
});

// DELETE /api/questions/:qId
router.delete("/:qId", async (req, res) => {
    const qId = Number(req.params.qId);
    const existing = await prisma.question.findUnique({ where: { id: qId } });

    if (!existing) {
        return res.status(404).json({ msg: "Question not found" });
    }

    const deleted = await prisma.question.delete({ where: { id: qId } });
    res.json({ msg: "Question deleted successfully", question: deleted });
});

module.exports = router;
const express = require('express');
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require('../middleware/auth');
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "public", "uploads"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const newName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, newName)
    }
  });

  const upload = multer({
    storage, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/"))
            cb(null, true);
        else cb(new Error("Only images allowed"));
    },
    limits: {fileSize: 5 * 1024 * 1024},
  });
  
  

function formatQuestion(question){
    return {
        ...question,
        keywords: question.keywords.map((k) => k.name),
        userName: question.user?.name || null,
        attempted: question.attempts?.some(a => a.correct),
        attemptCount: question._count?.attempts ?? 0,
        user: undefined,
        _count: undefined,
        attempts: undefined,
    };
}
    

router.use(authenticate);

// GET /api/questions/, /api/questions?keyword=http&page=1&limit=5
router.get("/", async (req, res) => {
    const { keyword } = req.query;
    const where = keyword
        ? { keywords: { some: { name: keyword } } } : {};

        const page =  Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) ||5));
        const skip = (page - 1) * limit;

    const [filteredQuestions, total] = await Promise.all([prisma.question.findMany({
        where,
        include: { keywords: true,
             user: true,
             attempts: {where: {userId: req.user.userId}, take: 1},
             _count: {select: {attempts: true}},
            },
        orderBy: { id: "asc" },
        skip,
        take: limit
    }), prisma.question.count({where}),
]);

    res.json({
        data:filteredQuestions.map(formatQuestion),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    
    })
});

// GET /api/questions/:qId
router.get("/:qId", async (req, res) => {
    const qId = Number(req.params.qId);
    const question = await prisma.question.findUnique({
        where: { id: qId },
        include: { 
            keywords: true, 
            user: true,
            attempts: { where: { userId: req.user.userId }, take: 1 },
            _count: { select: { attempts: true } },
        },
    });

    if (!question) {
        return res.status(404).json({ msg: "Question not found" });
    }
    res.json(formatQuestion(question));
});

// POST /api/questions
router.post("/", upload.single("image"), async (req, res) => {
    const { question, subject, answer, keywords } = req.body;
    if (!question || !subject || !answer) {
        return res.status(400).json({ msg: "Question, subject and answer are required" });
    }
    const keywordsArray = Array.isArray(keywords) ? keywords : [];
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;    
    const newQuestion = await prisma.question.create({
        data: {
            question, subject, answer, imageUrl,
            userId: req.user.userId,
            keywords: {
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw },
                    create: { name: kw },
                })),
            },
        },
        include: { keywords: true, user: true },
    });
    res.status(201).json(newQuestion);
});

// PUT /api/questions/:qId
router.put("/:qId",isOwner,  upload.single("image"), async (req, res) => {
    const qId = Number(req.params.qId);
    const { question, subject, answer, keywords } = req.body;

    const existing = await prisma.question.findUnique({ where: { id: qId } });
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;    
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
            question, subject, answer, imageUrl,
            keywords: {
                set: [],
                connectOrCreate: keywordsArray.map((kw) => ({
                    where: { name: kw },
                    create: { name: kw },
                })),
            },
        },
        include: { keywords: true, user: true },
    });
    res.json(updated);
});

// DELETE /api/questions/:qId
router.delete("/:qId", isOwner, async (req, res) => {
    const qId = Number(req.params.qId);
    const existing = await prisma.question.findUnique({ where: { id: qId } });

    if (!existing) {
        return res.status(404).json({ msg: "Question not found" });
    }

    const deleted = await prisma.question.delete({ where: { id: qId } });
    res.json({ msg: "Question deleted successfully", question: deleted });
});

// Attempt /api/questions/:questionId/attempt

router.post("/:questionId/attempt", async (req, res) => {
    const questionId = Number(req.params.questionId);
    const { answer } = req.body;

    const question = await prisma.question.findUnique({
        where: { id: questionId }
    });

    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    const isCorrect =
        answer.trim().toLowerCase() ===
        question.answer.trim().toLowerCase();

    const attempt = await prisma.attempt.create({
    data: {
        userId: req.user.userId,
        questionId,
        correct: isCorrect
    }
});

    const attemptCount = await prisma.attempt.count({
        where: { questionId }
    });

    res.status(201).json({
        correct: isCorrect,
        correctAnswer: question.answer,
        questionId,
        attempted: true,
        attemptCount,
        createdAt: attempt.createdAt
    });
});

//DELETE /api/questions/:questionId/attempt

router.delete("/:questionId/attempt", async (req, res) => {
    const questionId = Number(req.params.questionId);

    const question = await prisma.question.findUnique({ where: {id: questionId } });
    if (!question) {
        return res.status(404).json({ message: "Question not found" });
    }

    await prisma.attempt.deleteMany({
        where: { userId: req.user.userId, questionId },
    });

    const attemptCount = await prisma.attempt.count({ where: { questionId } });

    res.json({ questionId, attempted: false, attemptCount });
});





module.exports = router;
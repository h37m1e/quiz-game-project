const express = require('express');
const router = express.Router();

const questions = require("../data/questions")

// GET /api/questions/, /api/questions?keyword=http
router.get("/", (req, res) => {
    const {keyword} = req.query;
    
    if(!keyword) {
        return res.json(questions);
    }
    const filteredQuestions = questions.filter(p=>p.keywords.includes(keyword));
    res.json(filteredQuestions);
});

// GET /api/questions/ :qId
router.get("/:qId", (req, res) =>{
    const qId = Number(req.params.qId)
    const question = questions.find(p=> p.id === qId);
    if (!question){
        return res.status(404).json({msg:"Question not found"});
    }
    res.json(question);

});

// POST  /api/questions

router.post("/", (req, res) => {
    const { Question, subject, answer, keywords } = req.body;
    if (!Question || !subject || !answer) {
        return res.status(400).json({ msg: "Question, subject and answer are required" });
    }
    const maxId = questions.length ? Math.max(...questions.map(p => p.id)) : 0;
    const newQuestion = {
        id: maxId + 1,
        Question, subject, answer,
        keywords: Array.isArray(keywords) ? keywords : []
    };
    questions.push(newQuestion);
    res.status(201).json(newQuestion);
});

//PUT /api/questions/:qId

router.put("/:qId", (req, res) => {
    const qId = Number(req.params.qId)
    const question = questions.find(p=> p.id === qId);

    if (!question){
        return res.status(404).json({msg:"Question not found"});
    }

    const { Question, subject, answer, keywords } = req.body;
    if (!Question || !subject || !answer) {
        return res.status(400).json({ msg: "Question, subject and answer are required" });
    }
    question.Question = Question;
    question.subject = subject;
    question.answer = answer;
    question.keywords = Array.isArray(keywords) ? keywords : [];

    res.json(question);
});
// DELETE /api/questions/:qId

router.delete("/:qId", (req, res) => {
    const qId = Number(req.params.qId);
    const postIndex = questions.findIndex(p => p.id === qId);

    if(postIndex === -1){
        return res.status(404).json({msg:"Question not found"})
    }
    const deletedPost = questions.splice(postIndex,1);
    res.json({
        msg:"Question deleted successfully",
        post: deletedPost
    })
});
module.exports = router;
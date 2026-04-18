const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const seedQuestions = [
    {
      Question: "What is the capital of Finland?",
      answer: "Helsinki",
      subject: "Geography",
      keywords: ["helsinki", "capital"]
    },
    {
      Question: "What is 2 + 2",
      answer: "4",
      subject: "Math",
      keywords: ["math", "addition"]
    },
    {
      Question: "What language does Finnish people speak?",
      answer: "Finnish",
      subject: "Language",
      keywords: ["language", "finnish"]
    },
    {
      Question: "What color is banana?",
      answer: "Yellow",
      subject: "banana",
      keywords: ["banana", "color"]
    },
];

async function main() {
  await prisma.question.deleteMany();
  await prisma.keyword.deleteMany();

  for (const q of seedQuestions) {
    await prisma.question.create({
      data: {
        question: q.Question,
        answer: q.answer,
        subject: q.subject,
        keywords: {
          connectOrCreate: q.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


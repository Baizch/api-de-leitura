import express, { Application, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from 'uuid';

const app: Application = express();
const port: number = 3000;

const prisma = new PrismaClient();

app.use(express.json());

// Gemini config
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Validation Schema
const schema = Joi.object({
  image: Joi.string().base64(),
  customer_code: Joi.string().required(),
  measure_datetime: Joi.date().iso().required(),
  measure_type: Joi.string().valid('WATER', 'GAS', 'water', 'gas').required()
});

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World with TypeScript!');
});

app.get('/upload', async (req: Request, res: Response) => {
  const { image, customer_code, measure_datetime, measure_type } = req.body;

  // Validation
  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error_code: "INVALID_DATA",
      error_description: error.message
    });
  }


  // Verifies if there is any reading for measure_type
  const reading = await prisma.readings.findFirst({
    where: {
      type: measure_type,
      timestamp: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      }
    }
  });

  if (reading) {
    return res.status(409).json({
      error_code: '"DOUBLE_REPORT',
      error_description: 'Leitura do mês já realizada'
    });
  }

  //Gemini integration
  // const buffer = Buffer.from(image, 'base64');
  // const fileName = `image-${measure_datetime}.jpg`;
  const base64Image = `data:image/jpeg;base64,${image}`;

  try {
    // const uploadResult = await fileManager.uploadFile(
    //   fileName,
    //   {
    //     mimeType: "image/jpeg",
    //     displayName: fileName,
    //     fileData: buffer
    //   },
    // );

    const result = await model.generateContent([
      'Extract the numeric value from this image.',
      {
        fileData: {
          fileUri: base64Image,
          mimeType: "image/jpeg",
        },
      }
    ]);

    console.log(result);
  } catch (err) {
    console.log(err);
  }

  res.send(reading);
});

app.listen(port, () => {
  console.log(`Server is up and running on http://localhost:${port}`);
});
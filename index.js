import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import OpenAI, { toFile } from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const prisma = new PrismaClient();
const app = express();
const port = 3001;

const upload = multer({ dest: 'uploads/' });
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    const { name, gender, career, cedula } = req.body;
    const imagePath = req.file.path;
    const logopath = path.join(__dirname, 'assets','logo.png');

    const prompt = gender === 'female'
      ? `
        Edit the image, based on the reference. The image is of me in the picture smiling while holding my graduation diploma with the logo that i provide to you and the name ${name}, additionally two signatures in the bottom right corner and left corner. I am standing in a well-kept garden in front of a circular water fountain. Behind me is a modern multi-story building with large windows, likely a university campus. I am 5 years older dressed elegantly in a formal dress with subtle details, looking professional and confident for my graduation ceremony.

        The diploma I am holding shows that I graduated as a ${career} from the Escuela Colombiana de Ingeniería Julio Garavito in Colombia. My name, visible on the diploma, is ${name}.

        In the background, there are flowering bushes, which, together with the modern building, create a solemn and pleasant atmosphere—perfect for a graduation ceremony. My posture, elegant attire, and the way I proudly hold the diploma reflect my happiness and pride in this academic achievement.`

      : `
        Edit the image, based on the reference. The image is of me in the picture smiling while holding my graduation diploma with the logo that i provide to you and the name ${name}, additionally two signatures in the bottom right corner and left corner. I am standing in a well-kept garden in front of a circular water fountain. Behind me is a modern multi-story building with large windows, likely a university campus. I am 5 years older dressed formally in a white dress shirt with small dark dots, a blue tie with white dots, a dark blue suit jacket, and matching pants.

        The diploma I am holding shows that I graduated as a ${career} from the Escuela Colombiana de Ingeniería Julio Garavito in Colombia. My name, visible on the diploma, is ${name}.

        In the background, there are flowering bushes, which, together with the modern building, create a solemn and pleasant atmosphere—perfect for a graduation ceremony. My posture, formal attire, and the way he proudly holds the diploma reflect my happiness and pride in this academic achievement.`;

    const imageUSer = await toFile(fs.createReadStream(imagePath), null, {
      type: "image/png",
    });

    const imageLogo = await toFile(fs.createReadStream(logopath), null, {
        type: "image/png"
     })

    const result = await openai.images.edit({
      model: "gpt-image-1",
      image: [imageUSer, imageLogo] ,
      prompt: prompt,
    });

    const image_base64 = result.data[0].b64_json;
    const outputBuffer = Buffer.from(image_base64, 'base64');
    const outputFilename = `generated_${Date.now()}.png`;
    const outputPath = path.join('generated', outputFilename);

    // Ensure the generated directory exists
    if (!fs.existsSync('generated')) {
      fs.mkdirSync('generated');
    }

    fs.writeFileSync(outputPath, outputBuffer);

    const savedUser = await prisma.user.create({
      data: {
        id: cedula || `temp_${Date.now()}`, // Usar cédula o ID temporal
        name,
        gender,
        career,
        image: outputBuffer,
      },
    });

    res.json({ success: true, imagePath: outputPath, user: savedUser });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Nuevo endpoint para verificar y obtener/generar foto por cédula
app.post('/api/photo/:cedula', upload.single('image'), async (req, res) => {
  try {
    const { cedula } = req.params;
    
    // Buscar el usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: cedula }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuario no encontrado con la cédula proporcionada' 
      });
    }

    // Si el usuario ya tiene foto, retornarla
    if (user.image) {
      console.log(`Usuario ${user.name} ya tiene foto, retornando imagen existente`);
      
      try {
        // Asegurarse de que user.image es un Buffer válido
        let imageBuffer;
        if (Buffer.isBuffer(user.image)) {
          imageBuffer = user.image;
        } else if (Array.isArray(user.image)) {
          // Si es un array de bytes, convertirlo a Buffer
          imageBuffer = Buffer.from(user.image);
        } else if (user.image instanceof Uint8Array) {
          // Si es un Uint8Array (común con Prisma), convertirlo a Buffer
          imageBuffer = Buffer.from(user.image);
        } else if (typeof user.image === 'object' && user.image.data) {
          // Si es un objeto con propiedad 'data' (otro formato de Prisma)
          imageBuffer = Buffer.from(user.image.data);
        } else if (typeof user.image === 'string') {
          // Si ya es una string base64, usarla directamente
          imageBuffer = Buffer.from(user.image, 'base64');
        } else {
          // Último recurso: intentar convertir a Buffer usando Object.values
          const values = Object.values(user.image);
          imageBuffer = Buffer.from(values);
        }
        
        // Convertir el buffer a base64
        const imageBase64 = imageBuffer.toString('base64');
        
        console.log('✓ Imagen convertida exitosamente');
        console.log('Base64 length:', imageBase64.length);
        console.log('Base64 preview:', imageBase64.substring(0, 50) + '...');
        
        return res.json({
          success: true,
          hasExistingPhoto: true,
          user: {
            id: user.id,
            name: user.name,
            gender: user.gender,
            career: user.career
          },
          hasPhoto: true,
          image: `data:image/png;base64,${imageBase64}`
        });
      } catch (conversionError) {
        console.error('Error converting image to base64:', conversionError);
        return res.status(500).json({
          success: false,
          error: 'Error al procesar la imagen almacenada'
        });
      }
    }

    // Si no tiene foto, verificar si se envió una imagen para generar
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Usuario no tiene foto y no se proporcionó imagen para generar una nueva'
      });
    }

    console.log(`Usuario ${user.name} no tiene foto, generando nueva imagen...`);

    // Generar nueva foto usando los datos del usuario
    const imagePath = req.file.path;
    const logopath = path.join(__dirname, 'assets','logo.png');

    const prompt = user.gender === 'female'
      ? `
        Edit the image, based on the reference. The image is of me in the picture smiling while holding my graduation diploma with the logo that i provide to you and the name ${user.name}, additionally two signatures in the bottom right corner and left corner. I am standing in a well-kept garden in front of a circular water fountain. Behind me is a modern multi-story building with large windows, likely a university campus. I am 5 years older dressed elegantly in a formal dress with subtle details, looking professional and confident for my graduation ceremony.

        The diploma I am holding shows that I graduated as a ${user.career} from the Escuela Colombiana de Ingeniería Julio Garavito in Colombia. My name, visible on the diploma, is ${user.name}.

        In the background, there are flowering bushes, which, together with the modern building, create a solemn and pleasant atmosphere—perfect for a graduation ceremony. My posture, elegant attire, and the way I proudly hold the diploma reflect my happiness and pride in this academic achievement.`

      : `
        Edit the image, based on the reference. The image is of me in the picture smiling while holding my graduation diploma with the logo that i provide to you and the name ${user.name}, additionally two signatures in the bottom right corner and left corner. I am standing in a well-kept garden in front of a circular water fountain. Behind me is a modern multi-story building with large windows, likely a university campus. I am 5 years older dressed formally in a white dress shirt with small dark dots, a blue tie with white dots, a dark blue suit jacket, and matching pants.

        The diploma I am holding shows that I graduated as a ${user.career} from the Escuela Colombiana de Ingeniería Julio Garavito in Colombia. My name, visible on the diploma, is ${user.name}.

        In the background, there are flowering bushes, which, together with the modern building, create a solemn and pleasant atmosphere—perfect for a graduation ceremony. My posture, formal attire, and the way he proudly holds the diploma reflect my happiness and pride in this academic achievement.`;

    const imageUser = await toFile(fs.createReadStream(imagePath), null, {
      type: "image/png",
    });

    const imageLogo = await toFile(fs.createReadStream(logopath), null, {
        type: "image/png"
    });

    const result = await openai.images.edit({
      model: "gpt-image-1",
      image: [imageUser, imageLogo],
      prompt: prompt,
    });

    const image_base64 = result.data[0].b64_json;
    const outputBuffer = Buffer.from(image_base64, 'base64');
    const outputFilename = `${user.name.replace(/\s+/g, '_')}_graduado_${Date.now()}.png`;
    const outputPath = path.join('generated', outputFilename);

    // Ensure the generated directory exists
    if (!fs.existsSync('generated')) {
      fs.mkdirSync('generated');
    }

    // Guardar archivo físico
    fs.writeFileSync(outputPath, outputBuffer);

    // Actualizar usuario en la base de datos con la nueva imagen
    const updatedUser = await prisma.user.update({
      where: { id: cedula },
      data: { image: outputBuffer }
    });

    console.log(`✓ Foto generada y guardada para ${user.name}`);

    res.json({ 
      success: true, 
      hasExistingPhoto: false,
      generated: true,
      imagePath: outputPath,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        gender: updatedUser.gender,
        career: updatedUser.career
      },
      image: `data:image/png;base64,${image_base64}`
    });

    // Limpiar archivo temporal
    fs.unlinkSync(imagePath);

  } catch (error) {
    console.error('Error en /api/photo/:cedula:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para solo verificar si un usuario tiene foto (sin generar)
app.get('/api/check-photo/:cedula', async (req, res) => {
  try {
    const { cedula } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: cedula },
      select: {
        id: true,
        name: true,
        gender: true,
        career: true,
        image: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuario no encontrado' 
      });
    }

    const hasPhoto = !!user.image;
    const response = {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        gender: user.gender,
        career: user.career
      },
      hasPhoto
    };

    // Si tiene foto, incluirla en la respuesta
    if (hasPhoto) {
      try {
        let imageBuffer;
        if (Buffer.isBuffer(user.image)) {
          imageBuffer = user.image;
        } else if (Array.isArray(user.image)) {
          imageBuffer = Buffer.from(user.image);
        } else if (user.image instanceof Uint8Array) {
          imageBuffer = Buffer.from(user.image);
        } else if (typeof user.image === 'object' && user.image.data) {
          imageBuffer = Buffer.from(user.image.data);
        } else if (typeof user.image === 'string') {
          imageBuffer = Buffer.from(user.image, 'base64');
        } else {
          const values = Object.values(user.image);
          imageBuffer = Buffer.from(values);
        }
        
        const imageBase64 = imageBuffer.toString('base64');
        response.image = `data:image/png;base64,${imageBase64}`;
      } catch (conversionError) {
        console.error('Error converting image in check-photo:', conversionError);
        response.imageError = 'Error al procesar la imagen';
      }
    }

    res.json(response);

  } catch (error) {
    console.error('Error en /api/check-photo/:cedula:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint de diagnóstico para verificar el formato de imagen almacenada
app.get('/api/debug-image/:cedula', async (req, res) => {
  try {
    const { cedula } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: cedula },
      select: {
        id: true,
        name: true,
        image: true
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuario no encontrado' 
      });
    }

    if (!user.image) {
      return res.json({
        success: true,
        hasImage: false,
        user: { id: user.id, name: user.name }
      });
    }

    // Información de diagnóstico
    const diagnosticInfo = {
      success: true,
      hasImage: true,
      user: { id: user.id, name: user.name },
      imageType: typeof user.image,
      isBuffer: Buffer.isBuffer(user.image),
      isArray: Array.isArray(user.image),
      length: user.image ? user.image.length : 0
    };

    if (Array.isArray(user.image)) {
      diagnosticInfo.arrayPreview = user.image.slice(0, 20);
    }

    if (Buffer.isBuffer(user.image)) {
      diagnosticInfo.bufferPreview = user.image.toString('base64').substring(0, 50);
    }

    res.json(diagnosticInfo);

  } catch (error) {
    console.error('Error en debug-image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

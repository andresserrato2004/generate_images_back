# 🎓 Graduation Photo Generator API

API backend para generar fotos de graduación automáticamente usando inteligencia artificial. Sistema desarrollado para la Escuela Colombiana de Ingeniería Julio Garavito.

## 🚀 Características

- ✅ **Generación automática** de fotos de graduación con IA (OpenAI GPT-4 Vision)
- ✅ **Base de datos** de estudiantes con PostgreSQL + Prisma
- ✅ **Almacenamiento** de imágenes como datos binarios en BD
- ✅ **API REST** para verificar y generar fotos
- ✅ **Carga masiva** desde archivos Excel
- ✅ **Personalización** por género (traje formal/vestido elegante)

## 📋 Requisitos

- Node.js 18+
- PostgreSQL 12+
- API Key de OpenAI
- npm o yarn

## 🛠️ Instalación

1. **Clonar el repositorio:**
```bash
git clone https://github.com/andresserrato2004/generate_images_back.git
cd generate_images_back
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
# Crear archivo .env
DATABASE_URL="postgresql://usuario:password@localhost:5432/graduation_db"
OPENAI_API_KEY="tu-api-key-de-openai"
```

4. **Configurar base de datos:**
```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev
```

## 🚀 Uso

### Iniciar servidor:
```bash
npm start
# o para desarrollo:
npx nodemon index.js
```

El servidor estará disponible en `http://localhost:3001`

## 📡 Endpoints API

### 1. **POST** `/api/upload`
Generar foto de graduación para nuevo estudiante
```javascript
// Form data
{
  "name": "Juan Pérez",
  "gender": "male", // or "female"
  "career": "Ingeniería de Sistemas",
  "cedula": "0123456789",
  "image": File // Imagen del estudiante
}
```

### 2. **POST** `/api/photo/:cedula`
Verificar y generar foto si es necesario
```javascript
// Si tiene foto: retorna imagen existente
// Si no tiene foto: genera nueva con imagen enviada
```

### 3. **GET** `/api/check-photo/:cedula`
Solo verificar si tiene foto (sin generar)
```javascript
// Respuesta:
{
  "success": true,
  "hasPhoto": true,
  "user": {...},
  "image": "data:image/png;base64,..."
}
```

### 4. **GET** `/api/debug-image/:cedula`
Endpoint de diagnóstico para verificar formato de imagen almacenada
```javascript
// Respuesta:
{
  "success": true,
  "hasImage": true,
  "imageType": "object",
  "isBuffer": false,
  "length": 2688829
}
```

## 🗄️ Esquema de Base de Datos

```sql
model User {
  id        String   @id        // id del estudiante 
  name      String              // Nombre completo
  gender    String              // "male" | "female"
  career    String              // Programa académico
  image     Bytes?              // Imagen PNG como datos binarios
  createdAt DateTime @default(now())
}
```

## 🎨 Personalización de Fotos

### **Prompt para Mujeres:**
- Vestido elegante formal con detalles sutiles
- Postura profesional y confiada
- Jardín cuidado con fuente circular
- Edificio universitario moderno de fondo

### **Prompt para Hombres:**
- Camisa blanca con puntos, corbata azul, saco formal
- Postura formal y orgullosa
- Mismo entorno universitario elegante

## 📁 Estructura del Proyecto

```
├── index.js              # API principal
├── package.json          # Dependencias
├── prisma/
│   ├── schema.prisma     # Esquema de BD
│   └── migrations/       # Migraciones de BD
├── assets/
│   └── logo.png          # Logo institucional
├── uploads/              # Archivos temporales
├── generated/            # Imágenes generadas (no incluidas en Git)
└── .env                  # Variables de entorno (no incluido en Git)
```

## 🔧 Tecnologías

- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL + Prisma ORM
- **IA:** OpenAI GPT-4 Vision API
- **Carga de archivos:** Multer
- **Procesamiento Excel:** XLSX
- **CORS:** Habilitado para frontend
- **ES Modules:** Configuración moderna de JavaScript

## 🚦 Estados de Respuesta

- ✅ **200:** Operación exitosa
- ❌ **404:** Usuario no encontrado
- ❌ **400:** Datos inválidos o imagen faltante
- ❌ **500:** Error interno del servidor

## 📊 Flujo de Datos

1. **Carga inicial:** Excel → Base de datos (73 estudiantes)
2. **Verificación:** API consulta si estudiante tiene foto
3. **Generación:** Si no tiene foto, OpenAI genera nueva imagen
4. **Almacenamiento:** Imagen se guarda como BYTEA en PostgreSQL
5. **Respuesta:** API retorna imagen en formato base64

## 🛡️ Seguridad

- Variables de entorno para credenciales sensibles
- Validación de tipos de archivo
- Limpieza automática de archivos temporales
- Manejo robusto de errores

## 👥 Contribución

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 🏫 Desarrollado para

**Escuela Colombiana de Ingeniería Julio Garavito**  
Sistema de generación automática de fotos de graduación

---

⭐ Si este proyecto te fue útil, ¡dale una estrella!

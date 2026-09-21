# Mi Ciudad - Guía Turística de Colón 📍
**Asignatura:** Desarrollo para Aplicaciones Móviles - UNER  
**Estado del Proyecto:** Sprint 1 - Estructura Base y Navegación

Este proyecto es una guía turística interactiva de la ciudad de Colón, Entre Ríos, construida con React Native y Expo siguiendo la arquitectura asíncrona requerida.

## 🛠️ Tecnologías y Requisitos
- **Node.js:** v20.19.4 LTS o superior (Obligatorio).
- **Framework:** Expo SDK 57 (SDK más reciente).
- **Lenguaje:** TypeScript (Modo estricto).
- **Navegación:** Expo Router (File-based).

## 📂 Estructura del Proyecto (Arquitectura)
Para mantener el desacoplamiento, utilizamos la carpeta `src/`:
- `src/tipos/`: Interfaces de TypeScript (Contratos de datos).
- `src/mocks/`: Datos simulados tipados para desarrollo offline.
- `src/servicios/`: Capa lógica asíncrona (Simula peticiones al servidor).
- `src/componentes/`: Componentes atómicos reutilizables (Botones, Tarjetas).

## 🚀 Cómo empezar (Para el equipo)

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repo>
   cd app-turismo-uner
2. **Instalar dependencias:**

Utilizar el comando de Expo para asegurar compatibilidad de versiones:
code
Bash
npx expo install

3. **Iniciar el proyecto:**
code
Bash
npx expo start -c
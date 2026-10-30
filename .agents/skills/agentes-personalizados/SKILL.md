---
name: agentes-personalizados
description: Guía completa y estándar para crear, estructurar e invocar agentes personalizados (custom agents y subagentes) en Google Antigravity. Utiliza esta habilidad cuando el usuario solicite crear, configurar, auditar o invocar agentes o subagentes personalizados en el proyecto.
---

# Guía de Agentes Personalizados (Custom Agents) en Antigravity

Esta habilidad documenta la arquitectura, especificación de formato, ubicación y modos de invocación de los **Agentes Personalizados** (Custom Agents) y **Subagentes** en Google Antigravity.

---

## 1. ¿Qué es un Agente Personalizado?

Un Agente Personalizado es una definición especializada de IA diseñada para ejecutar tareas específicas dentro de un flujo de trabajo. A diferencia de las habilidades (skills), que son paquetes de instrucciones que un agente lee según la necesidad, un **agente personalizado** tiene:
- Identidad y prompt de sistema propios.
- Conjunto acotado de herramientas (`tools`).
- Modelo asignado (`model`).
- Política de ejecución de comandos independiente (`commandExecutionPolicy`).
- Habilidades y servidores MCP asignados directamente.

Puede operar como **agente principal** (seleccionado en la interfaz de usuario o CLI) o como **subagente** invocado de forma autónoma por un agente coordinador para delegar trabajo especializado en segundo plano.

---

## 2. Ubicación de Almacenamiento

Los agentes pueden definirse a dos niveles:

### A. Nivel de Proyecto / Workspace (Recomendado para equipos y repositorios)
Se ubican dentro del directorio raíz del proyecto:
- `.agents/agents/<nombre-del-agente>.md`
o bien en una carpeta con su propio archivo:
- `.agents/agents/<nombre-del-agente>/agent.md`

> **Nota:** Al guardarse en `.agents/agents/`, el agente se versiona junto con el repositorio Git y queda disponible para cualquier desarrollador que trabaje en el proyecto.

### B. Nivel Global (Para flujos personales en todas las sesiones)
- `~/.gemini/config/agents/<nombre-del-agente>.md`
o
- `~/.gemini/config/agents/<nombre-del-agente>/agent.md`

---

## 3. Formato del Archivo del Agente

Un archivo de agente es un archivo Markdown (`.md`) que consta de:
1. Un bloque de encabezado **YAML Frontmatter** delimitado por `---` con los metadatos y configuraciones del agente.
2. Un **Cuerpo en Markdown** que define el prompt de sistema, comportamiento, restricciones y estilo de trabajo.

### Especificación de Campos del YAML Frontmatter

| Campo | Tipo | Requerido | Valor por defecto | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Sí** | - | Identificador único del agente (slug o nombre en minúsculas, ej: `migrador-sql`). |
| `description` | `string` | **Sí** | - | Descripción clara y precisa del rol. El agente coordinador la evalúa para decidir si delega una tarea en este subagente. |
| `mainAgent` | `boolean` | No | `true` | Si es `true`, el agente aparece en el selector de agentes principales de la UI y se puede invocar en el CLI con `--agent`. |
| `subagent` | `boolean` | No | `true` | Si es `true`, puede ser invocado dinámicamente como subagente por el agente coordinador a través de `invoke_subagent`. |
| `tools` | `string[]` | No | `[]` (todas) | Lista explícita de herramientas permitidas. Si se especifica, el agente solo tiene acceso a esas herramientas (Principio de mínimo privilegio). |
| `model` | `string` | No | `inherit` | Nivel del modelo a utilizar. Opciones comunes: `inherit`, `flash`, `pro`. |
| `commandExecutionPolicy` | `string` | No | `sandbox` | Política de ejecución de comandos bash. Opciones: `off` (deshabilitado), `auto` (automático según riesgo), `eager`, o `sandbox` (entorno seguro aislado). |
| `skills` | `string[]` | No | `[]` | Rutas relativas a habilidades (`skills`) que el agente carga automáticamente al iniciar. |
| `mcpServers` | `object[]` | No | `[]` | Servidores MCP externos asignados específicamente a este agente. |

---

## 4. Estructura de un Archivo de Agente

```markdown
---
name: auditor-seguridad
description: Especialista en análisis estático de vulnerabilidades, dependencias obsoletas y validación de permisos en código fuente.
mainAgent: true
subagent: true
model: inherit
commandExecutionPolicy: sandbox
tools:
  - view_file
  - grep_search
  - list_dir
skills:
  - skills/owasp-guidelines
---

# Rol e Identidad
Eres el Auditor de Seguridad del equipo. Tu objetivo exclusivo es examinar el código en busca de posibles vulnerabilidades, fugas de secretos y configuraciones inseguras.

# Reglas de Comportamiento
- No realices modificaciones en los archivos; solo inspecciona y reporta.
- Categoriza los hallazgos por severidad (Crítica, Alta, Media, Baja, Informativa).
- Proporciona fragmentos de código específicos y recomendaciones de remediación.
```

---

## 5. Modos de Invocación

### Modo 1: Como Agente Principal (Main Agent)
- **Desde la Interfaz Gráfica (IDE / App)**:
  En el menú desplegable de selección de modelo/agente en el panel de conversación, selecciona el agente por su nombre.
- **Desde la Línea de Comandos (CLI)**:
  ```bash
  agy --agent <nombre-del-agente>
  ```
  *(Por ejemplo: `agy --agent auditor-seguridad`)*

### Modo 2: Como Subagente (Delegación Autónoma)
Cuando un agente principal o coordinador está procesando una solicitud compleja y determina que un subagente es el adecuado (según su `description`), invoca la herramienta de subagente:
- **Herramienta**: `invoke_subagent` o `browser_subagent`.
- **Comportamiento**:
  - El subagente recibe un mensaje de tarea y un contexto inicial.
  - Se ejecuta en una conversación hija con aislamiento de contexto.
  - Puede ejecutarse en paralelo con otros subagentes.
  - Al completar la tarea, reporta un resumen de resultados al agente coordinador.

---

## 6. Ciclo de Vida y Seguridad

1. **Aislamiento y Herencia de Permisos**:
   - Los subagentes heredan los permisos del entorno del agente padre, pero sus herramientas pueden ser más restringidas mediante el campo `tools`.
2. **Profundidad de Anidamiento**:
   - Se admite una profundidad de hasta 10 niveles de subagentes anidados.
3. **Estados del Subagente**:
   - `Running`: Ejecutando pasos y herramientas.
   - `Idle`: Tarea en espera; conserva su contexto y puede reactivarse si se le envía un nuevo mensaje.
   - `Killed`: Finalizado; libera recursos y su árbol de trabajo temporal.

---

## 7. Buenas Prácticas al Crear Agentes

1. **Descripciones descriptivas y deterministas**:
   La descripción en el frontmatter debe responder con claridad: *¿Qué hace?*, *¿Cuándo debe elegirse sobre otros?* y *¿Qué tipos de archivos maneja?*.
2. **Principio de Mínimo Privilegio**:
   Si un agente solo realiza análisis o revisión, restringe `tools` a herramientas de solo lectura (`view_file`, `grep_search`, `list_dir`) y `commandExecutionPolicy: off`.
3. **Modularidad**:
   Crea agentes enfocados en un único dominio (e.g., refactorización, redacción de pruebas, revisión de base de datos) en lugar de agentes monolíticos.

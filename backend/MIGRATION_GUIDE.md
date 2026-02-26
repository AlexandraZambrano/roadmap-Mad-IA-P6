# Guía de Migración de Estudiantes

## ⚠️ Importante - Leer antes de ejecutar

Este proceso migra la base de datos para agregar las nuevas estructuras de seguimiento técnico y transversal a los estudiantes existentes.

## 🔄 Opciones de Migración

### 1. Migración Rápida (Recomendada)
Migra solo los campos necesarios para que funcione el seguimiento:

```bash
cd backend
node quick-migration.js
```

**Qué hace:**
- Agrega estructuras `technicalTracking` y `transversalTracking` vacías
- Agrega campos básicos faltantes (`phone`, `administrativeSituation`)
- No modifica datos existentes

### 2. Migración Completa
Migración más exhaustiva con limpieza y migración de datos legacy:

```bash
cd backend
node migrate-students.js
```

**Qué hace:**
- Todo lo de la migración rápida
- Migra datos legacy (`notes` → `teacherNotes`, `projectAssignments` → `teams`)
- Hace limpieza de datos
- Genera reporte detallado

## 🔙 Rollback (Si algo sale mal)

Para deshacer los cambios (elimina solo las estructuras de seguimiento):

```bash
cd backend
node rollback-migration.js rollback
```

Para limpiar datos de un estudiante específico:

```bash
cd backend
node rollback-migration.js cleanup email@estudiante.com
```

## 📋 Verificación

Para verificar que todo está funcionando:

1. Ejecuta la migración
2. Ve a la página de gestión de promoción
3. Abre el modal de un estudiante
4. Intenta guardar datos en las pestañas de seguimiento
5. Recarga la página y verifica que los datos persisten

## 🚨 Antes de ejecutar

1. **Haz backup de la base de datos:**
   ```bash
   mongodump --db roadmap-manager --out backup-$(date +%Y%m%d)
   ```

2. **Verifica la conexión a MongoDB:**
   - Asegúrate de que el servidor MongoDB esté ejecutándose
   - Verifica la variable de entorno `MONGO_URI` si usas una conexión específica

3. **Detén el servidor principal:**
   ```bash
   # Detén el servidor si está corriendo
   ```

## 📊 Qué datos se migran

### Nuevos campos agregados:
- `phone`: Teléfono (cadena vacía por defecto)
- `administrativeSituation`: Situación administrativa ('no_permiso_trabajo' por defecto)

### Nuevas estructuras:
- `technicalTracking.teacherNotes[]`: Notas de profesores
- `technicalTracking.competences[]`: Competencias técnicas
- `transversalTracking.employabilitySessions[]`: Sesiones de empleabilidad
- `transversalTracking.individualSessions[]`: Sesiones individuales
- `transversalTracking.incidents[]`: Incidencias

### Migración de datos legacy (solo migración completa):
- `notes` → `technicalTracking.teacherNotes`
- `projectAssignments` → `teams`

## 🔍 Troubleshooting

### Error de conexión:
- Verifica que MongoDB esté ejecutándose
- Revisa la URL de conexión en `MONGO_URI`

### Error de permisos:
- Asegúrate de tener permisos de escritura en la base de datos

### Estudiantes no aparecen en seguimiento:
- Ejecuta la migración
- Verifica que el estudiante esté en la base de datos con las nuevas estructuras

## 📝 Log de cambios

La migración registra:
- Número de estudiantes procesados
- Errores encontrados
- Datos migrados
- Estado final de la base de datos

## ⏭️ Después de la migración

1. Reinicia el servidor principal
2. Prueba la funcionalidad de seguimiento
3. Verifica que los datos persisten correctamente
4. Elimina los archivos de migración si todo funciona bien

## 📞 Si necesitas ayuda

- Revisa los logs de la migración
- Usa el rollback si algo no funciona
- Los datos originales se mantienen intactos (solo se agregan nuevos campos)

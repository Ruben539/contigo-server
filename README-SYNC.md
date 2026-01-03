# 🔄 Sincronización con contigo-server

Esta carpeta `backend-example` está conectada al repositorio:
**https://github.com/Ruben539/contigo-server.git**

## 📋 Comandos Útiles

### Ver estado
```bash
cd backend-example
git status
```

### Sincronizar cambios locales con el repo
```bash
cd backend-example
git add .
git commit -m "Descripción de los cambios"
git push origin main
```

### Traer cambios del repo remoto
```bash
cd backend-example
git pull origin main
```

### Ver diferencias
```bash
cd backend-example
git diff
```

## ⚠️ Notas Importantes

1. **NO commitees el archivo `.env`** - Está en `.gitignore`
2. **Las variables de entorno** se configuran en Vercel, no en el repo
3. **Después de hacer cambios**, haz push para que se actualice el deploy en Vercel

## 🚀 Workflow Recomendado

1. Hacer cambios en `backend-example/`
2. Probar localmente (`npm start`)
3. Commit y push a `contigo-server`
4. Vercel detectará el cambio y hará redeploy automático


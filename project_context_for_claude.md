# Project Context

## File: eslint.config.js
```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': 'off',
    },
  },
])

```

## File: export_context_script.js
```js
const fs = require('fs');
const path = require('path');

const projectDir = __dirname;
const outputFile = path.join(projectDir, 'project_context_for_claude.md');

const excludeDirs = ['node_modules', '.git', 'dist', 'build', '.gemini', 'public'];
const includeExts = ['.js', '.jsx', '.json', '.css', '.html', '.md', '.ts', '.tsx'];

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (!excludeDirs.includes(file)) {
                getAllFiles(filePath, fileList);
            }
        } else {
            const ext = path.extname(file);
            if (includeExts.includes(ext)) {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

try {
    const files = getAllFiles(projectDir);
    let output = '# Project Context\n\n';

    for (const file of files) {
        if (file === outputFile || file.includes('package-lock.json')) continue;
        const relativePath = path.relative(projectDir, file);
        const ext = path.extname(file).replace('.', '');
        const content = fs.readFileSync(file, 'utf-8');
        output += `## File: ${relativePath}\n\`\`\`${ext === 'jsx' || ext === 'tsx' ? 'javascript' : ext}\n${content}\n\`\`\`\n\n`;
    }

    fs.writeFileSync(outputFile, output);
    console.log('Success: ' + outputFile);
} catch (error) {
    console.error('Error:', error);
}

```

## File: index.html
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>tennis-padel-app</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```

## File: package.json
```json
{
  "name": "tennis-padel-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.87.1",
    "lucide-react": "^0.555.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.5",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "autoprefixer": "^10.4.22",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "vite": "^7.2.4"
  }
}

```

## File: postcss.config.js
```js
export default {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
}

```

## File: README.md
```md
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

```

## File: src\App.css
```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}

```

## File: src\App.jsx
```javascript
import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import PadelMatchApp from './components/PadelMatchApp';
import Login from './components/Login';
import NewsFeed from './components/News/NewsFeed';
// import PhotoGallery from './components/PhotoGallery';

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const { setSport } = useGame();
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Handle browser back/forward buttons
  React.useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Simple manual routing for News
  if (currentPath === '/noticias') {
    return (
      <div className="min-h-screen bg-slate-900 pb-20">
        <NewsFeed onBack={() => {
          setSport(null);
          navigate('/');
        }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <PadelMatchApp onNavigate={navigate} currentPath={currentPath} />;
};

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;

```

## File: src\AuthTest.jsx
```javascript
import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const AuthTest = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState('Esperando input...');

    const addLog = (msg) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const handleLogin = async () => {
        setStatus('Intentando conectar...');
        addLog(`Iniciando login para: ${email}`);
        let start = 0;

        try {
            start = Date.now();

            // Race condition manually implemented
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT RAW: Supabase no respondió en 10s')), 10000)
            );

            const loginPromise = supabase.auth.signInWithPassword({
                email,
                password
            });

            const { data, error } = await Promise.race([loginPromise, timeoutPromise]);
            const duration = Date.now() - start;

            if (error) {
                addLog(`ERROR (${duration}ms): ${error.message}`);
                setStatus('ERROR');
            } else {
                addLog(`ÉXITO (${duration}ms): Usuario logueado.`);
                addLog(`ID: ${data.user.id}`);
                setStatus('LOGIN OK');
            }
        } catch (err) {
            addLog(`EXCEPCIÓN (${Date.now() - start}ms): ${err.message}`);
            setStatus('CRASH/TIMEOUT');
        }
    };

    return (
        <div style={{ padding: 40, background: '#111', color: '#fff', minHeight: '100vh', fontFamily: 'monospace' }}>
            <h1>Test de Autenticación Aislado</h1>
            <h2 style={{ color: status === 'LOGIN OK' ? '#4ade80' : status === 'ERROR' ? '#f87171' : '#fbbf24' }}>
                Estado: {status}
            </h2>

            <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 300 }}>
                <input
                    type="text"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ padding: 10, borderRadius: 5, border: '1px solid #333', background: '#222', color: 'white' }}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ padding: 10, borderRadius: 5, border: '1px solid #333', background: '#222', color: 'white' }}
                />
                <button
                    onClick={handleLogin}
                    style={{ padding: 10, background: '#3b82f6', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Probar Login Directo
                </button>
            </div>

            <hr style={{ borderColor: '#333' }} />
            <div style={{ marginTop: 20, background: '#000', padding: 20, borderRadius: 10 }}>
                {logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: 5, borderBottom: '1px solid #222', paddingBottom: 2 }}>{log}</div>
                ))}
            </div>
        </div>
    );
};

export default AuthTest;

```

## File: src\components\ErrorBoundary.jsx
```javascript
import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
                    <div className="bg-slate-800 p-8 rounded-xl border border-red-500/50 max-w-2xl w-full shadow-2xl">
                        <h1 className="text-3xl font-bold text-red-500 mb-4">¡Vaya! Algo ha salido mal.</h1>
                        <p className="text-slate-300 mb-6">La aplicación ha encontrado un error inesperado.</p>

                        <div className="bg-slate-950 p-4 rounded-lg overflow-auto max-h-64 mb-6 border border-slate-700">
                            <p className="font-mono text-red-400 font-bold mb-2">{this.state.error && this.state.error.toString()}</p>
                            <pre className="font-mono text-xs text-slate-500 whitespace-pre-wrap">
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-6 py-3 bg-brand-yellow text-brand-dark font-bold rounded-lg hover:bg-yellow-400 transition-colors w-full"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

```

## File: src\components\LandingPage.jsx
```javascript
import React from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Users, ShieldCheck, User } from 'lucide-react';

export default function LandingPage() {
    const { selectMode } = useGame();

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">

            {/* Header with Logo */}
            <div className="mb-12 text-center">
                <div className="w-32 h-32 mx-auto mb-6 bg-white rounded-2xl p-2 shadow-lg shadow-brand-red/20">
                    <img
                        src="/src/assets/logo.png"
                        alt="Escuela de Tenis Marineda"
                        className="w-full h-full object-contain"
                    />
                </div>
                <h1 className="text-4xl font-bold text-white mb-2">
                    Escuela de Tenis <span className="text-brand-yellow">Marineda</span>
                </h1>
                <p className="text-slate-400 text-lg">Sistema de Gestión de Rankings y Torneos</p>
            </div>

            <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">

                {/* Admin Card */}
                <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 hover:border-brand-red transition-all cursor-pointer group shadow-lg hover:shadow-brand-red/10"
                    onClick={() => selectMode('padel', 'admin')}>

                    <div className="w-16 h-16 bg-brand-red/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand-red/20 transition-colors">
                        <ShieldCheck className="w-8 h-8 text-brand-red" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Soy Organizador</h2>
                    <p className="text-slate-400 mb-6">
                        Acceso completo para gestionar torneos, generar jornadas, editar resultados y configurar pistas.
                    </p>

                    <div className="space-y-3">
                        <button className="w-full py-3 px-4 bg-brand-red hover:bg-brand-dark text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            onClick={(e) => { e.stopPropagation(); selectMode('padel', 'admin'); }}>
                            Gestionar Pádel
                        </button>
                        <button className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            onClick={(e) => { e.stopPropagation(); selectMode('tennis', 'admin'); }}>
                            Gestionar Tenis
                        </button>
                    </div>
                </div>

                {/* Player Card */}
                <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 hover:border-brand-yellow transition-all cursor-pointer group shadow-lg hover:shadow-brand-yellow/10">
                    <div className="w-16 h-16 bg-brand-yellow/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand-yellow/20 transition-colors">
                        <User className="w-8 h-8 text-brand-yellow" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Soy Jugador</h2>
                    <p className="text-slate-400 mb-6">
                        Consulta tus próximos partidos, contacta con rivales y revisa tu posición en el ranking.
                    </p>

                    <div className="space-y-3">
                        <button className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            onClick={(e) => { e.stopPropagation(); selectMode('padel', 'player'); }}>
                            Ver Ranking Pádel
                        </button>
                        <button className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            onClick={(e) => { e.stopPropagation(); selectMode('tennis', 'player'); }}>
                            Ver Ranking Tenis
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

```

## File: src\components\Login.jsx
```javascript
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(username, password);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">

            {/* Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-red/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-yellow/10 rounded-full blur-3xl"></div>

            <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-8 relative z-10">

                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-2xl p-2 shadow-lg shadow-brand-red/20">
                        <img
                            src="/src/assets/logo.png"
                            alt="Escuela de Tenis Marineda"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Bienvenido</h1>
                    <p className="text-slate-400 text-sm mt-1">Inicia sesión para continuar</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Usuario</label>
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-yellow transition-colors" size={20} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all placeholder:text-slate-600"
                                placeholder="Ej: admin"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-yellow transition-colors" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all placeholder:text-slate-600"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-brand-red to-brand-dark hover:from-red-600 hover:to-red-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-red/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                Entrar <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-500">
                        Escuela de Tenis Marineda &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
}

```

## File: src\components\News\AdminEditor.jsx
```javascript
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Save, Image as ImageIcon, X, Loader2 } from 'lucide-react';

const AdminEditor = ({ onSave, onCancel }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!title.trim() || !content.trim()) {
            setError('El título y el contenido son obligatorios.');
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('chronicles')
                .insert([
                    {
                        title,
                        content,
                        image_url: imageUrl,
                        author_id: user.id,
                        is_published: true
                    }
                ])
                .select();

            if (error) throw error;

            onSave(data[0]);
        } catch (err) {
            console.error('Error saving article:', err);
            setError('Error al guardar la noticia: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Nueva Crónica</h2>
                <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Título</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-yellow outline-none transition-all"
                        placeholder="Ej: Resumen Jornada 5..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Imagen (URL)</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-brand-yellow outline-none transition-all"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    {imageUrl && (
                        <div className="mt-2 h-32 rounded-lg overflow-hidden border border-slate-700 relative group">
                            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs text-white font-bold">Vista Previa</span>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contenido</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={10}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-yellow outline-none transition-all font-sans leading-relaxed"
                        placeholder="Escribe aquí el resumen de la jornada..."
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-brand-yellow text-brand-dark font-bold rounded-lg hover:bg-yellow-400 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Publicar
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminEditor;

```

## File: src\components\News\ArticleCard.jsx
```javascript
import React from 'react';
import { Calendar, User, ArrowRight } from 'lucide-react';

const ArticleCard = ({ article, onClick }) => {
    return (
        <div
            className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-brand-yellow transition-all cursor-pointer group"
            onClick={() => onClick(article)}
        >
            {article.image_url && (
                <div className="h-48 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60"></div>
                    <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                </div>
            )}

            <div className="p-5">
                <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                    <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{new Date(article.created_at).toLocaleDateString()}</span>
                    </div>
                    {article.author && (
                        <div className="flex items-center gap-1">
                            <User size={14} />
                            <span>{article.author}</span>
                        </div>
                    )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-yellow transition-colors">
                    {article.title}
                </h3>

                <p className="text-slate-400 text-sm line-clamp-3 mb-4">
                    {article.content}
                </p>

                <div className="flex items-center text-brand-yellow text-sm font-medium">
                    Leer más <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </div>
    );
};

export default ArticleCard;

```

## File: src\components\News\ArticleDetail.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User, Share2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const ArticleDetail = ({ articleId, onBack }) => {
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArticle = async () => {
            if (!articleId) return;

            try {
                const { data, error } = await supabase
                    .from('chronicles')
                    .select('*')
                    .eq('id', articleId)
                    .single();

                if (error) throw error;
                setArticle(data);
            } catch (err) {
                console.error('Error fetching article:', err);
                // Fallback for demo if ID matches mock data
                const mock = MOCK_ARTICLES.find(a => a.id === articleId);
                if (mock) setArticle(mock);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [articleId]);

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando noticia...</div>;
    if (!article) return <div className="p-8 text-center text-red-400">Noticia no encontrada</div>;

    return (
        <div className="max-w-3xl mx-auto bg-slate-900 min-h-screen pb-20">
            {/* Header Image */}
            <div className="relative h-64 md:h-80 w-full">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
                <img
                    src={article.image_url || 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=800&auto=format&fit=crop'}
                    alt={article.title}
                    className="w-full h-full object-cover -z-10"
                />
                <button
                    onClick={onBack}
                    className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-brand-red transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
            </div>

            {/* Content */}
            <div className="px-6 -mt-12 relative z-10">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                        <div className="flex items-center gap-1">
                            <Calendar size={16} />
                            <span>{new Date(article.created_at).toLocaleDateString()}</span>
                        </div>
                        {article.author && (
                            <div className="flex items-center gap-1">
                                <User size={16} />
                                <span>{article.author}</span>
                            </div>
                        )}
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
                        {article.title}
                    </h1>

                    <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {article.content}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end">
                        <button className="flex items-center gap-2 text-brand-yellow hover:text-white transition-colors">
                            <Share2 size={20} />
                            <span>Compartir</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Duplicate mock data for fallback
const MOCK_ARTICLES = [
    {
        id: '1',
        title: 'Resumen Jornada 5: Sorpresas en el Grupo 1',
        content: 'Una semana llena de emociones donde los favoritos han sufrido para mantener sus posiciones. Destacamos el partido entre...',
        image_url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=800&auto=format&fit=crop',
        created_at: new Date().toISOString(),
        author: 'Admin'
    },
    {
        id: '2',
        title: 'Torneo de Navidad: Inscripciones Abiertas',
        content: 'Ya puedes apuntarte al tradicional torneo de Navidad. Plazas limitadas para todas las categorías. ¡No te quedes fuera!',
        image_url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        author: 'Dirección'
    }
];

export default ArticleDetail;

```

## File: src\components\News\NewsFeed.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import ArticleCard from './ArticleCard';
import ArticleDetail from './ArticleDetail';
import AdminEditor from './AdminEditor';
import { Loader2, Newspaper, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NewsFeed = ({ onBack }) => {
    const { user } = useAuth();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [selectedArticleId, setSelectedArticleId] = useState(null);

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const { data, error } = await supabase
                .from('chronicles')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Error fetching chronicles:', error);
                setArticles(MOCK_ARTICLES);
            } else if (data && data.length > 0) {
                setArticles(data);
            } else {
                setArticles(MOCK_ARTICLES);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            setArticles(MOCK_ARTICLES);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = (newArticle) => {
        setArticles([newArticle, ...articles]);
        setShowEditor(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-brand-yellow" size={32} />
            </div>
        );
    }

    // Detail View
    if (selectedArticleId) {
        return (
            <ArticleDetail
                articleId={selectedArticleId}
                onBack={() => setSelectedArticleId(null)}
            />
        );
    }

    // List View
    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 mr-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                    )}
                    <div className="p-3 bg-brand-red/10 rounded-xl">
                        <Newspaper className="text-brand-red" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Crónica Semanal</h1>
                        <p className="text-slate-400 text-sm">Resumen de la jornada y novedades</p>
                    </div>
                </div>

                {user?.role === 'admin' && !showEditor && (
                    <button
                        onClick={() => setShowEditor(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-yellow text-brand-dark font-bold rounded-lg hover:bg-yellow-400 transition-all shadow-lg shadow-brand-yellow/20"
                    >
                        <Plus size={20} /> Nueva Noticia
                    </button>
                )}
            </div>

            {showEditor && (
                <div className="mb-8">
                    <AdminEditor onSave={handleSave} onCancel={() => setShowEditor(false)} />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {articles.map(article => (
                    <ArticleCard
                        key={article.id}
                        article={article}
                        onClick={(a) => setSelectedArticleId(a.id)}
                    />
                ))}
            </div>
        </div>
    );
};

const MOCK_ARTICLES = [
    {
        id: '1',
        title: 'Resumen Jornada 5: Sorpresas en el Grupo 1',
        content: 'Una semana llena de emociones donde los favoritos han sufrido para mantener sus posiciones. Destacamos el partido entre...',
        image_url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=800&auto=format&fit=crop',
        created_at: new Date().toISOString(),
        author: 'Admin'
    },
    {
        id: '2',
        title: 'Torneo de Navidad: Inscripciones Abiertas',
        content: 'Ya puedes apuntarte al tradicional torneo de Navidad. Plazas limitadas para todas las categorías. ¡No te quedes fuera!',
        image_url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        author: 'Dirección'
    }
];

export default NewsFeed;

```

## File: src\components\PadelMatchApp.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, Users, Activity, RefreshCw, MapPin, FileSpreadsheet, Upload, ChevronDown, ChevronRight, Clock, LogOut, Home, User, Settings, Menu, X, Newspaper } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

// --- UI Components ---
const Card = ({ children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
        {children}
    </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, size = "md" }) => {
    const baseStyle = "rounded-lg font-medium transition-all flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed";
    const sizes = {
        sm: "px-2 py-1 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };
    const variants = {
        primary: "bg-brand-red text-white hover:bg-brand-dark shadow-sm shadow-brand-red/20",
        secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
        outline: "border-2 border-brand-red text-brand-red hover:bg-red-50",
        success: "bg-emerald-600 text-white hover:bg-emerald-700",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-100",
        danger: "bg-red-50 text-red-600 hover:bg-red-100"
    };
    return (
        <button onClick={onClick} className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled}>
            {children}
        </button>
    );
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// --- Sub-components ---

const ImportModal = ({ importText, setImportText, setShowImportModal, handleBulkImport }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                <FileSpreadsheet className="text-green-600" /> Importar desde Sheets/Excel
            </h3>
            <p className="text-xs text-slate-500 mb-3">
                Copia las celdas en tu hoja de cálculo (Ctrl+C) y pégalas aquí (Ctrl+V).
            </p>
            <textarea
                className="w-full h-48 p-3 border rounded-lg text-xs font-mono bg-slate-50 focus:ring-2 ring-brand-yellow outline-none"
                placeholder={`Formato recomendado:\nColumna A: Nombre\nColumna B: Grupo (Opcional)\nColumna C: Disponibilidad\n\nEjemplo:\nNadal\tGrupo A\tLunes 10:00, Martes 12:00`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-4">
                <Button variant="secondary" onClick={() => setShowImportModal(false)}>Cancelar</Button>
                <Button variant="success" onClick={handleBulkImport}>Procesar e Importar</Button>
            </div>
        </div>
    </div>
);

const CourtsView = ({ sport, tennisCategory, isAdmin, currentSlots, courtAvailability, fillDailyCourts, updateCourtCount }) => {
    const [expandedDay, setExpandedDay] = useState(DAYS[0]);
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-brand-dark">
                    <MapPin size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-brand-dark">Disponibilidad de Pistas</h3>
                    <p className="text-sm text-slate-600">
                        Gestiona los cupos disponibles por hora.
                        {sport === 'tennis' ? (tennisCategory === 'adults' ? ' (Turnos de 2h)' : ' (Turnos de 1h)') : ' (Turnos de 90min)'}
                    </p>
                </div>
            </div>

            <div className="grid gap-3">
                {DAYS.map(day => (
                    <div key={day} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div
                            className="p-4 bg-slate-50/50 flex justify-between items-center cursor-pointer hover:bg-slate-50"
                            onClick={() => setExpandedDay(expandedDay === day ? null : day)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-1 h-8 rounded-full ${expandedDay === day ? 'bg-brand-red' : 'bg-slate-300'}`}></div>
                                <h4 className="font-bold text-slate-700 text-lg">{day}</h4>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium px-2 py-1 bg-white border rounded-md text-slate-500">
                                    {currentSlots.filter(s => s.day === day).reduce((acc, curr) => acc + (courtAvailability[curr.id] || 0), 0)} cupos
                                </span>
                                {expandedDay === day ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                            </div>
                        </div>

                        {expandedDay === day && (
                            <div className="p-4 border-t bg-white">
                                {isAdmin && (
                                    <div className="flex justify-end mb-4 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Relleno Rápido:</span>
                                        <button onClick={() => fillDailyCourts(day, 0)} className="text-xs px-3 py-1.5 bg-white text-red-600 rounded-md border hover:bg-red-50 transition-colors font-medium">Vaciar</button>
                                        <button onClick={() => fillDailyCourts(day, sport === 'padel' ? 3 : 7)} className="text-xs px-3 py-1.5 bg-white text-brand-dark rounded-md border hover:bg-blue-50 transition-colors font-medium">Llenar</button>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {currentSlots.filter(s => s.day === day).map(slot => (
                                        <div key={slot.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:border-brand-yellow/50 transition-colors">
                                            <span className="text-sm font-mono font-bold text-slate-600">{slot.hour}</span>
                                            <div className="flex items-center gap-2">
                                                {isAdmin && <button onClick={() => updateCourtCount(slot.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white border rounded-lg hover:bg-slate-50 text-slate-500 hover:text-red-500 transition-colors">-</button>}
                                                <span className={`w-8 text-center font-bold text-lg ${(courtAvailability[slot.id] || 0) === 0 ? 'text-red-400' : 'text-brand-dark'}`}>
                                                    {courtAvailability[slot.id] || 0}
                                                </span>
                                                {isAdmin && <button onClick={() => updateCourtCount(slot.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white border rounded-lg hover:bg-slate-50 text-slate-500 hover:text-green-600 transition-colors">+</button>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const TeamsView = ({ teams, isAdmin, setShowImportModal, editingTeamId, setEditingTeamId, editingDay, setEditingDay, currentSlots, toggleAvailability, selectedAvailability, saveTeamAvailability, startEditing, generateDemoData }) => {
    const [selectedGroup, setSelectedGroup] = useState('Todos');
    const groups = ['Todos', ...new Set(teams.map(t => t.group).filter(Boolean))].sort();
    const filteredTeams = selectedGroup === 'Todos' ? teams : teams.filter(t => t.group === selectedGroup);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-yellow/10 rounded-lg text-brand-dark">
                        <Users size={24} />
                    </div>
                    <h2 className="font-bold text-xl text-slate-800">Parejas / Jugadores</h2>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-brand-yellow focus:border-brand-yellow block p-2.5 outline-none flex-1 md:w-48"
                    >
                        {groups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    {isAdmin && (
                        <>
                            <Button variant="secondary" size="sm" onClick={generateDemoData} title="Generar datos de prueba">
                                <RefreshCw size={18} />
                            </Button>
                            <Button variant="success" size="sm" onClick={() => setShowImportModal(true)} title="Importar Excel">
                                <Upload size={18} />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredTeams.map(team => (
                    <Card key={team.id} className="p-5 relative hover:shadow-md transition-shadow group">
                        {editingTeamId === team.id ? (
                            <div className="animate-in fade-in duration-200">
                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                                    <h4 className="text-sm font-bold text-brand-red uppercase tracking-wide">Editando Disponibilidad</h4>
                                    <div className="flex gap-1">
                                        {DAYS.map(d => (
                                            <button
                                                key={d}
                                                onClick={() => setEditingDay(d)}
                                                className={`w-7 h-7 flex items-center justify-center rounded-md text-[10px] font-bold transition-all ${editingDay === d ? 'bg-brand-red text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                {d.substring(0, 1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 min-h-[120px]">
                                    <div className="grid grid-cols-3 gap-2">
                                        {currentSlots.filter(s => s.day === editingDay).map(slot => (
                                            <button
                                                key={slot.id}
                                                onClick={() => toggleAvailability(slot.id)}
                                                className={`text-xs py-2 rounded-lg border transition-all font-medium ${selectedAvailability.includes(slot.id) ? 'bg-brand-red text-white shadow-md transform scale-105 border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-yellow'}`}
                                            >
                                                {slot.hour}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => setEditingTeamId(null)}>Cancelar</Button>
                                    <Button variant="primary" size="sm" onClick={() => saveTeamAvailability(team.id)}>Guardar Cambios</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-start">
                                <div className="w-full">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                {team.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-base">{team.name}</h3>
                                        </div>
                                        {team.group && <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 rounded-full font-bold border border-slate-200">{team.group}</span>}
                                    </div>

                                    <div className="flex gap-3 text-xs mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-[10px] uppercase font-bold">Partidos</span>
                                            <span className="font-bold text-slate-700">{team.matchesPlayed}</span>
                                        </div>
                                        <div className="w-px bg-slate-200"></div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-[10px] uppercase font-bold">Puntos</span>
                                            <span className="font-bold text-brand-red">{team.points}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disponibilidad:</span>
                                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-hidden">
                                            {team.availability.length === 0
                                                ? <span className="text-xs text-slate-400 italic bg-slate-50 px-2 py-1 rounded">Sin disponibilidad registrada</span>
                                                : team.availability.slice(0, 8).map(s => {
                                                    const slot = currentSlots.find(ts => ts.id === s);
                                                    return (
                                                        <span key={s} className="text-[10px] bg-blue-50 text-brand-dark px-1.5 py-0.5 rounded border border-blue-100 font-medium">
                                                            {slot?.day.substring(0, 3)} {slot?.hour}
                                                        </span>
                                                    );
                                                })
                                            }
                                            {team.availability.length > 8 && <span className="text-[10px] text-slate-400 self-center">+{team.availability.length - 8} más</span>}
                                        </div>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={() => startEditing(team)}
                                        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-brand-red hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                        title="Editar Disponibilidad"
                                    >
                                        <Settings size={18} />
                                    </button>
                                )}
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
};

const MyAvailabilityView = ({ teams, currentSlots }) => {
    const { updateTeamAvailability } = useData();
    const [myTeamId, setMyTeamId] = useState(localStorage.getItem('myTeamId') || '');
    const [selectedAvailability, setSelectedAvailability] = useState([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Load availability when team is selected
    useEffect(() => {
        if (myTeamId) {
            const team = teams.find(t => t.id === parseInt(myTeamId));
            if (team) {
                // Only update from source if we don't have unsaved changes or if we just switched teams
                if (!hasUnsavedChanges) {
                    const newAvail = team.availability || [];
                    // Avoid infinite loop by checking if value actually changed
                    if (JSON.stringify(selectedAvailability) !== JSON.stringify(newAvail)) {
                        // eslint-disable-next-line
                        setSelectedAvailability(newAvail);
                    }
                }
            }
        }
    }, [myTeamId, teams, hasUnsavedChanges]);

    const handleTeamChange = (e) => {
        setMyTeamId(e.target.value);
        setHasUnsavedChanges(false);
        localStorage.setItem('myTeamId', e.target.value);
        const team = teams.find(t => t.id === parseInt(e.target.value));
        if (team) setSelectedAvailability(team.availability || []);
    };

    const toggleSlot = (slotId) => {
        setHasUnsavedChanges(true);
        if (selectedAvailability.includes(slotId)) {
            setSelectedAvailability(prev => prev.filter(id => id !== slotId));
        } else {
            setSelectedAvailability(prev => [...prev, slotId]);
        }
    };

    const save = () => {
        if (!myTeamId) return;
        updateTeamAvailability(parseInt(myTeamId), selectedAvailability);
        setHasUnsavedChanges(false);
        alert('¡Disponibilidad guardada correctamente!');
    };

    if (!myTeamId) {
        return (
            <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-2xl shadow-lg border border-slate-200 text-center animate-in fade-in zoom-in">
                <div className="w-16 h-16 bg-brand-yellow/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-dark">
                    <User size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Identifícate</h2>
                <p className="text-slate-500 mb-6">Para gestionar tu disponibilidad, primero dinos quién eres.</p>

                <select
                    value={myTeamId}
                    onChange={handleTeamChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-yellow transition-all"
                >
                    <option value="">Selecciona tu nombre...</option>
                    {teams.sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>
        );
    }

    const team = teams.find(t => t.id === parseInt(myTeamId));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-red text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-brand-red/20">
                        {team?.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Hola, {team?.name}</h2>
                        <p className="text-slate-500 text-sm">Gestiona tus horarios para esta semana.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setMyTeamId('')} className="text-sm text-slate-400 hover:text-slate-600 underline">Cambiar Usuario</button>
                    {hasUnsavedChanges && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full animate-pulse">Cambios sin guardar</span>
                    )}
                    <Button onClick={save} disabled={!hasUnsavedChanges} className={hasUnsavedChanges ? 'animate-bounce-subtle' : ''}>
                        Guardar Disponibilidad
                    </Button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {DAYS.map(day => (
                        <div key={day} className="border border-slate-100 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 p-3 border-b border-slate-100 font-bold text-slate-700 text-center">
                                {day}
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-2">
                                {currentSlots.filter(s => s.day === day).map(slot => (
                                    <button
                                        key={slot.id}
                                        onClick={() => toggleSlot(slot.id)}
                                        className={`text-xs py-2 px-1 rounded-lg border transition-all font-medium ${selectedAvailability.includes(slot.id)
                                            ? 'bg-brand-red text-white shadow-md border-transparent transform scale-105'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-brand-yellow hover:bg-slate-50'}`}
                                    >
                                        {slot.hour}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ScheduleView = ({ matches, isAdmin, generateWeeklySchedule, generationLog, currentSlots, submitResult, postponeMatch, registerWalkover }) => {
    const activeMatches = matches.filter(m => !m.completed);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {isAdmin && (
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold flex items-center gap-3 mb-1"><RefreshCw className="text-brand-yellow" /> Generador de Jornada</h2>
                        <p className="text-slate-400 text-sm max-w-md">
                            El algoritmo cruzará automáticamente parejas con horarios compatibles y pistas disponibles, evitando repeticiones.
                        </p>
                    </div>
                    <Button onClick={generateWeeklySchedule} className="bg-brand-red hover:bg-brand-dark text-white border-none shadow-lg shadow-brand-red/30 w-full md:w-auto py-3 px-6 relative z-10">
                        Generar Nueva Jornada
                    </Button>
                </div>
            )}

            {generationLog && (
                <div className="p-4 bg-amber-50 text-amber-800 text-sm rounded-xl border border-amber-100 flex items-start gap-3">
                    <Activity className="shrink-0 mt-0.5" size={18} />
                    {generationLog}
                </div>
            )}

            <div className="space-y-4">
                <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                    <Calendar className="text-brand-red" size={20} /> Partidos Pendientes
                </h3>

                {activeMatches.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Calendar size={32} />
                        </div>
                        <p className="text-slate-500 font-medium">No hay partidos programados para esta semana.</p>
                        {isAdmin && <p className="text-slate-400 text-sm mt-1">Utiliza el generador para crear nuevos enfrentamientos.</p>}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    {activeMatches.map(match => {
                        const slotDetails = currentSlots.find(s => s.id === match.slot);
                        return (
                            <Card key={match.id} className={`flex flex-col overflow-hidden border-l-4 transition-all hover:shadow-md ${match.postponed ? 'border-l-amber-500' : 'border-l-brand-red'}`}>
                                <div className="flex flex-row h-full">
                                    <div className="bg-slate-50 p-4 flex flex-col justify-center items-center min-w-[100px] border-r border-slate-100">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{slotDetails?.day.substring(0, 3)}</span>
                                        <span className="text-xl font-bold text-slate-700">{slotDetails?.hour}</span>
                                        {match.postponed && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mt-2">APLAZADO</span>}
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-center">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex-1 text-right pr-3">
                                                <span className="font-bold text-slate-800 block leading-tight">{match.t1.name}</span>
                                            </div>
                                            <div className="text-xs font-bold text-white bg-slate-300 rounded-full w-6 h-6 flex items-center justify-center shrink-0">VS</div>
                                            <div className="flex-1 text-left pl-3">
                                                <span className="font-bold text-slate-800 block leading-tight">{match.t2.name}</span>
                                            </div>
                                        </div>

                                        {isAdmin ? (
                                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-wrap gap-2 items-center justify-center">
                                                <input id={`score-${match.id}`} placeholder="6-3 6-4" className="w-24 border border-slate-300 rounded px-2 text-sm outline-none focus:border-brand-yellow h-8 text-center" />
                                                <select id={`winner-${match.id}`} className="border border-slate-300 rounded text-sm px-2 bg-white outline-none h-8 w-32 cursor-pointer">
                                                    <option value="">Ganador...</option>
                                                    <option value={match.t1.id}>{match.t1.name}</option>
                                                    <option value={match.t2.id}>{match.t2.name}</option>
                                                </select>
                                                <Button size="sm" onClick={() => {
                                                    const score = document.getElementById(`score-${match.id}`).value;
                                                    const winner = document.getElementById(`winner-${match.id}`).value;
                                                    if (score && winner) submitResult(match.id, score, winner);
                                                }}>OK</Button>

                                                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                                                <Button size="sm" variant="ghost" className="text-amber-600 hover:bg-amber-50 hover:text-amber-700" onClick={() => postponeMatch(match.id)}>
                                                    Aplazar
                                                </Button>

                                                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                                                <Button size="sm" variant="ghost" className="text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Walkover / Retirada" onClick={() => {
                                                    const winner = document.getElementById(`winner-${match.id}`).value;
                                                    if (!winner) {
                                                        alert("Selecciona primero quién ha ganado (el que SÍ se presentó).");
                                                        return;
                                                    }
                                                    registerWalkover(match.id, winner);
                                                }}>
                                                    W.O.
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                                                    {match.postponed ? 'Pendiente de reprogramación' : 'Partido por jugar'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default function Dashboard({ onNavigate, currentPath }) {
    const { user, logout } = useAuth();
    const { sport, setSport, setRole, tennisCategory, setTennisCategory } = useGame();
    const { data, currentSlots, updateTeamAvailability, updateCourtCount, saveMatchResult, createSchedule, generateDemoData, postponeMatch, registerWalkover, importPlayers } = useData();

    // Navigation State
    const [activeTab, setActiveTab] = useState('home'); // home, schedule, teams, standings, courts, availability
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Local Data State
    const [selectedAvailability, setSelectedAvailability] = useState([]);
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [editingDay, setEditingDay] = useState('Lunes');
    const [generationLog, setGenerationLog] = useState("");
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState("");

    // Derived Data
    const teams = data?.teams || [];
    const matches = data?.matches || [];
    const courtAvailability = data?.courts || {};
    const isAdmin = user?.role === 'admin';
    const isTennis = sport === 'tennis';

    // Initialize Role from Auth
    useEffect(() => {
        if (user) {
            setRole(user.role);
        }
    }, [user, setRole]);

    // Initialize Courts
    useEffect(() => {
        if (currentSlots.length > 0 && Object.keys(courtAvailability).length === 0 && sport) {
            // const maxCourts = sport === 'padel' ? 3 : 7;
            // Unused let initialCourts removed
            // const initialCourts = currentSlots.reduce((acc, slot) => ({ ...acc, [slot.id]: maxCourts }), {});
            // updateData({ courts: initialCourts }); // Skipped for now
        }
    }, [currentSlots, courtAvailability, sport]);

    // --- Actions ---

    const handleBulkImport = () => {
        if (!importText.trim()) return;

        // Parse text
        const lines = importText.trim().split('\n');
        const players = lines.map(line => {
            // Split by tab (Excel copy) or comma
            const parts = line.includes('\t') ? line.split('\t') : line.split(',');
            return {
                name: parts[0]?.trim(),
                group: parts[1]?.trim(),
                availability: parts[2]?.trim() // Expected: "Lunes 10:00, Martes 12:00"
            };
        }).filter(p => p.name); // Filter empty lines

        if (players.length === 0) {
            alert("No se detectaron datos válidos.");
            return;
        }

        if (confirm(`¿Importar ${players.length} jugadores?`)) {
            importPlayers(players);
            setShowImportModal(false);
            setImportText("");
        }
    };

    const toggleAvailability = (slotId) => {
        if (selectedAvailability.includes(slotId)) setSelectedAvailability(selectedAvailability.filter(id => id !== slotId));
        else setSelectedAvailability([...selectedAvailability, slotId]);
    };

    const saveTeamAvailability = (teamId) => {
        updateTeamAvailability(teamId, selectedAvailability);
        setEditingTeamId(null);
        setSelectedAvailability([]);
    };

    const startEditing = (team) => {
        setEditingTeamId(team.id);
        setSelectedAvailability(team.availability || []);
        setEditingDay('Lunes');
    };

    const updateCourtCountHandler = (slotId, delta) => {
        if (!isAdmin) return;
        const maxCourts = sport === 'padel' ? 3 : 7;
        const currentCount = courtAvailability[slotId] || 0;
        const newCount = Math.max(0, Math.min(maxCourts, currentCount + delta));
        updateCourtCount(slotId, newCount);
    };

    const fillDailyCourts = (day, count) => {
        if (!isAdmin) return;
        currentSlots.filter(s => s.day === day).forEach(s => {
            updateCourtCount(s.id, count);
        });
    };

    const generateWeeklyScheduleHandler = () => {
        if (!isAdmin) return;
        let schedule = [];
        let availableTeams = [...teams];
        let scheduledTeamIds = new Set();
        let weeklyCourts = { ...courtAvailability };
        const matchHistory = {};
        matches.forEach(m => { matchHistory[`${m.t1.id}-${m.t2.id}`] = true; matchHistory[`${m.t2.id}-${m.t1.id}`] = true; });
        let possibleMatchups = [];
        for (let i = 0; i < availableTeams.length; i++) {
            for (let j = i + 1; j < availableTeams.length; j++) {
                const t1 = availableTeams[i];
                const t2 = availableTeams[j];
                if (matchHistory[`${t1.id}-${t2.id}`]) continue;
                if (t1.group && t2.group && t1.group !== t2.group) continue;
                const validSlots = t1.availability.filter(slot => t2.availability.includes(slot) && (weeklyCourts[slot] || 0) > 0);
                if (validSlots.length > 0) {
                    possibleMatchups.push({ t1, t2, validSlots, difficulty: validSlots.length });
                }
            }
        }
        possibleMatchups.sort((a, b) => a.difficulty - b.difficulty);
        possibleMatchups.forEach(match => {
            if (!scheduledTeamIds.has(match.t1.id) && !scheduledTeamIds.has(match.t2.id)) {
                const finalSlot = match.validSlots.find(slot => (weeklyCourts[slot] || 0) > 0);
                if (finalSlot) {
                    schedule.push({ t1: match.t1, t2: match.t2, slot: finalSlot });
                    scheduledTeamIds.add(match.t1.id);
                    scheduledTeamIds.add(match.t2.id);
                    weeklyCourts[finalSlot]--;
                }
            }
        });

        createSchedule(schedule);

        const unassigned = teams.filter(t => !scheduledTeamIds.has(t.id));
        setGenerationLog(`Jornada generada: ${schedule.length} partidos. Sin jugar: ${unassigned.length} parejas.`);
        setActiveTab('schedule');
    };

    const submitResultHandler = (matchId, score, winnerId) => {
        if (!isAdmin) return;
        saveMatchResult(matchId, score, winnerId);
    };

    const postponeMatchHandler = (matchId) => {
        if (!isAdmin) return;
        if (confirm("¿Seguro que quieres aplazar este partido?")) {
            postponeMatch(matchId);
        }
    };

    const registerWalkoverHandler = (matchId, winnerId) => {
        if (!isAdmin) return;
        if (confirm("¿Confirmar victoria por W.O. (Walkover)?\nEl ganador recibirá 3 puntos y el perdedor 0.")) {
            registerWalkover(matchId, winnerId);
        }
    };

    const renderContent = () => {
        if (!sport) {
            // Home / Dashboard Landing
            return (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">Hola, {user?.name}</h2>
                        <p className="text-slate-500">Selecciona una disciplina para comenzar a gestionar.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div
                            onClick={() => { setSport('padel'); setActiveTab(isAdmin ? 'schedule' : 'availability'); }}
                            className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-red hover:shadow-xl hover:shadow-brand-red/10 transition-all cursor-pointer group"
                        >
                            <div className="w-16 h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-red group-hover:text-white transition-colors text-brand-red">
                                <Activity size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">Pádel</h3>
                            <p className="text-slate-500">Gestión de torneos, parejas y rankings de pádel.</p>
                        </div>

                        <div
                            onClick={() => { setSport('tennis'); setActiveTab(isAdmin ? 'schedule' : 'availability'); }}
                            className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:border-brand-yellow hover:shadow-xl hover:shadow-brand-yellow/10 transition-all cursor-pointer group"
                        >
                            <div className="w-16 h-16 bg-brand-yellow/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-yellow group-hover:text-white transition-colors text-brand-yellow">
                                <Activity size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">Tenis</h3>
                            <p className="text-slate-500">Gestión de escuela, torneos y rankings de tenis.</p>
                        </div>
                    </div>
                </div>
            );
        }

        // Sport Selected View
        return (
            <div className="max-w-6xl mx-auto">
                {activeTab === 'availability' && <MyAvailabilityView teams={teams} currentSlots={currentSlots} />}
                {activeTab === 'schedule' && <ScheduleView matches={matches} isAdmin={isAdmin} generateWeeklySchedule={generateWeeklyScheduleHandler} generationLog={generationLog} currentSlots={currentSlots} submitResult={submitResultHandler} postponeMatch={postponeMatchHandler} registerWalkover={registerWalkoverHandler} />}
                {activeTab === 'teams' && <TeamsView teams={teams} isAdmin={isAdmin} setShowImportModal={setShowImportModal} editingTeamId={editingTeamId} setEditingTeamId={setEditingTeamId} editingDay={editingDay} setEditingDay={setEditingDay} currentSlots={currentSlots} toggleAvailability={toggleAvailability} selectedAvailability={selectedAvailability} saveTeamAvailability={saveTeamAvailability} startEditing={startEditing} generateDemoData={generateDemoData} />}
                {activeTab === 'courts' && <CourtsView sport={sport} tennisCategory={tennisCategory} isAdmin={isAdmin} currentSlots={currentSlots} courtAvailability={courtAvailability} fillDailyCourts={fillDailyCourts} updateCourtCount={updateCourtCountHandler} />}
                {activeTab === 'standings' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        {[...new Set(teams.map(t => t.group || 'General').filter(Boolean))].sort().map(group => {
                            const groupTeams = teams.filter(t => (t.group || 'General') === group).sort((a, b) => b.points - a.points);
                            const topPlayer = groupTeams[0];

                            return (
                                <div key={group} className="space-y-4">
                                    {/* Highlight Top Player */}
                                    {topPlayer && (
                                        <div className="bg-gradient-to-r from-brand-yellow/20 to-transparent p-1 rounded-2xl">
                                            <div className="bg-white p-4 rounded-xl border border-brand-yellow/30 flex items-center gap-4 shadow-sm">
                                                <div className="w-12 h-12 bg-brand-yellow text-brand-dark rounded-full flex items-center justify-center font-bold text-xl shadow-lg shadow-brand-yellow/20">
                                                    <Trophy size={24} />
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-brand-dark uppercase tracking-wider">Líder del Grupo {group}</span>
                                                    <h3 className="text-lg font-bold text-slate-800">{topPlayer.name}</h3>
                                                </div>
                                                <div className="ml-auto text-right">
                                                    <span className="block text-2xl font-bold text-brand-dark">{topPlayer.points}</span>
                                                    <span className="text-xs text-slate-500">Puntos</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <Card className="overflow-hidden">
                                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
                                            <Trophy className="text-slate-400" size={20} />
                                            <h3 className="font-bold text-slate-700">{group}</h3>
                                        </div>

                                        {/* Mobile View */}
                                        <div className="block md:hidden">
                                            {groupTeams.map((t, i) => (
                                                <div key={t.id} className="p-4 border-b border-slate-100 flex items-center justify-between last:border-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-400 text-white shadow-md' :
                                                            i === 1 ? 'bg-slate-300 text-slate-600 shadow-sm' :
                                                                i === 2 ? 'bg-amber-600 text-white shadow-sm' :
                                                                    'bg-slate-100 text-slate-500'
                                                            }`}>
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-slate-700 block">{t.name}</span>
                                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                {i < 2 ? <span className="text-green-500">▲ Subiendo</span> : <span className="text-slate-400">- Estable</span>}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-brand-red text-lg">{t.points} pts</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Desktop View */}
                                        <table className="w-full text-sm text-left hidden md:table">
                                            <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs font-bold tracking-wider">
                                                <tr>
                                                    <th className="p-4 w-16 text-center">Pos</th>
                                                    <th className="p-4">Pareja / Jugador</th>
                                                    <th className="p-4 text-center">Tendencia</th>
                                                    <th className="p-4 text-center">PJ</th>
                                                    <th className="p-4 text-center">Puntos</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {groupTeams.map((t, i) => (
                                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 text-center">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mx-auto ${i === 0 ? 'bg-yellow-400 text-white shadow-md' :
                                                                i === 1 ? 'bg-slate-300 text-slate-600 shadow-sm' :
                                                                    i === 2 ? 'bg-amber-600 text-white shadow-sm' :
                                                                        'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                {i + 1}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-medium text-slate-700">{t.name}</td>
                                                        <td className="p-4 text-center">
                                                            {i < 2 ? (
                                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                                                    ▲ Subiendo
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                                                    - Estable
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center font-mono text-slate-500">{t.matchesPlayed || 0}</td>
                                                        <td className="p-4 text-center font-bold text-brand-red text-lg">{t.points}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </Card>
                                </div>
                            );
                        })}
                        {teams.length === 0 && <div className="text-center text-slate-400 py-12">No hay jugadores registrados en el ranking.</div>}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex">
            {showImportModal && <ImportModal importText={importText} setImportText={setImportText} setShowImportModal={setShowImportModal} handleBulkImport={handleBulkImport} />}

            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-20">
                <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                    <div className="w-10 h-10 bg-white rounded-lg p-1">
                        <img src="/src/assets/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="font-bold leading-none">Escuela</h1>
                        <span className="text-xs text-brand-yellow font-bold">Marineda</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setSport(null)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${!sport && (!currentPath || currentPath === '/') ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Home size={20} /> Inicio
                    </button>

                    <button
                        onClick={() => onNavigate && onNavigate('/noticias')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentPath === '/noticias' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Newspaper size={20} /> Noticias
                    </button>





                    <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Deportes</div>

                    <button
                        onClick={() => { setSport('padel'); setActiveTab(isAdmin ? 'schedule' : 'availability'); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${sport === 'padel' ? 'bg-slate-800 text-white border-l-4 border-brand-red' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Activity size={20} /> Pádel
                    </button>
                    <button
                        onClick={() => { setSport('tennis'); setActiveTab(isAdmin ? 'schedule' : 'availability'); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${sport === 'tennis' ? 'bg-slate-800 text-white border-l-4 border-brand-yellow' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <Activity size={20} /> Tenis
                    </button>

                    {isAdmin && (
                        <>
                            <div className="pt-4 pb-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Administración</div>
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
                                <Users size={20} /> Perfiles
                            </button>
                        </>
                    )}
                </nav>







                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center font-bold text-white text-xs">
                            {user?.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold truncate">{user?.name}</p>
                            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="w-full flex items-center gap-2 justify-center px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-red-900/50 transition-all text-sm">
                        <LogOut size={16} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">

                {/* Mobile Header */}
                <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
                    <div className="flex items-center gap-2">
                        <img src="/src/assets/logo.png" alt="Logo" className="w-8 h-8 object-contain bg-white rounded p-0.5" />
                        <span className="font-bold">Marineda</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
                        {isMobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </header>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 bg-slate-900 z-20 pt-20 px-4 space-y-4">
                        <button onClick={() => { setSport(null); setIsMobileMenuOpen(false); }} className="w-full p-4 bg-slate-800 rounded-xl text-left font-bold text-white">Inicio</button>
                        <button onClick={() => { setSport('padel'); setActiveTab(isAdmin ? 'schedule' : 'availability'); setIsMobileMenuOpen(false); }} className="w-full p-4 bg-slate-800 rounded-xl text-left font-bold text-white">Pádel</button>
                        <button onClick={() => { setSport('tennis'); setActiveTab(isAdmin ? 'schedule' : 'availability'); setIsMobileMenuOpen(false); }} className="w-full p-4 bg-slate-800 rounded-xl text-left font-bold text-white">Tenis</button>
                        <button onClick={logout} className="w-full p-4 bg-red-900/50 rounded-xl text-left font-bold text-red-200 mt-8">Cerrar Sesión</button>
                    </div>
                )}

                {/* Top Bar (Contextual) */}
                {sport && (
                    <div className="bg-white border-b border-slate-200 sticky top-0 md:top-0 z-10 px-6 py-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-slate-800 capitalize flex items-center gap-2">
                                {sport === 'padel' ? 'Pádel' : 'Tenis'}
                                {isTennis && (
                                    <select
                                        value={tennisCategory}
                                        onChange={(e) => setTennisCategory(e.target.value)}
                                        className="text-xs bg-slate-100 border-none rounded px-2 py-1 font-bold text-brand-red outline-none cursor-pointer hover:bg-slate-200 ml-2"
                                    >
                                        <option value="adults">Adultos</option>
                                        <option value="juveniles">Juveniles</option>
                                    </select>
                                )}
                            </h2>
                        </div>

                        {/* Sub-navigation Tabs */}
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
                            {!isAdmin && (
                                <button
                                    onClick={() => setActiveTab('availability')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'availability' ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Mi Disponibilidad
                                </button>
                            )}
                            <button
                                onClick={() => setActiveTab('schedule')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'schedule' ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Jornada
                            </button>
                            <button
                                onClick={() => setActiveTab('teams')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'teams' ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Parejas
                            </button>
                            <button
                                onClick={() => setActiveTab('standings')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'standings' ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Ranking
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => setActiveTab('courts')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'courts' ? 'bg-white text-brand-dark shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Pistas
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <main className="p-6 flex-1 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
        </div >
    );
}

```

## File: src\components\RulesHub.jsx
```javascript
import React, { useState } from 'react';
import { Book, ChevronDown, ChevronRight, HelpCircle, Info } from 'lucide-react';

const RulesHub = () => {
    const [activeTab, setActiveTab] = useState('rules'); // rules, faq
    const [expandedFaq, setExpandedFaq] = useState(null);

    return (
        <div className="max-w-4xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-brand-dark/10 rounded-xl">
                    <Info className="text-brand-dark" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Normativa e Información</h1>
                    <p className="text-slate-400 text-sm">Reglas del club y preguntas frecuentes</p>
                </div>
            </div>

            <div className="flex gap-4 mb-6 border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`pb-3 px-2 font-bold text-sm transition-all ${activeTab === 'rules' ? 'text-brand-yellow border-b-2 border-brand-yellow' : 'text-slate-400 hover:text-white'}`}
                >
                    Normativa General
                </button>
                <button
                    onClick={() => setActiveTab('faq')}
                    className={`pb-3 px-2 font-bold text-sm transition-all ${activeTab === 'faq' ? 'text-brand-yellow border-b-2 border-brand-yellow' : 'text-slate-400 hover:text-white'}`}
                >
                    Preguntas Frecuentes
                </button>
            </div>

            {activeTab === 'rules' && (
                <div className="space-y-6 text-slate-300">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Book size={20} className="text-brand-red" /> 1. Sistema de Puntuación
                        </h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Cada partido ganado otorga <strong className="text-white">3 puntos</strong>.</li>
                            <li>Cada partido perdido otorga <strong className="text-white">1 punto</strong> (por participación).</li>
                            <li>La no presentación (W.O.) otorga <strong className="text-white">0 puntos</strong> al perdedor y 3 al ganador.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Book size={20} className="text-brand-red" /> 2. Reservas y Horarios
                        </h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Los partidos deben jugarse en los horarios asignados por la organización.</li>
                            <li>Si una pareja no puede asistir, debe notificarlo con al menos 24h de antelación para reprogramar.</li>
                            <li>Los partidos aplazados deben recuperarse antes del final de la fase de grupos.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Book size={20} className="text-brand-red" /> 3. Ascensos y Descensos
                        </h3>
                        <p className="mb-2">Al final de cada fase:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Los <strong className="text-green-400">2 primeros</strong> de cada grupo ascienden al grupo superior.</li>
                            <li>Los <strong className="text-red-400">2 últimos</strong> descienden al grupo inferior.</li>
                            <li>En caso de empate a puntos, se tendrá en cuenta el enfrentamiento directo y luego la diferencia de sets/juegos.</li>
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'faq' && (
                <div className="space-y-4">
                    {FAQS.map((faq, index) => (
                        <div key={index} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                            <button
                                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-700/50 transition-colors"
                            >
                                <span className="font-bold text-white flex items-center gap-3">
                                    <HelpCircle size={18} className="text-brand-yellow" />
                                    {faq.question}
                                </span>
                                {expandedFaq === index ? <ChevronDown className="text-slate-400" /> : <ChevronRight className="text-slate-400" />}
                            </button>
                            {expandedFaq === index && (
                                <div className="p-4 pt-0 text-slate-300 text-sm leading-relaxed border-t border-slate-700/50 mt-2">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const FAQS = [
    {
        question: "¿Cómo puedo cambiar mi disponibilidad?",
        answer: "Entra en la sección de tu deporte (Pádel o Tenis), ve a la pestaña 'Disponibilidad', selecciona tu nombre y marca las horas en las que puedes jugar. Recuerda guardar los cambios."
    },
    {
        question: "¿Qué pasa si llueve?",
        answer: "Si las pistas están impracticables, la organización avisará con antelación para suspender la jornada. Los partidos se reprogramarán automáticamente."
    },
    {
        question: "¿Puedo cambiar de compañero a mitad de temporada?",
        answer: "Solo en casos de lesión justificada y con aprobación de la organización. El nuevo compañero debe tener un nivel similar para no desvirtuar la competición."
    },
    {
        question: "¿Dónde veo mis próximos partidos?",
        answer: "En la pantalla principal de tu deporte, bajo la sección 'Partidos Pendientes'. También puedes ver el calendario completo en la pestaña 'Jornada'."
    }
];

export default RulesHub;

```

## File: src\ConnectionTest.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const ConnectionTest = () => {
    const [status, setStatus] = useState('Testing...');
    const [logs, setLogs] = useState([]);

    const addLog = (msg) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    useEffect(() => {
        const runTest = async () => {
            addLog('Iniciando prueba de conexión aislada...');
            addLog(`URL: ${supabaseUrl}`);
            addLog(`Key Length: ${supabaseAnonKey?.length || 0}`);

            try {
                // 1. Simple Health Check (No Auth)
                addLog('1. Probando SELECT simple (sin auth)...');
                const start = Date.now();

                // Create a timeout promise
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT: La solicitud tardó más de 5s')), 5000)
                );

                // Supabase query promise
                // We use a simple count query on 'teams'
                const queryPromise = supabase
                    .from('teams')
                    .select('id', { count: 'exact', head: true });

                // Race them
                const { data: _data, error, count } = await Promise.race([queryPromise, timeoutPromise]);

                const duration = Date.now() - start;

                if (error) {
                    addLog(`ERROR en SELECT: ${error.message}`);
                    setStatus('FALLO DE CONEXIÓN');
                } else {
                    addLog(`ÉXITO: Conexión establecida en ${duration}ms`);
                    addLog(`Registros encontrados: ${count}`);
                    setStatus('CONEXIÓN OK');
                }

            } catch (err) {
                addLog(`EXCEPCIÓN CRÍTICA: ${err.message}`);
                setStatus('ERROR CRÍTICO');
            }

            try {
                addLog('2. Probando Raw Fetch a Supabase Auth Health...');
                const _healthStart = Date.now();
                const healthRes = await fetch(`${supabaseUrl}/auth/v1/health`, {
                    headers: { 'apikey': supabaseAnonKey }
                });
                const healthText = await healthRes.text();
                addLog(`Fetch Status: ${healthRes.status}`);
                addLog(`Fetch Response: ${healthText.slice(0, 50)}...`);
            } catch (fetchErr) {
                addLog(`RAW FETCH FAIL: ${fetchErr.message}`);
            }

            try {
                addLog('3. Probando Fetch externo (jsonplaceholder)...');
                const extRes = await fetch('https://jsonplaceholder.typicode.com/todos/1');
                addLog(`Ext Status: ${extRes.status}`);
            } catch (extErr) {
                addLog(`EXT FETCH FAIL: ${extErr.message}`);
            }

            try {
                addLog('4. Probando Cliente SIN PERSISTENCIA...');
                const clientNoPersist = createClient(supabaseUrl, supabaseAnonKey, {
                    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
                });
                const npStart = Date.now();
                const timeoutPromiseNP = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT NP: > 5s')), 5000)
                );
                const queryPromiseNP = clientNoPersist.from('teams').select('id', { count: 'exact', head: true });
                const { count: countNP, error: errorNP } = await Promise.race([queryPromiseNP, timeoutPromiseNP]);

                if (errorNP) throw errorNP;
                addLog(`EXITO SIN PERSISTENCIA: ${Date.now() - npStart}ms. Count: ${countNP}`);

            } catch (npErr) {
                addLog(`FAIL NO-PERSIST: ${npErr.message}`);
            }
        };

        runTest();
    }, []);

    return (
        <div style={{ padding: 20, fontFamily: 'monospace', background: '#1e1e1e', color: '#fff', minHeight: '100vh' }}>
            <h1>Prueba de Diagnóstico Supabase</h1>
            <h2 style={{ color: status === 'CONEXIÓN OK' ? '#4ade80' : '#f87171' }}>Estado: {status}</h2>
            <hr style={{ borderColor: '#333' }} />
            <div style={{ marginTop: 20 }}>
                {logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: 5 }}>{log}</div>
                ))}
            </div>
            <button
                onClick={() => window.location.reload()}
                style={{ marginTop: 20, padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}
            >
                Reintentar
            </button>
        </div>
    );
};

export default ConnectionTest;

```

## File: src\context\AuthContext.jsx
```javascript
import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../supabaseClient'; // USE SHARED CLIENT

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (sessionUser) => {
        if (!sessionUser) return null;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
            }

            return {
                ...sessionUser,
                ...data,
                name: data?.full_name || sessionUser.email,
                role: data?.role || 'player'
            };
        } catch (error) {
            console.error('Profile fetch error:', error);
            return sessionUser;
        }
    };

    React.useEffect(() => {
        // Check active session
        const getSession = async () => {
            console.log('Auth: Checking session...');
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) console.error('Auth: Session error', error);

                if (session?.user) {
                    console.log('Auth: Session found', session.user.email);
                    const userWithProfile = await fetchProfile(session.user);
                    setUser(userWithProfile);
                } else {
                    console.log('Auth: No session found');
                }
            } catch (err) {
                console.error('Auth: Unexpected error checking session', err);
            } finally {
                console.log('Auth: Loading complete');
                setLoading(false);
            }
        };

        getSession();

        // Safety timeout
        const timeout = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.warn('Auth: Force loading complete due to timeout');
                    return false;
                }
                return prev;
            });
        }, 3000);

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const userWithProfile = await fetchProfile(session.user);
                setUser(userWithProfile);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    const login = async (email, password) => {
        console.log('Auth: Attempting login for', email);

        // Timeout promise
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => {
                console.error('Auth: Login timed out after 30s');
                reject(new Error('Tiempo de espera agotado. Verifica tu conexión.'));
            }, 30000)
        );

        const loginPromise = supabase.auth.signInWithPassword({
            email,
            password,
        });

        const { data, error } = await Promise.race([loginPromise, timeoutPromise]);

        if (error) throw error;
        return data;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const value = {
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

```

## File: src\context\DataContext.jsx
```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGame } from './GameContext';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';

const DataContext = createContext();

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

const generateSlots = (sport, category) => {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    let hours = [];

    if (sport === 'padel') {
        hours = ['09:00', '10:30', '12:00', '16:00', '17:30', '19:00', '20:30', '22:00'];
    } else if (sport === 'tennis') {
        if (category === 'adults') {
            hours = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
        } else {
            hours = ['16:00', '17:00', '18:00', '19:00', '20:00'];
        }
    }

    let slots = [];
    days.forEach(day => {
        hours.forEach(hour => {
            const id = `${day.substring(0, 3).toLowerCase()}_${hour}`;
            slots.push({ id, day, hour, label: `${day} ${hour}` });
        });
    });
    return slots;
};

export const DataProvider = ({ children }) => {
    const { sport, tennisCategory } = useGame();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    const [teams, setTeams] = useState([]);
    const [matches, setMatches] = useState([]);
    const [courts, setCourts] = useState({});

    // Helper to get the "Reset Time" from local storage
    const getResetTime = () => localStorage.getItem('demo_data_reset_time');

    useEffect(() => {
        if (!sport) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                console.log('DEBUG: Fetching data for:', { sport, tennisCategory });
                const resetTime = getResetTime();

                // 1. Fetch Teams
                let teamsQuery = supabase
                    .from('teams')
                    .select(`*, availability (day, hour)`)
                    .eq('sport', sport);

                if (sport === 'tennis') {
                    teamsQuery = teamsQuery.eq('category', tennisCategory);
                }

                // FILTER: Only show data created AFTER the last reset
                if (resetTime) {
                    teamsQuery = teamsQuery.gt('created_at', resetTime);
                }

                const { data: teamsData, error: teamsError } = await teamsQuery;
                if (teamsError) throw teamsError;

                const processedTeams = teamsData.map(t => ({
                    ...t,
                    group: t.group_name,
                    availability: Array.isArray(t.availability)
                        ? t.availability.map(a => `${a.day.substring(0, 3).toLowerCase()}_${a.hour}`)
                        : []
                }));
                setTeams(processedTeams);

                // 2. Fetch Matches
                let matchesQuery = supabase
                    .from('matches')
                    .select(`*, t1:team1_id (id, name), t2:team2_id (id, name)`)
                    .eq('sport', sport);

                if (sport === 'tennis') {
                    matchesQuery = matchesQuery.eq('category', tennisCategory);
                }

                if (resetTime) {
                    matchesQuery = matchesQuery.gt('created_at', resetTime);
                }

                const { data: matchesData, error: matchesError } = await matchesQuery;
                if (matchesError) throw matchesError;

                const processedMatches = matchesData.map(m => ({
                    ...m,
                    slot: m.slot_id,
                    t1: m.t1,
                    t2: m.t2
                }));
                setMatches(processedMatches);

                // 3. Fetch Courts
                let courtsQuery = supabase
                    .from('court_availability')
                    .select('*')
                    .eq('sport', sport);

                if (sport === 'tennis') {
                    courtsQuery = courtsQuery.eq('category', tennisCategory);
                }

                const { data: courtsData, error: courtsError } = await courtsQuery;
                if (courtsError) throw courtsError;

                const courtsMap = {};
                courtsData.forEach(c => {
                    courtsMap[c.slot_id] = c.available_count;
                });
                setCourts(courtsMap);

            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [sport, tennisCategory]);

    // --- Actions ---

    const updateTeamAvailability = async (teamId, availabilitySlotIds) => {
        try {
            await supabase.from('availability').delete().eq('team_id', teamId);
            const slots = currentSlots.filter(s => availabilitySlotIds.includes(s.id));
            const inserts = slots.map(s => ({
                team_id: teamId,
                day: s.day,
                hour: s.hour
            }));
            if (inserts.length > 0) {
                await supabase.from('availability').insert(inserts);
            }
            setTeams(prev => prev.map(t => t.id === teamId ? { ...t, availability: availabilitySlotIds } : t));
        } catch (error) {
            console.error('Error updating availability:', error);
        }
    };

    const updateCourtCount = async (slotId, count) => {
        try {
            const { error } = await supabase
                .from('court_availability')
                .upsert({
                    sport,
                    category: sport === 'tennis' ? tennisCategory : null,
                    slot_id: slotId,
                    available_count: count
                }, { onConflict: 'sport, category, slot_id' });
            if (error) throw error;
            setCourts(prev => ({ ...prev, [slotId]: count }));
        } catch (error) {
            console.error('Error updating court count:', error);
        }
    };

    const saveMatchResult = async (matchId, score, winnerId) => {
        try {
            // 1. Update Match
            const { error: matchError } = await supabase
                .from('matches')
                .update({ completed: true, score, winner_id: winnerId, played: true })
                .eq('id', matchId)
                .select(); // Select to ensure we have the latest state if needed

            if (matchError) throw matchError;

            // 2. Calculate Points (Win=3, Loss=1)
            const match = matches.find(m => m.id === matchId);
            if (!match) return; // Should not happen

            const winner = match.t1.id === winnerId ? match.t1 : match.t2;
            const loser = match.t1.id === winnerId ? match.t2 : match.t1;

            // Update Winner
            const { error: winnerError } = await supabase.rpc('increment_points', {
                row_id: winner.id,
                points_to_add: 3,
                matches_to_add: 1
            });

            // Update Loser
            const { error: loserError } = await supabase.rpc('increment_points', {
                row_id: loser.id,
                points_to_add: 1,
                matches_to_add: 1
            });

            // Fallback if RPC fails or doesn't exist (Manual update - less safe for concurrency but works for demo)
            if (winnerError || loserError) {
                console.warn("RPC 'increment_points' failed, falling back to manual update", winnerError || loserError);

                // Fetch current stats
                const { data: teamsData } = await supabase.from('teams').select('id, points, matches_played').in('id', [winner.id, loser.id]);
                const winnerTeam = teamsData.find(t => t.id === winner.id);
                const loserTeam = teamsData.find(t => t.id === loser.id);

                if (winnerTeam) {
                    await supabase.from('teams').update({ points: winnerTeam.points + 3, matches_played: winnerTeam.matches_played + 1 }).eq('id', winner.id);
                }
                if (loserTeam) {
                    await supabase.from('teams').update({ points: loserTeam.points + 1, matches_played: loserTeam.matches_played + 1 }).eq('id', loser.id);
                }
            }

            // 3. Update Local State
            setMatches(prev => prev.map(m => m.id === matchId ? { ...m, completed: true, score, winner_id: winnerId } : m));
            setTeams(prev => prev.map(t => {
                if (t.id === winner.id) return { ...t, points: t.points + 3, matches_played: t.matches_played + 1 };
                if (t.id === loser.id) return { ...t, points: t.points + 1, matches_played: t.matches_played + 1 };
                return t;
            }));

        } catch (error) {
            console.error('Error saving result:', error);
            alert('Error al guardar resultado: ' + error.message);
        }
    };

    const postponeMatch = async (matchId) => {
        try {
            const { error } = await supabase
                .from('matches')
                .update({ postponed: true })
                .eq('id', matchId);

            if (error) throw error;

            setMatches(prev => prev.map(m => m.id === matchId ? { ...m, postponed: true } : m));
        } catch (error) {
            console.error('Error postponing match:', error);
            alert('Error al aplazar partido: ' + error.message);
        }
    };

    const registerWalkover = async (matchId, winnerId) => {
        try {
            // 1. Update Match
            const { error: matchError } = await supabase
                .from('matches')
                .update({ completed: true, score: 'W.O.', winner_id: winnerId, played: true })
                .eq('id', matchId)
                .select();

            if (matchError) throw matchError;

            // 2. Calculate Points (Win=3, Loss=0 for WO)
            const match = matches.find(m => m.id === matchId);
            if (!match) return;

            const winner = match.t1.id === winnerId ? match.t1 : match.t2;
            // Loser gets 0 points in WO, so we only update the winner

            // Update Winner
            const { error: winnerError } = await supabase.rpc('increment_points', {
                row_id: winner.id,
                points_to_add: 3,
                matches_to_add: 1
            });

            // Fallback
            if (winnerError) {
                console.warn("RPC failed", winnerError);
                const { data: teamsData } = await supabase.from('teams').select('id, points, matches_played').eq('id', winner.id).single();
                if (teamsData) {
                    await supabase.from('teams').update({ points: teamsData.points + 3, matches_played: teamsData.matches_played + 1 }).eq('id', winner.id);
                }
            }

            // 3. Update Local State
            setMatches(prev => prev.map(m => m.id === matchId ? { ...m, completed: true, score: 'W.O.', winner_id: winnerId } : m));
            setTeams(prev => prev.map(t => {
                if (t.id === winner.id) return { ...t, points: t.points + 3, matches_played: t.matches_played + 1 };
                return t;
            }));

        } catch (error) {
            console.error('Error registering WO:', error);
            alert('Error al registrar W.O.: ' + error.message);
        }
    };

    const createSchedule = async (newMatches) => {
        try {
            const dbMatches = newMatches.map(m => ({
                team1_id: m.t1.id,
                team2_id: m.t2.id,
                sport,
                category: sport === 'tennis' ? tennisCategory : null,
                slot_id: m.slot,
                played: false,
                postponed: false
            }));
            const { data, error } = await supabase.from('matches').insert(dbMatches).select();
            if (error) throw error;
            const processedNewMatches = data.map((m, i) => ({
                ...m,
                slot: m.slot_id,
                t1: newMatches[i].t1,
                t2: newMatches[i].t2
            }));
            setMatches(prev => [...prev, ...processedNewMatches]);
        } catch (error) {
            console.error('Error creating schedule:', error);
        }
    };

    // --- Helper Functions for Random Data ---
    const shuffleArray = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const getRandomSlots = (sport, category, count) => {
        const allSlots = generateSlots(sport, category);
        const shuffled = shuffleArray(allSlots);
        return shuffled.slice(0, count);
    };

    const generateDemoData = async () => {
        if (!confirm('ATENCIÓN: Se ocultarán los datos antiguos y se generarán nuevos. ¿Continuar?')) return;

        alert('PASO 1: Preparando "Borrón y Cuenta Nueva"...');
        try {
            setLoading(true);
            if (!user) {
                alert('ERROR: No hay sesión activa. Recarga la página.');
                return;
            }

            // SOFT RESET: Set a timestamp to filter out old data
            const now = new Date();
            // Subtract a few seconds to be safe
            now.setSeconds(now.getSeconds() - 1);
            const resetTime = now.toISOString();
            localStorage.setItem('demo_data_reset_time', resetTime);

            alert(`PASO 2: Generando jugadores...`);

            // --- EXPANDED DATA POOLS ---
            const tennisNames = [
                "Djokovic", "Nadal", "Federer", "Alcaraz", "Sinner", "Medvedev", "Zverev", "Rublev", "Tsitsipas", "Ruud",
                "Dimitrov", "Hurkacz", "Fritz", "Shelton", "Rune", "Paul", "Tiafoe", "Khachanov", "Bublik", "Baez",
                "Mannarino", "Griekspoor", "Korda", "Etcheverry", "Cerundolo", "Jarry", "Musetti", "Auger-Aliassime", "Norrie", "Evans",
                "Swiatek", "Sabalenka", "Gauff", "Rybakina", "Pegula", "Jabeur", "Zheng", "Vondrousova", "Sakkari", "Muchova",
                "Ostapenko", "Krejcikova", "Kasatkina", "Samsonova", "Kudermetova", "Keys", "Kvitova", "Bencic", "Azarenka", "Haddad Maia",
                "Garcia", "Alexandrova", "Vekic", "Cirstea", "Potapova", "Kalinina", "Mertens", "Paolini", "Zhu", "Wang",
                "Murray", "Wawrinka", "Ferrer", "Berdych", "Tsonga", "Nishikori", "Raonic", "Cilic", "Thiem", "Monfils",
                "Agassi", "Sampras", "McEnroe", "Borg", "Lendl", "Connors", "Wilander", "Edberg", "Becker", "Courier",
                "Graf", "Navratilova", "Evert", "Seles", "Hingis", "Davenport", "Capriati", "Henin", "Clijsters", "Mauresmo",
                "Sharapova", "Williams", "Halep", "Muguruza", "Badosa", "Pliskova", "Kerber", "Osaka", "Andreescu", "Kenin",
                "Stephens", "Svitolina", "Wozniacki", "Konta", "Barty", "Pierce", "Sabatini", "Sanchez Vicario", "Martinez"
            ];

            const padelNames = [
                "Galán", "Lebrón", "Coello", "Tapia", "Di Nenno", "Stupaczuk", "Chingotto", "Navarro", "Tello", "Ruiz",
                "González", "Garrido", "Yanguas", "Nieto", "Sanz", "Campagnolo", "Belasteguín", "Lima", "Sanyo", "Moyano",
                "Gil", "Rico", "Augsburger", "Libaak", "Lamperti", "Díaz", "Silingo", "Belluati", "Leal", "Zapata",
                "Sans", "García", "Barahona", "Esbri", "Alonso", "Arroyo", "Capra", "Sánchez", "Semmler", "Lijó",
                "Rubio", "Benítez", "Del Castillo", "Vilariño", "Muñoz", "Ramírez", "Méndez", "Oria", "Guerrero", "Ayats",
                "Perino", "Bergamini", "Ruiz", "Osoro", "Iglesias", "Triay", "Salazar", "Sánchez", "Josemaría", "Ortega",
                "González", "Brea", "Araújo", "Riera", "Icardo", "Castelló", "Jensen", "Virseda", "Sainz", "Llaguno",
                "Marrero", "Amatriaín", "Reiter", "Nogueira", "Talaván", "Rufo", "Goenaga", "Caldera", "Saiz", "Martínez",
                "Mesa", "Guinart", "Rodríguez", "Barrera", "Caparrós", "Fassio", "Borrero", "Sharifova", "Orsi", "Lobo",
                "Bellver", "Soriano", "Martínez", "Fernández", "Collombon", "Godallier", "Piltcher", "Sussarello", "Stellato",
                "Cepero", "Mieres", "Jardim", "Lahoz", "Reca", "Nerone", "Gutiérrez", "Poggi", "Grabiel", "Santana",
                "Botello", "Ruiz", "Moreno", "Rubio", "Gutiérrez", "Marina", "Ramos", "Restivo", "Britos", "Rivera"
            ];

            const demoTeams = [];

            // 1. Tennis Adults: 32 players (4 groups x 8)
            const shuffledTennis = shuffleArray(tennisNames);
            let tennisIndex = 0;
            const adultGroups = ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Grupo 4'];

            adultGroups.forEach(group => {
                for (let i = 0; i < 8; i++) {
                    if (tennisIndex < shuffledTennis.length) {
                        demoTeams.push({
                            name: shuffledTennis[tennisIndex++],
                            sport: 'tennis',
                            category: 'adults',
                            points: 0,
                            matches_played: 0,
                            group_name: group
                        });
                    }
                }
            });

            // 2. Tennis Juveniles: 24 players (4 groups x 6)
            const juvGroups = ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Grupo 4'];

            juvGroups.forEach(group => {
                for (let i = 0; i < 6; i++) {
                    if (tennisIndex < shuffledTennis.length) {
                        demoTeams.push({
                            name: shuffledTennis[tennisIndex++],
                            sport: 'tennis',
                            category: 'juveniles',
                            points: 0,
                            matches_played: 0,
                            group_name: group
                        });
                    }
                }
            });

            // 3. Padel: 50 pairs (5 groups x 10)
            const shuffledPadel = shuffleArray(padelNames);
            let padelIndex = 0;
            const padelGroups = ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Grupo 4', 'Grupo 5'];

            padelGroups.forEach(group => {
                for (let i = 0; i < 10; i++) {
                    let p1 = "Jugador1";
                    let p2 = "Jugador2";

                    if (padelIndex < shuffledPadel.length) p1 = shuffledPadel[padelIndex++];
                    else p1 = `Pro${padelIndex++}`;

                    if (padelIndex < shuffledPadel.length) p2 = shuffledPadel[padelIndex++];
                    else p2 = `Pro${padelIndex++}`;

                    demoTeams.push({
                        name: `${p1} / ${p2}`,
                        sport: 'padel',
                        points: 0,
                        matches_played: 0,
                        group_name: group
                    });
                }
            });

            // --- BATCH INSERTS & CAPTURE IDs ---
            const chunkSize = 50;
            let allInsertedTeams = [];

            for (let i = 0; i < demoTeams.length; i += chunkSize) {
                const chunk = demoTeams.slice(i, i + chunkSize);
                const { data, error } = await supabase.from('teams').insert(chunk).select();
                if (error) throw error;
                allInsertedTeams = [...allInsertedTeams, ...data];
            }

            // --- GENERATE AVAILABILITY USING REAL IDs ---
            const availabilityInserts = [];

            allInsertedTeams.forEach(team => {
                // Get VALID slots for this specific team's sport/category
                const validSlots = getRandomSlots(team.sport, team.category, 4);

                validSlots.forEach(slot => {
                    availabilityInserts.push({
                        team_id: team.id, // Use the REAL BigInt ID from DB
                        day: slot.day,
                        hour: slot.hour
                    });
                });
            });

            // Insert Availability in chunks
            for (let i = 0; i < availabilityInserts.length; i += chunkSize) {
                const chunk = availabilityInserts.slice(i, i + chunkSize);
                const { error } = await supabase.from('availability').insert(chunk);
                if (error) throw error;
            }

            alert(`¡ÉXITO! Se han generado ${allInsertedTeams.length} equipos nuevos y se han ocultado los antiguos.`);

            // Refresh data
            let refreshQuery = supabase
                .from('teams')
                .select(`*, availability (day, hour)`)
                .eq('sport', sport);

            if (sport === 'tennis') {
                refreshQuery = refreshQuery.eq('category', tennisCategory);
            }

            // Apply filter to refresh query too
            refreshQuery = refreshQuery.gt('created_at', resetTime);

            const { data: teamsData, error: fetchError } = await refreshQuery;
            if (fetchError) throw fetchError;

            const processedTeams = teamsData.map(t => ({
                ...t,
                group: t.group_name,
                availability: Array.isArray(t.availability)
                    ? t.availability.map(a => `${a.day.substring(0, 3).toLowerCase()}_${a.hour}`)
                    : []
            }));
            setTeams(processedTeams);

        } catch (error) {
            console.error('Error generating demo data:', error);
            alert('ERROR: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const importPlayers = async (playersData) => {
        try {
            setLoading(true);
            const teamsToInsert = playersData.map(p => ({
                name: p.name,
                group_name: p.group || 'General',
                sport: sport,
                category: sport === 'tennis' ? tennisCategory : null,
                points: 0,
                matches_played: 0
            }));

            // 1. Insert Teams
            const { data: insertedTeams, error: insertError } = await supabase
                .from('teams')
                .insert(teamsToInsert)
                .select();

            if (insertError) throw insertError;

            // 2. Process Availability
            const availabilityInserts = [];

            // Helper to map "Lunes 10:00" to "lun_10:00"
            const dayMap = { 'lunes': 'lun', 'martes': 'mar', 'miércoles': 'mié', 'miercoles': 'mié', 'jueves': 'jue', 'viernes': 'vie', 'sábado': 'sáb', 'sabado': 'sáb', 'domingo': 'dom' };

            insertedTeams.forEach((team, index) => {
                const rawAvailability = playersData[index].availability; // "Lunes 10:00, Martes 12:00"
                if (rawAvailability) {
                    const slots = rawAvailability.split(',').map(s => s.trim());
                    slots.forEach(slotStr => {
                        // Expected format: "Day Hour" (e.g. "Lunes 10:00")
                        const parts = slotStr.split(' ');
                        if (parts.length >= 2) {
                            const dayName = parts[0].toLowerCase();
                            const hour = parts[1];
                            const shortDay = dayMap[dayName];

                            if (shortDay) {
                                availabilityInserts.push({
                                    team_id: team.id,
                                    day: parts[0], // Keep original case/spelling for display if needed, or normalize
                                    hour: hour
                                });
                            }
                        }
                    });
                }
            });

            if (availabilityInserts.length > 0) {
                const { error: availError } = await supabase.from('availability').insert(availabilityInserts);
                if (availError) console.warn("Error inserting availability:", availError);
            }

            // 3. Refresh Data
            // Re-fetch to update UI
            const resetTime = getResetTime();
            let refreshQuery = supabase.from('teams').select(`*, availability (day, hour)`).eq('sport', sport);
            if (sport === 'tennis') refreshQuery = refreshQuery.eq('category', tennisCategory);
            if (resetTime) refreshQuery = refreshQuery.gt('created_at', resetTime);

            const { data: teamsData, error: fetchError } = await refreshQuery;
            if (fetchError) throw fetchError;

            const processedTeams = teamsData.map(t => ({
                ...t,
                group: t.group_name,
                availability: Array.isArray(t.availability)
                    ? t.availability.map(a => `${a.day.substring(0, 3).toLowerCase()}_${a.hour}`)
                    : []
            }));
            setTeams(processedTeams);

            alert(`Importación completada: ${insertedTeams.length} jugadores añadidos.`);

        } catch (error) {
            console.error('Error importing players:', error);
            alert('Error al importar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const currentSlots = generateSlots(sport, tennisCategory);

    const updateData = (newData) => {
        if (newData.courts) {
            Object.entries(newData.courts).forEach(([id, count]) => updateCourtCount(id, count));
        }
    };

    const value = {
        data: { teams, matches, courts },
        updateData,
        updateTeamAvailability,
        updateCourtCount,
        saveMatchResult,
        postponeMatch,
        registerWalkover,
        importPlayers,
        createSchedule,
        generateDemoData,
        loading,
        currentSlots
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

```

## File: src\context\GameContext.jsx
```javascript
import React, { createContext, useContext, useState } from 'react';

const GameContext = createContext();

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};

export const GameProvider = ({ children }) => {
    const [sport, setSport] = useState(null); // 'padel' | 'tennis' | null (landing)
    const [role, setRole] = useState(null); // 'admin' | 'player' | null
    const [tennisCategory, setTennisCategory] = useState('adults'); // 'adults' | 'juveniles'

    // Helper to reset or switch modes
    const selectMode = (selectedSport, selectedRole) => {
        setSport(selectedSport);
        setRole(selectedRole);
    };

    const value = {
        sport,
        setSport,
        role,
        setRole,
        tennisCategory,
        setTennisCategory,
        selectMode
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
};

```

## File: src\index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## File: src\main.jsx
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary';
import './index.css'

console.log('Main: Starting app...');
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

```

## File: src\supabaseClient.js
```js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase credentials. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false
    }
});

```

## File: tailwind.config.js
```js
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    red: '#D32F2F',
                    yellow: '#FDD835',
                    dark: '#B71C1C',
                }
            }
        },
    },
    plugins: [],
}

```

## File: vite.config.js
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
})

```


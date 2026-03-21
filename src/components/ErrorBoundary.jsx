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

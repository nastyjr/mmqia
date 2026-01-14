import React, { useState, useEffect } from 'react';
import { documentMatchingEngine, DocumentMatch, MatchingSuggestion } from '../services/documentMatchingEngine';
import { FileText, Package, Receipt, Check, AlertTriangle, X, Link2, TrendingUp } from 'lucide-react';

export const DocumentMatchingView: React.FC = () => {
    const [matches, setMatches] = useState<DocumentMatch[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<DocumentMatch | null>(null);
    const [tab, setTab] = useState<'matches' | 'suggestions'>('matches');
    const [suggestions, setSuggestions] = useState<{ [key: string]: MatchingSuggestion[] }>({});

    useEffect(() => {
        loadMatches();
        loadSuggestions();
    }, []);

    const loadMatches = () => {
        const allMatches = documentMatchingEngine.getAllMatches();
        setMatches(allMatches.sort((a, b) =>
            new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime()
        ));
    };

    const loadSuggestions = async () => {
        // Load suggestions for recent unmatched documents
        const invoices = JSON.parse(localStorage.getItem('invoicing_db') || '[]');
        const newSuggestions: { [key: string]: MatchingSuggestion[] } = {};

        for (const invoice of invoices.slice(0, 10)) {
            const sug = await documentMatchingEngine.findMatches(invoice.id, 'INVOICE');
            if (sug.length > 0) {
                newSuggestions[invoice.id] = sug;
            }
        }

        setSuggestions(newSuggestions);
    };

    const getStatusBadge = (status: DocumentMatch['status']) => {
        const styles = {
            PERFECT: 'bg-green-100 text-green-800 border-green-200',
            PARTIAL: 'bg-blue-100 text-blue-800 border-blue-200',
            DISCREPANCY: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            NO_MATCH: 'bg-red-100 text-red-800 border-red-200'
        };

        const icons = {
            PERFECT: <Check size={14} />,
            PARTIAL: <TrendingUp size={14} />,
            DISCREPANCY: <AlertTriangle size={14} />,
            NO_MATCH: <X size={14} />
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
                {icons[status]}
                {status}
            </span>
        );
    };

    const getSeverityBadge = (severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
        const styles = {
            LOW: 'bg-gray-100 text-gray-700',
            MEDIUM: 'bg-yellow-100 text-yellow-700',
            HIGH: 'bg-orange-100 text-orange-700',
            CRITICAL: 'bg-red-100 text-red-700'
        };

        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[severity]}`}>
                {severity}
            </span>
        );
    };

    const acceptSuggestion = async (suggestion: MatchingSuggestion) => {
        // Auto-match based on suggestion
        const matches = await documentMatchingEngine.autoMatch(suggestion.documentId, suggestion.documentType);
        if (matches.length > 0) {
            alert(`✅ Match creado: Score ${matches[0].matchScore}%`);
            loadMatches();
            loadSuggestions();
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <Link2 className="text-blue-600" />
                        Document Matching
                    </h1>
                    <p className="text-gray-600 mt-1">Auto-matching: OC ↔ Recepción ↔ Factura</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="text-green-600 text-sm font-medium">Perfect Matches</div>
                    <div className="text-3xl font-bold text-green-700 mt-1">
                        {matches.filter(m => m.status === 'PERFECT').length}
                    </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p4">
                    <div className="text-blue-600 text-sm font-medium">Partial Matches</div>
                    <div className="text-3xl font-bold text-blue-700 mt-1">
                        {matches.filter(m => m.status === 'PARTIAL').length}
                    </div>
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                    <div className="text-yellow-600 text-sm font-medium">With Discrepancies</div>
                    <div className="text-3xl font-bold text-yellow-700 mt-1">
                        {matches.filter(m => m.status === 'DISCREPANCY').length}
                    </div>
                </div>

                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                    <div className="text-purple-600 text-sm font-medium">Pending Suggestions</div>
                    <div className="text-3xl font-bold text-purple-700 mt-1">
                        {Object.keys(suggestions).length}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b-2 border-gray-200 flex gap-4">
                <button
                    onClick={() => setTab('matches')}
                    className={`pb-3 px-4 font-medium transition-colors ${tab === 'matches'
                        ? 'text-blue-600 border-b-2 border-blue-600 -mb-0.5'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Matches ({matches.length})
                </button>
                <button
                    onClick={() => setTab('suggestions')}
                    className={`pb-3 px-4 font-medium transition-colors ${tab === 'suggestions'
                        ? 'text-blue-600 border-b-2 border-blue-600 -mb-0.5'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Suggestions ({Object.keys(suggestions).length})
                </button>
            </div>

            {/* Matches Tab */}
            {tab === 'matches' && (
                <div className="space-y-4">
                    {matches.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <Link2 size={48} className="text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">No hay matches aún</p>
                            <p className="text-sm text-gray-500">Los documentos se matchearán automáticamente</p>
                        </div>
                    ) : (
                        matches.map(match => (
                            <div
                                key={match.id}
                                className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => setSelectedMatch(match)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            {match.purchaseOrderId && <FileText className="text-blue-600" size={20} />}
                                            {match.goodsReceiptId && <Package className="text-green-600" size={20} />}
                                            {match.invoiceId && <Receipt className="text-purple-600" size={20} />}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-800">
                                                {match.type === '3-way' ? '3-Way Match' : '2-Way Match'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {new Date(match.matchedAt).toLocaleDateString('es-CL')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-right mr-2">
                                            <div className="text-2xl font-bold text-gray-700">{match.matchScore}%</div>
                                            <div className="text-xs text-gray-500">Score</div>
                                        </div>
                                        {getStatusBadge(match.status)}
                                    </div>
                                </div>

                                {match.discrepancies.length > 0 && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                        <div className="text-sm font-medium text-yellow-800 mb-2">
                                            {match.discrepancies.length} Discrepancia(s)
                                        </div>
                                        {match.discrepancies.slice(0, 2).map((disc, idx) => (
                                            <div key={idx} className="text-xs text-yellow-700 flex items-center gap-2 mt-1">
                                                {getSeverityBadge(disc.severity)}
                                                {disc.description}
                                            </div>
                                        ))}
                                        {match.discrepancies.length > 2 && (
                                            <div className="text-xs text-yellow-600 mt-1">
                                                +{match.discrepancies.length - 2} más...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Suggestions Tab */}
            {tab === 'suggestions' && (
                <div className="space-y-4">
                    {Object.keys(suggestions).length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <TrendingUp size={48} className="text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">No hay sugerencias</p>
                            <p className="text-sm text-gray-500">El sistema buscará matches automáticamente</p>
                        </div>
                    ) : (
                        Object.entries(suggestions).map(([docId, docSuggestions]) => (
                            <div key={docId} className="bg-white border-2 border-gray-200 rounded-lg p-4">
                                <div className="font-semibold text-gray-800 mb-3">
                                    Documento: {docId.substring(0, 8)}...
                                </div>
                                <div className="space-y-2">
                                    {Array.isArray(docSuggestions) && docSuggestions.map((sug, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-gray-700">
                                                        Match con {sug.candidateType}: {sug.candidateId.substring(0, 8)}...
                                                    </span>
                                                    <span className="text-sm font-bold text-blue-600">{sug.score}%</span>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {sug.reasons.join(' • ')}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => acceptSuggestion(sug)}
                                                className="ml-4 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                                                disabled={sug.score < 70}
                                            >
                                                {sug.score >= 70 ? 'Aceptar' : 'Score bajo'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Match Details Modal */}
            {selectedMatch && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold">Match Details</h2>
                                <button onClick={() => setSelectedMatch(null)} className="text-gray-500 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    {getStatusBadge(selectedMatch.status)}
                                    <div className="text-3xl font-bold text-gray-700">{selectedMatch.matchScore}%</div>
                                </div>

                                {selectedMatch.discrepancies.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-gray-800 mb-2">Discrepancias</h3>
                                        <div className="space-y-2">
                                            {selectedMatch.discrepancies.map((disc, idx) => (
                                                <div key={idx} className="border rounded p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-gray-700">{disc.type}</span>
                                                        {getSeverityBadge(disc.severity)}
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-2">{disc.description}</p>
                                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                                        <div>
                                                            <span className="text-gray-500">Esperado:</span>
                                                            <span className="ml-2 font-mono">{JSON.stringify(disc.expected)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">Actual:</span>
                                                            <span className="ml-2 font-mono">{JSON.stringify(disc.actual)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    <div className="text-sm text-gray-500">
                                        Matched: {new Date(selectedMatch.matchedAt).toLocaleString('es-CL')}
                                        {' '} by {selectedMatch.matchedBy}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

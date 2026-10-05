/**
 * Chrome Extension Integration & API Contract Inspector
 * 
 * Demonstrates and verifies the future Chrome Extension contract:
 * - Live Teacher API Token
 * - Live structured JSON DTO payload that the extension will fetch
 * - Automation Status Simulator (Not Started -> In Progress -> Completed)
 * - Complete documentation of the endpoint architecture
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { api } from '../services/api.js';
import { ExtensionLessonRecordDTO } from '../types/index.js';
import {
  Key,
  Copy,
  Check,
  Play,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code,
  Layers,
  Sparkles,
} from 'lucide-react';

export const ExtensionApiView: React.FC = () => {
  const { currentUser, selectedRecord, copyToSystemClipboard, showToast } = useApp();
  const [dto, setDto] = useState<ExtensionLessonRecordDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simStatus, setSimStatus] = useState<string>('idle');

  useEffect(() => {
    if (selectedRecord) {
      setLoading(true);
      api.getExtensionRecordDTO(selectedRecord.id)
        .then(setDto)
        .catch(err => console.error('Failed to load extension DTO:', err))
        .finally(() => setLoading(false));
    } else {
      setDto(null);
    }
  }, [selectedRecord]);

  const handleSimulateAutomation = async () => {
    if (!selectedRecord) return;
    setSimulating(true);
    setSimStatus('in_progress');
    showToast('Simulation: Chrome Extension started filling school website form...', 'info');

    try {
      await api.updateExtensionStatus(selectedRecord.id, 'in_progress');
      // Simulate field filling delay
      await new Promise(r => setTimeout(r, 1200));

      setSimStatus('completed');
      await api.updateExtensionStatus(selectedRecord.id, 'completed');
      showToast('Simulation: Extension filled all fields and blocks! Ready for teacher review.', 'success');
    } catch (err: any) {
      setSimStatus('failed');
      await api.updateExtensionStatus(selectedRecord.id, 'failed', err.message);
      showToast('Simulation error: ' + err.message, 'error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs">
        <div className="flex items-center space-x-2">
          <Key className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">
            Chrome Extension Data Contract & API Inspector
          </h2>
        </div>
        <p className="text-xs text-gray-500 mt-1 max-w-3xl">
          The future Chrome Extension connects to this backend to read structured lesson plan data
          and automatically fill the existing school website.
        </p>

        {/* API Authentication Token Card */}
        <div className="mt-4 bg-amber-50/60 border border-amber-200 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-2xs font-bold text-amber-800 uppercase tracking-wider block">
              Teacher API Token (Chrome Extension Auth)
            </span>
            <code className="text-xs font-mono text-amber-950 font-bold break-all">
              {currentUser?.apiToken || 'lf_tok_sarah_7f8a9b2c3d4e5f6'}
            </code>
          </div>

          <button
            type="button"
            onClick={() =>
              copyToSystemClipboard(currentUser?.apiToken || '', 'Chrome Extension API Token')
            }
            className="inline-flex items-center px-3 py-1.5 bg-white border border-amber-300 text-xs font-semibold text-amber-900 rounded shadow-2xs hover:bg-amber-100 shrink-0"
          >
            <Copy className="w-3.5 h-3.5 mr-1 text-amber-700" />
            Copy Token
          </button>
        </div>
      </div>

      {/* Live Extension Payload Inspector & Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Extension Workflow & Live Simulator */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Play className="w-4 h-4 text-indigo-600" />
              <span>Future Extension Workflow</span>
            </h3>

            <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside leading-relaxed bg-gray-50 p-3 rounded border border-gray-200">
              <li>Teacher navigates to school lesson-plan website.</li>
              <li>Chrome extension opens in side panel.</li>
              <li>Extension calls <code className="text-indigo-600 font-mono">GET /api/extension/records/:id</code> with Bearer token.</li>
              <li>Extension automatically selects Class, Section, and Day.</li>
              <li>Extension fills Target & Activities clean text.</li>
              <li>Extension clicks &quot;Add Block&quot; on the school website for each block.</li>
              <li>Extension fills each block&apos;s configured fields.</li>
              <li>Extension leaves form open for teacher review before manual submission!</li>
            </ol>

            {/* Test Simulation Button */}
            <div className="pt-2 border-t border-gray-100">
              <span className="text-2xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                Simulate Chrome Extension Entry:
              </span>
              <button
                type="button"
                onClick={handleSimulateAutomation}
                disabled={simulating || !selectedRecord}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-md shadow-xs transition-colors"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                {simulating ? 'Simulating School Website Entry...' : 'Test Run Extension Automation'}
              </button>

              {simStatus === 'completed' && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center space-x-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Success: Automated block entry simulated. Record marked completed!</span>
                </div>
              )}
            </div>
          </div>

          {/* Endpoints Reference */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs space-y-2.5 text-xs">
            <h4 className="font-bold text-gray-800 uppercase tracking-wider">
              Documented Extension API Endpoints
            </h4>
            <div className="space-y-1.5 font-mono text-2xs">
              <div className="p-1.5 bg-gray-50 rounded border border-gray-200">
                <span className="text-emerald-700 font-bold">GET</span> /api/extension/records/:id
              </div>
              <div className="p-1.5 bg-gray-50 rounded border border-gray-200">
                <span className="text-sky-700 font-bold">PATCH</span> /api/extension/records/:id/status
              </div>
              <div className="p-1.5 bg-gray-50 rounded border border-gray-200">
                <span className="text-emerald-700 font-bold">GET</span> /api/weeks/:weekId/lesson-records
              </div>
              <div className="p-1.5 bg-gray-50 rounded border border-gray-200">
                <span className="text-emerald-700 font-bold">GET</span> /api/clipboard
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live JSON Payload for Selected Record */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-gray-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-gray-800">
                  Live JSON DTO (Active Record: {selectedRecord?.day || ''} {selectedRecord?.className || ''})
                </span>
              </div>
              {dto && (
                <button
                  type="button"
                  onClick={() =>
                    copyToSystemClipboard(JSON.stringify(dto, null, 2), 'Extension JSON Payload')
                  }
                  className="inline-flex items-center text-2xs font-semibold text-indigo-700 bg-white border border-gray-300 hover:bg-gray-50 px-2 py-1 rounded"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy JSON
                </button>
              )}
            </div>

            <div className="p-4">
              {loading ? (
                <div className="text-center py-10 text-xs text-gray-500">
                  Loading structured contract payload...
                </div>
              ) : dto ? (
                <pre className="bg-gray-900 text-gray-100 p-3.5 rounded-md text-2xs font-mono overflow-x-auto max-h-[500px]">
                  {JSON.stringify(dto, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-10 text-xs text-gray-500">
                  Select a lesson record in Workspace to preview its extension payload.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

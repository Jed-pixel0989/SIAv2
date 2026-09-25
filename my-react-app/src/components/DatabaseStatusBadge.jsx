import React, { useState } from 'react'

export default function DatabaseStatusBadge({ dbStatus, onSync, isSyncing }) {
  const [showDetails, setShowDetails] = useState(false)

  const isConnected = dbStatus?.connected === true
  const isLocalMode = dbStatus?.mode === 'local' || !dbStatus

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm border ${
          isConnected
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400'
            : isLocalMode
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50 hover:border-amber-400'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/50 hover:border-rose-400'
        }`}
        title="Click to view database details"
      >
        <span className="relative flex h-2 w-2">
          {isConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isConnected ? 'bg-emerald-400' : isLocalMode ? 'bg-amber-400' : 'bg-rose-500'
            }`}
          ></span>
        </span>
        <span className="font-semibold">
          {isConnected ? 'MySQL Connected' : isLocalMode ? 'Local Mode' : 'DB Offline'}
        </span>
        <span className="text-[10px] opacity-75 border-l border-white/10 pl-2">
          {isConnected ? (dbStatus.database || 'waterline_db') : isLocalMode ? 'Browser Storage' : 'Retry'}
        </span>
      </button>

      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-xs text-slate-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold flex items-center gap-1.5 text-slate-100">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              Database Status
            </span>
            <button
              onClick={() => setShowDetails(false)}
              className="text-slate-400 hover:text-white text-base leading-none"
            >
              ×
            </button>
          </div>

          <div className="py-2 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Database:</span>
              <span className="font-mono font-medium text-emerald-400">
                {dbStatus?.database || 'waterline_db'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Host:</span>
              <span className="font-mono text-slate-300">
                {dbStatus?.host || '127.0.0.1:3306'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RDBMS Engine:</span>
              <span className="text-slate-300 font-mono">
                {dbStatus?.server_version || 'MySQL / MariaDB'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Backend API:</span>
              <span className="text-emerald-400">Apache 2.4 + PHP 8.2</span>
            </div>

            {dbStatus?.table_counts && (
              <div className="mt-2 pt-2 border-t border-slate-800">
                <span className="text-slate-400 font-semibold block mb-1">
                  Active Tables & Records:
                </span>
                <div className="grid grid-cols-2 gap-1 font-mono text-[10px] max-h-28 overflow-y-auto pr-1">
                  {Object.entries(dbStatus.table_counts).map(([tbl, count]) => (
                    <div
                      key={tbl}
                      className="flex justify-between bg-slate-800/60 px-1.5 py-0.5 rounded"
                    >
                      <span className="text-slate-400 truncate" title={tbl}>
                        {tbl}
                      </span>
                      <span className="text-amber-300 font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              Synced: {dbStatus?.timestamp ? new Date(dbStatus.timestamp).toLocaleTimeString() : 'Just now'}
            </span>
            <button
              onClick={() => {
                onSync && onSync()
              }}
              disabled={isSyncing}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-[11px] font-medium transition"
            >
              {isSyncing ? 'Syncing...' : 'Sync DB'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

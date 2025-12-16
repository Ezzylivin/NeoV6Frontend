  const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 transition-colors";

  return (
    <div className="backtest-container">
      {/* Header */}
      <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <h1 className="header mb-0" style={{marginBottom:0, fontSize:'2rem'}}>Strategy Backtester</h1>
                <p className="text-neutral-400 text-sm">Advanced Performance Testing Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-black/50 rounded-xl border border-white/10">
                <span className="text-neutral-400 text-sm">API Connected</span>
                <span className="ml-2 w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
              </div>
            </div>
          </div>
      </div>

      <div className="container mx-auto">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column - Configuration (5/12 width) */}
          <div className="col-span-12 lg:col-span-5">
            {/* 🚀 FIXED: Replaced bg-slate with bot-card */}
            <div className="bot-card sticky top-6">
              {/* ... (Existing Config UI Code) ... */}
              <div className="panel-header flex items-center gap-3">
                <span className="text-emerald-400 text-lg">⚙️</span>
                <h2 className="card-title">Configuration</h2>
              </div>
              
              {/* 🚀 FIXED: Emerald Strategy Loader */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-emerald-400 flex items-center gap-2 font-semibold text-sm">
                    🏆 Load Alpha Strategy
                  </label>
                  <button 
                    onClick={fetchWinners} 
                    disabled={scanningWinners}
                    className="text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                  >
                    {scanningWinners ? '...' : '🔄'}
                  </button>
                </div>
                <select 
                  value={selectedWinnerId} 
                  onChange={handleWinnerSelect}
                  className={inputClass}
                >
                  <option value="">-- Select Golden Strategy --</option>
                  {liveWinners.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              {/* 🚀 FIXED: Neural/Black Tabs */}
              <div className="tabs">
                <button 
                  className={activeTab === 'single' ? 'active' : ''}
                  onClick={() => setActiveTab('single')}
                >
                  Single Strategy
                </button>
                <button 
                  className={activeTab === 'combo' ? 'active' : ''}
                  onClick={() => setActiveTab('combo')}
                >
                  Combo Strategy
                </button>
              </div>

              <form onSubmit={(e) => handleRun(e, activeTab === 'combo')}>
                {activeTab === 'single' ? (
                  <>
                    <div className="form-grid mb-6">
                      <div className="setup-selector">
                        <label className="text-neutral-400">⚡ Strategy Type</label>
                        <select 
                            name="strategyId" 
                            value={formData.strategyId} 
                            onChange={(e) => handleFormChange(e, setFormData)}
                            className={inputClass}
                        >
                            <option value="">-- Select TA Strategy --</option>
                            {strategyOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <CommonBacktestInputs data={formData} onChange={(e) => handleFormChange(e, setFormData)} options={{ symbolOptions, timeframeOptions, modelOptions }} />
                  </>
                ) : (
                  <>
                    <CommonBacktestInputs data={comboData} onChange={handleComboChange} options={{ symbolOptions, timeframeOptions, modelOptions }} isCombo={true} />
                    <div className="space-y-4 mb-6">
                      <label className="metric-label">Strategy Layers</label>
                      {comboData.strategies.map((config, idx) => (
                        <ComboStrategyCard 
                          key={idx} 
                          idx={idx} 
                          config={config} 
                          strategies={strategyOptions} 
                          onChange={handleStrategyConfigChange} 
                          onRemove={removeStrategyCard} 
                          disableRemove={comboData.strategies.length <= 1} 
                        />
                      ))}
                      <button 
                        type="button" 
                        onClick={addStrategyCard}
                        className="w-full py-3 bg-black/40 border border-white/10 rounded-xl text-emerald-400 hover:bg-black/60 hover:border-emerald-500/50 transition-all text-sm font-bold uppercase tracking-wider"
                      >
                        + Add Strategy Layer
                      </button>
                    </div>
                  </>
                )}
                
                <button 
                  type="submit" 
                  disabled={loading !== 'idle'}
                  className="button-start"
                >
                  {loading !== 'idle' ? 'Processing...' : '▶ Run Simulation'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - Results (7/12 width) */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {(loading !== 'idle' || combinedMetrics || error) ? (
              <>
                {loading !== 'idle' && (
                  // 🚀 FIXED: Replaced bg-slate with bot-card and Updated Spinner Color
                  <div className="bot-card p-12 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-20 h-20 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
                    <h3 className="text-white text-xl mb-2 font-bold">
                        {isSimulating ? "Running Backtest..." : "Loading the backtest setup..."}
                    </h3>
                    <p className="text-neutral-400 text-center">
                        {isSimulating ? "Analyzing historical data and executing strategy" : "Initializing environment..."}
                    </p>
                  </div>
                )}
                
                {loading === 'idle' && combinedMetrics && !error && (
                  <>
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400 font-mono font-bold">
                         ⚠ Warmup Period: {warmupRemovedCount} bars excluded
                      </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={handleSaveStrategy}
                          className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all flex items-center gap-2 font-bold text-sm uppercase"
                        >
                          💾 Save
                        </button>
                        <button 
                          onClick={() => downloadCSV(mainResult.tradeBreakdown)}
                          className="px-4 py-2 bg-teal-500/10 border border-teal-500/30 text-teal-400 rounded-lg hover:bg-teal-500/20 transition-all flex items-center gap-2 font-bold text-sm uppercase"
                        >
                          ⬇ CSV
                        </button>
                      </div>
                    </div>

                    {/* Standard Metrics */}
                    <MetricsDisplay metrics={combinedMetrics} />
                    
                    {/* 🚀 NEW: Advanced Metrics */}
                    <AdvancedMetricsDisplay metrics={combinedMetrics} />
                    
                    {/* Chart Card */}
                    {mainResult && mainResult.candleData?.length > 0 && (
                      // 🚀 FIXED: Replaced bg-slate with bot-card
                      <div className="bot-card">
                        <div className="panel-header flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-emerald-400 text-lg">📈</span>
                              <h3 className="card-title">Price Action & Signals</h3>
                            </div>
                            
                            <div className="tabs" style={{margin:0, padding:4}}>
                                <button 
                                    onClick={() => setChartMode('standard')}
                                    className={chartMode === 'standard' ? 'active' : ''}
                                    style={{padding: '6px 16px', fontSize: '0.8rem'}}
                                >
                                    Standard
                                </button>
                                <button 
                                    onClick={() => setChartMode('replay')}
                                    className={chartMode === 'replay' ? 'active' : ''}
                                    style={{padding: '6px 16px', fontSize: '0.8rem'}}
                                >
                                    Replay
                                </button>
                            </div>
                        </div>

                        <div style={{height: '850px'}}>
                          {chartMode === 'standard' ? (
                              <ChartIndependent 
                                  results={mainResult} 
                                  symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} 
                                  // FIX 2: Use the calculated actual dates from the data
                                  startDate={actualStartDate}
                                  endDate={actualEndDate}
                              />
                          ) : (
                              <ChartReplay 
                                  results={mainResult} 
                                  symbol={activeTab === 'single' ? formData.symbol : comboData.symbol} 
                                  startDate={actualStartDate}
                                  endDate={actualEndDate}
                              />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Charts Container */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Equity Curve */}
                      {/* 🚀 FIXED: Replaced bg-slate with bot-card */}
                      <div className="bot-card">
                        <div className="panel-header flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center text-xl">
                            🚀
                          </div>
                          <h3 className="card-title">Equity vs Buy & Hold</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={processedData}>
                            <defs>
                              <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorBuyHold" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.5} vertical={false} />
                            <XAxis dataKey="timestamp" tickFormatter={formatChartDate} stroke="#525252" tick={{ fill: '#737373', fontSize: 12 }} />
                            <YAxis domain={['auto', 'auto']} stroke="#525252" tick={{ fill: '#737373', fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} />
                            <Legend wrapperStyle={{paddingTop: '20px'}}/>
                            <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" name="Strategy" />
                            <Area type="monotone" dataKey="buyHold" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorBuyHold)" name="Buy & Hold" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Trade Outcomes & Reasons */}
                      {/* 🚀 FIXED: Replaced bg-slate with bot-card */}
                      <div className="bot-card">
                        <div className="panel-header flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center text-xl">
                            📊
                          </div>
                          <h3 className="card-title">Trade Outcomes</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 h-[300px]">
                            {/* Win/Loss Pie */}
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} stroke="none">
                                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333' }} />
                                <Legend wrapperStyle={{ color: '#a3a3a3', fontSize: '11px', bottom: 0 }} />
                              </PieChart>
                            </ResponsiveContainer>

                            {/* Exit Reason Pie */}
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={exitReasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} stroke="none">
                                  {exitReasonData.map((entry, index) => <Cell key={`reason-${index}`} fill={REASON_COLORS[index % REASON_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333' }} />
                                <Legend wrapperStyle={{ color: '#a3a3a3', fontSize: '11px', bottom: 0 }} />
                              </PieChart>
                            </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    <MonthlyHeatmap equityCurve={processedData} />
                  </>
                )}

                {error && (
                  <div className="bot-card border-red-500/30 bg-red-900/10 text-center">
                    <h3 className="text-red-400 text-lg mb-2 font-bold">Simulation Failed</h3>
                    <p className="text-neutral-400">{typeof error === 'object' ? (error.message || JSON.stringify(error)) : String(error)}</p>
                  </div>
                )}
              </>
            ) : (
              // 🚀 FIXED: Replaced bg-slate with bot-card, replaced blue icon
              <div className="bot-card p-12 flex flex-col items-center justify-center min-h-[600px]">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-2xl flex items-center justify-center mb-6 text-4xl">🏆</div>
                <h3 className="text-white text-xl mb-2 font-bold">Ready to Test Your Strategy</h3>
                <p className="text-neutral-400 text-center max-w-md">Configure your strategy parameters and run a backtest to see detailed performance metrics.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

<label>
          Strategy
          <select value={selectedStrategy} onChange={(e) => setSelectedStrategy(e.target.value)}>
            {options.strategies?.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </label>

        <label>
          Timeframe
          <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)}>
            {options.timeframes?.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </label>

        <label>
          Balance
          <input
            type="number"
            value={selectedBalance}
            onChange={(e) => setSelectedBalance(Number(e.target.value))}
          />
        </label>

        <label>
          Risk
          <select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value)}>
            {options.risks?.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <label>
          Position
          <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}>
            {options.positions?.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label>
          Take Profit
          <select value={selectedTP} onChange={(e) => setSelectedTP(e.target.value)}>
            {options.takeProfits?.map((tp) => (
              <option key={tp} value={tp}>{tp}</option>
            ))}
          </select>
        </label>

        <label>
          Stop Loss
          <select value={selectedSL} onChange={(e) => setSelectedSL(e.target.value)}>
            {options.stopLosses?.map((sl) => (
              <option key={sl} value={sl}>{sl}</option>
            ))}
          </select>
        </label>

        <label>
          Start Date
          <input
            type="date"
            value={selectedStartDate}
            onChange={(e) => setSelectedStartDate(e.target.value)}
          />
        </label>

        <label>
          End Date
          <input
            type="date"
            value={selectedEndDate}
            onChange={(e) => setSelectedEndDate(e.target.value)}
          />
        </label>

        <div className="flex space-x-2 mt-2">
          <button
            onClick={handleRunBacktest}
            disabled={loadingSingle}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {loadingSingle ? "Running..." : "Run Backtest"}
          </button>

          <button
            onClick={handleRunBatch}
            disabled={loadingBatch}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loadingBatch ? "Running Batch..." : "Run Batch Backtests"}
          </button>
        </div>
      </div>

      {/* Backtest Results */}
      {currentBacktest && (
        <div className="border p-4 rounded mt-4">
          <h3 className="font-semibold">Latest Backtest</h3>
          {renderChart(currentBacktest.equityCurve)}
          {renderSummary(currentBacktest)}
        </div>
      )}

      {batchResults?.length > 0 && (
        <div className="border p-4 rounded mt-4">
          <h3 className="font-semibold">Batch Backtest Results</h3>
          {batchResults.map((bt, idx) => (
            <div key={idx} className="mt-2">
              <h4 className="font-medium">{bt.strategyName}</h4>
              {renderChart(bt.equityCurve, "#82ca9d")}
              {renderSummary(bt)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

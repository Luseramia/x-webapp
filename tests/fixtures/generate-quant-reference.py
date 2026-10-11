"""Regenerate reference values using numpy + statsmodels (development only)."""
import json
from pathlib import Path

import numpy as np
import statsmodels
import statsmodels.api as sm
from statsmodels.tsa.adfvalues import mackinnoncrit
from statsmodels.tsa.stattools import adfuller, coint

seed = 42


def random():
    global seed
    seed = (1664525 * seed + 1013904223) % (2 ** 32)
    return seed / (2 ** 32) - 0.5


b, residual = 100, 0
prices_a, prices_b = [], []
for _ in range(300):
    b += 0.03 + random() * 3
    residual = 0.72 * residual + random() * 4
    prices_a.append(12 + 1.4 * b + residual)
    prices_b.append(b)

a, b = np.array(prices_a[:180]), np.array(prices_b[:180])
model = sm.OLS(a, sm.add_constant(b)).fit()
statistic, _, critical = coint(a, b, trend="c", maxlag=1, autolag=None)
phi = sm.OLS(model.resid[1:], sm.add_constant(model.resid[:-1])).fit().params[1]
reference = {
    "source": "statsmodels " + statsmodels.__version__,
    "parameters": "300 deterministic observations; formation=180; constant; maxlag=1; autolag=None",
    "alpha": float(model.params[0]),
    "beta": float(model.params[1]),
    "cointStatistic": float(statistic),
    "cointCritical5": float(critical[1]),
    "adfLevelA": float(adfuller(a, maxlag=1, regression="c", autolag=None)[0]),
    "adfDifferenceB": float(adfuller(np.diff(b), maxlag=1, regression="c", autolag=None)[0]),
    "adfCritical5": float(mackinnoncrit(N=1, regression="c", nobs=178)[1]),
    "halfLife": float(np.log(0.5) / np.log(phi)),
}
Path(__file__).with_name("quant-statsmodels.json").write_text(json.dumps(reference, indent=2) + "\n", encoding="utf-8")
print(json.dumps(reference))

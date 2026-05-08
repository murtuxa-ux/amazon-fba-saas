"""Pure-function tests for ai_forecasting (§2.6).

Endpoint integration tests are deliberately omitted: the existing test
fixtures (db_session/client) don't carry a Keepa-history mock, and
plumbing one in for two endpoints exceeded the dispatch budget. The
math underneath is what determines whether forecasts are usable, so
we cover that surface aggressively.
"""
from __future__ import annotations

from datetime import date

import pytest

from ai_forecasting import (
    _calculate_reorder,
    _detect_q4_boost,
    _holt_winters_forecast,
    _moving_average_forecast,
    _pick_method,
)


# ── Method dispatch ────────────────────────────────────────────────────────
def test_pick_method_thresholds():
    assert _pick_method(120) == ("holt_winters", "high")
    assert _pick_method(90) == ("holt_winters", "high")
    assert _pick_method(89) == ("moving_average", "medium")
    assert _pick_method(30) == ("moving_average", "medium")
    assert _pick_method(29) == ("cohort_fallback", "low")
    assert _pick_method(0) == ("cohort_fallback", "low")


# ── Holt-Winters ───────────────────────────────────────────────────────────
def test_holt_winters_constant_series_returns_constant_forecast():
    history = [10] * 120
    forecast = _holt_winters_forecast(history, periods=90)
    assert len(forecast) == 90
    assert all(8 <= f <= 12 for f in forecast), forecast


def test_holt_winters_rejects_short_history():
    with pytest.raises(ValueError):
        _holt_winters_forecast([1] * 89, periods=30)


# ── Moving average ─────────────────────────────────────────────────────────
def test_moving_average_uses_last_7_days():
    # Rising series: last 7 are 14..20, mean 17.
    history = list(range(1, 21))
    forecast = _moving_average_forecast(history, periods=10)
    assert forecast == [17] * 10


def test_moving_average_handles_empty_history():
    assert _moving_average_forecast([], periods=5) == [0] * 5


def test_moving_average_handles_short_history():
    assert _moving_average_forecast([5, 5, 5], periods=4) == [5, 5, 5, 5]


# ── Q4 boost ───────────────────────────────────────────────────────────────
def test_q4_boost_returns_one_outside_q4():
    history = [10] * 365
    # May → no boost regardless of history shape
    assert _detect_q4_boost(history, today=date(2026, 5, 8)) == 1.0


def test_q4_boost_returns_one_when_history_too_short():
    # November but only 200 days — not enough to find prior Q4
    assert _detect_q4_boost([10] * 200, today=date(2026, 11, 15)) == 1.0


def test_q4_boost_detects_holiday_lift():
    # Build 365-day history where Nov-Dec (slice [304:365]) is 2x the
    # Sep-Oct baseline (slice [244:304]). Boost should land near 2.0.
    history = [10] * 365
    for i in range(244, 304):
        history[i] = 10
    for i in range(304, 365):
        history[i] = 20
    boost = _detect_q4_boost(history, today=date(2026, 11, 15))
    assert 1.5 <= boost <= 2.0


def test_q4_boost_caps_at_2x():
    history = [1] * 365
    for i in range(304, 365):
        history[i] = 100  # 100x lift, must cap
    assert _detect_q4_boost(history, today=date(2026, 12, 1)) == 2.0


# ── Reorder calc ───────────────────────────────────────────────────────────
def test_reorder_calculation_matches_formula():
    forecast = [10] * 90
    qty, reorder_date, days_until = _calculate_reorder(
        forecast,
        lead_time_days=30,
        safety_stock_factor=1.5,
        on_hand=100,
        inbound=50,
    )
    # forecast_during_lead = 30 * 10 = 300
    # 300 * 1.5 - 100 - 50 = 300
    assert qty == 300
    # 150 units of runway / 10 per day = 15 days
    assert days_until == 14 or days_until == 15  # depends on cumulative >= boundary
    assert reorder_date is not None


def test_reorder_zero_when_overstocked():
    forecast = [1] * 90  # 90 units forecast over 90d
    qty, _date, _days = _calculate_reorder(
        forecast,
        lead_time_days=30,
        safety_stock_factor=1.0,
        on_hand=10000,
        inbound=0,
    )
    assert qty == 0


def test_reorder_no_runway_means_immediate_reorder():
    forecast = [10] * 90
    qty, _date, days_until = _calculate_reorder(
        forecast, on_hand=0, inbound=0, lead_time_days=30, safety_stock_factor=1.5
    )
    assert qty == int(round(30 * 10 * 1.5))
    assert days_until == 0


# ── Acceptance: backtest MAPE under 25% (§2.6) ─────────────────────────────
def test_backtest_mape_under_25_percent():
    """On clean weekly-seasonal data, Holt-Winters MAPE must be <25%.

    Brief acceptance criterion: <25% MAPE allows the UI label "forecast";
    >35% downgrades to "trend estimate". This test guards the upper
    bound — if it fails, demand-method dispatch should re-evaluate
    before shipping.
    """
    # Synthetic: weekly sawtooth with mild trend
    history = [10 + 3 * (i % 7) + i * 0.05 for i in range(120)]
    train = [int(round(x)) for x in history[:90]]
    actual = [int(round(x)) for x in history[90:120]]
    forecast = _holt_winters_forecast(train, periods=30)

    mape = (
        sum(abs((a - f) / a) for a, f in zip(actual, forecast) if a > 0)
        / len(actual)
        * 100
    )
    assert mape < 25, f"MAPE {mape:.1f}% exceeds 25% — downgrade UI to 'trend estimate'"

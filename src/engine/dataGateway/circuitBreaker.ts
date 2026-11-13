/**
 * Circuit Breaker for External API Fault Tolerance
 * SolarPV Studio v3.0 - Data Gateway
 */

import { type CircuitBreakerState } from './types';

export interface CircuitBreakerConfig {
  failureThreshold: number;   // Number of consecutive failures before opening circuit
  resetTimeoutMs: number;     // Cooldown duration before attempting half-open probe (30s)
  halfOpenMaxTrials: number;  // Number of trial requests in half-open state
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount: number = 0;
  private successCountInHalfOpen: number = 0;
  private halfOpenTrialsAttempted: number = 0;
  private halfOpenTrialsInProgress: number = 0;
  private lastStateChangeTimestamp: number = Date.now();
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private transportFailures: number = 0;
  private parseFailures: number = 0;
  private fallbackServed: number = 0;
  private successfulFetches: number = 0;

  constructor(private readonly config: CircuitBreakerConfig = {
    failureThreshold: 3,
    resetTimeoutMs: 30000, // 30s cooldown per PR-2a-6 spec
    halfOpenMaxTrials: 2,
  }) {}

  public getState(): CircuitBreakerState {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastStateChangeTimestamp;
      if (elapsed >= this.config.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
      }
    }
    return this.state;
  }

  public async execute<T>(
    action: () => Promise<T>,
    fallback?: (err: Error) => Promise<T> | T
  ): Promise<T> {
    this.totalRequests++;
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      const openErr = new Error('Circuit breaker is OPEN. Fast failover to fallback.');
      if (fallback) {
        this.fallbackServed++;
        return await fallback(openErr);
      }
      throw openErr;
    }

    if (currentState === 'HALF_OPEN') {
      if (this.halfOpenTrialsAttempted >= this.config.halfOpenMaxTrials) {
        const busyErr = new Error(
          `Circuit breaker is HALF_OPEN and max trials (${this.config.halfOpenMaxTrials}) are already in progress.`
        );
        if (fallback) {
          this.fallbackServed++;
          return await fallback(busyErr);
        }
        throw busyErr;
      }
      this.halfOpenTrialsAttempted++;
      this.halfOpenTrialsInProgress++;
    }

    try {
      const result = await action();
      this.recordSuccess();
      return result;
    } catch (err: unknown) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      // Caller cancellation is not a provider failure and must not poison the breaker
      // or be converted into an analytical fallback response.
      if (errorObj.name === 'AbortError') throw errorObj;
      this.recordFailure(errorObj);
      if (fallback) {
        this.fallbackServed++;
        return await fallback(errorObj);
      }
      throw errorObj;
    } finally {
      if (currentState === 'HALF_OPEN') {
        this.halfOpenTrialsInProgress = Math.max(0, this.halfOpenTrialsInProgress - 1);
      }
    }
  }

  public recordSuccess(): void {
    this.successfulFetches++;
    if (this.state === 'HALF_OPEN') {
      this.successCountInHalfOpen++;
      if (this.successCountInHalfOpen >= this.config.halfOpenMaxTrials) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  public recordFailure(err?: Error): void {
    this.totalFailures++;
    this.failureCount++;
    if (
      err &&
      (err.message.includes('missing') ||
        err.message.includes('invalid') ||
        err.message.includes('JSON') ||
        err.message.includes('parse'))
    ) {
      this.parseFailures++;
    } else {
      this.transportFailures++;
    }

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.config.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  public reset(): void {
    this.transitionTo('CLOSED');
    this.failureCount = 0;
    this.successCountInHalfOpen = 0;
    this.halfOpenTrialsAttempted = 0;
    this.halfOpenTrialsInProgress = 0;
  }

  private transitionTo(newState: CircuitBreakerState): void {
    this.state = newState;
    this.lastStateChangeTimestamp = Date.now();
    this.halfOpenTrialsAttempted = 0;
    this.halfOpenTrialsInProgress = 0;
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.successCountInHalfOpen = 0;
    }
  }

  public getStats() {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      transportFailures: this.transportFailures,
      parseFailures: this.parseFailures,
      fallbackServed: this.fallbackServed,
      successfulFetches: this.successfulFetches,
      halfOpenTrialsAttempted: this.halfOpenTrialsAttempted,
      halfOpenTrialsInProgress: this.halfOpenTrialsInProgress,
      lastChange: this.lastStateChangeTimestamp,
    };
  }

  public getMetrics() {
    return this.getStats();
  }
}

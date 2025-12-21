/**
 * Smart Alerting System
 * Intelligent notifications based on error thresholds, severity, and patterns
 */

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: SystemMetrics) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: AlertChannel[];
  cooldown: number; // ms between alerts of same type
}

export interface SystemMetrics {
  errorRate: number; // percentage
  errorCount: number; // in last 5 min
  networkLatency: number; // ms
  apiAvailability: number; // percentage
  pageLoadTime: number; // ms
  paymentFailureRate: number; // percentage
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  databaseLatency: number; // ms
}

export interface Alert {
  id: string;
  rule: AlertRule;
  timestamp: Date;
  metrics: SystemMetrics;
  message: string;
}

export type AlertChannel = 'slack' | 'email' | 'sms' | 'pagerduty' | 'github';

/**
 * Default alert rules based on industry standards
 */
const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    condition: (m) => m.errorRate > 5, // > 5% error rate
    severity: 'critical',
    channels: ['slack', 'pagerduty', 'github'],
    cooldown: 300000, // 5 minutes
  },
  {
    id: 'critical-error-spike',
    name: 'Critical Error Spike',
    condition: (m) => m.errorCount > 50, // > 50 errors in 5 min
    severity: 'critical',
    channels: ['slack', 'pagerduty', 'sms'],
    cooldown: 600000, // 10 minutes
  },
  {
    id: 'payment-failure-spike',
    name: 'Payment Failure Spike',
    condition: (m) => m.paymentFailureRate > 2, // > 2% payment failures
    severity: 'critical',
    channels: ['slack', 'pagerduty', 'email'],
    cooldown: 300000,
  },
  {
    id: 'api-degradation',
    name: 'API Performance Degradation',
    condition: (m) => m.networkLatency > 5000 || m.databaseLatency > 3000,
    severity: 'high',
    channels: ['slack', 'pagerduty'],
    cooldown: 600000,
  },
  {
    id: 'availability-drop',
    name: 'API Availability Drop',
    condition: (m) => m.apiAvailability < 99, // < 99% available
    severity: 'high',
    channels: ['slack', 'pagerduty', 'github'],
    cooldown: 900000, // 15 minutes
  },
  {
    id: 'page-slowness',
    name: 'Page Load Time Degradation',
    condition: (m) => m.pageLoadTime > 5000, // > 5 seconds
    severity: 'medium',
    channels: ['slack'],
    cooldown: 600000,
  },
  {
    id: 'memory-pressure',
    name: 'Memory Pressure',
    condition: (m) => m.memoryUsage > 85, // > 85% memory
    severity: 'high',
    channels: ['slack', 'pagerduty'],
    cooldown: 300000,
  },
  {
    id: 'cpu-spike',
    name: 'CPU Usage Spike',
    condition: (m) => m.cpuUsage > 80, // > 80% CPU
    severity: 'high',
    channels: ['slack'],
    cooldown: 600000,
  },
];

/**
 * Smart alerting manager
 */
class SmartAlerter {
  private rules: AlertRule[] = DEFAULT_RULES;
  private lastAlerts: Map<string, Date> = new Map();
  private alertHistory: Alert[] = [];

  /**
   * Evaluate metrics against all rules and dispatch alerts
   */
  async evaluateAndAlert(metrics: SystemMetrics): Promise<Alert[]> {
    const alerts: Alert[] = [];

    for (const rule of this.rules) {
      // Check if rule triggered
      if (!rule.condition(metrics)) continue;

      // Check cooldown to avoid alert fatigue
      const lastAlert = this.lastAlerts.get(rule.id);
      if (lastAlert && Date.now() - lastAlert.getTime() < rule.cooldown) {
        continue;
      }

      // Create alert
      const alert: Alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        rule,
        timestamp: new Date(),
        metrics,
        message: this.generateAlertMessage(rule, metrics),
      };

      alerts.push(alert);
      this.lastAlerts.set(rule.id, new Date());
      this.alertHistory.push(alert);

      // Dispatch to channels
      await this.dispatchAlert(alert);
    }

    return alerts;
  }

  /**
   * Generate human-readable alert message
   */
  private generateAlertMessage(rule: AlertRule, metrics: SystemMetrics): string {
    const timestamp = new Date().toISOString();
    let message = `🚨 [${rule.severity.toUpperCase()}] ${rule.name}\n`;
    message += `Time: ${timestamp}\n`;

    // Add relevant metrics
    if (rule.id.includes('error')) {
      message += `Error Rate: ${metrics.errorRate.toFixed(2)}%\n`;
      message += `Errors (5min): ${metrics.errorCount}\n`;
    }
    if (rule.id.includes('payment')) {
      message += `Payment Failure Rate: ${metrics.paymentFailureRate.toFixed(2)}%\n`;
    }
    if (rule.id.includes('api') || rule.id.includes('network')) {
      message += `Network Latency: ${metrics.networkLatency}ms\n`;
      message += `API Availability: ${metrics.apiAvailability.toFixed(2)}%\n`;
      message += `Database Latency: ${metrics.databaseLatency}ms\n`;
    }
    if (rule.id.includes('page')) {
      message += `Page Load Time: ${metrics.pageLoadTime}ms\n`;
    }
    if (rule.id.includes('memory') || rule.id.includes('cpu')) {
      message += `CPU: ${metrics.cpuUsage.toFixed(1)}%\n`;
      message += `Memory: ${metrics.memoryUsage.toFixed(1)}%\n`;
    }

    return message;
  }

  /**
   * Dispatch alert to appropriate channels
   */
  private async dispatchAlert(alert: Alert): Promise<void> {
    for (const channel of alert.rule.channels) {
      try {
        switch (channel) {
          case 'slack':
            await this.sendSlackAlert(alert);
            break;
          case 'email':
            await this.sendEmailAlert(alert);
            break;
          case 'sms':
            await this.sendSMSAlert(alert);
            break;
          case 'pagerduty':
            await this.sendPagerDutyAlert(alert);
            break;
          case 'github':
            await this.createGitHubIssue(alert);
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${channel} alert:`, error);
      }
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    const severityColor = {
      low: '#36a64f',
      medium: '#ffa500',
      high: '#ff6b6b',
      critical: '#d63031',
    }[alert.rule.severity];

    const payload = {
      attachments: [
        {
          color: severityColor,
          title: `${alert.rule.name} (${alert.rule.severity.toUpperCase()})`,
          text: alert.message,
          ts: Math.floor(alert.timestamp.getTime() / 1000),
          actions: [
            {
              type: 'button',
              text: 'View Dashboard',
              url: `${process.env.VERCEL_URL}/admin/monitoring`,
            },
            {
              type: 'button',
              text: 'View Sentry',
              url: 'https://sentry.io/organizations/taste-of-gratitude/',
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    const email = process.env.ALERT_EMAIL;
    if (!email) return;

    // Integrate with email service (SendGrid, AWS SES, etc.)
    const subject = `[${alert.rule.severity.toUpperCase()}] ${alert.rule.name}`;
    const body = this.generateEmailBody(alert);

    // Example using fetch to hypothetical email endpoint
    await fetch(`${process.env.VERCEL_URL}/api/email/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, subject, body }),
    });
  }

  /**
   * Send SMS notification (for critical alerts only)
   */
  private async sendSMSAlert(alert: Alert): Promise<void> {
    const phoneNumber = process.env.ALERT_PHONE;
    if (!phoneNumber) return;

    // Integrate with SMS service (Twilio, etc.)
    const message = `🚨 ${alert.rule.name}\n${alert.message}`;

    await fetch(`${process.env.VERCEL_URL}/api/sms/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phoneNumber, message }),
    });
  }

  /**
   * Send PagerDuty incident
   */
  private async sendPagerDutyAlert(alert: Alert): Promise<void> {
    const pdToken = process.env.PAGERDUTY_TOKEN;
    if (!pdToken) return;

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token token=${pdToken}`,
      },
      body: JSON.stringify({
        routing_key: process.env.PAGERDUTY_ROUTING_KEY,
        event_action: 'trigger',
        payload: {
          summary: alert.rule.name,
          severity: alert.rule.severity,
          source: 'Taste of Gratitude Monitoring',
          custom_details: alert.metrics,
          timestamp: alert.timestamp.toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`PagerDuty error: ${response.statusText}`);
    }
  }

  /**
   * Create GitHub issue for critical alerts
   */
  private async createGitHubIssue(alert: Alert): Promise<void> {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return;

    const body = this.generateGitHubIssueBody(alert);

    await fetch('https://api.github.com/repos/wizelements/Gratog/issues', {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `🚨 [${alert.rule.severity.toUpperCase()}] ${alert.rule.name}`,
        body,
        labels: ['alert', 'monitoring', `severity-${alert.rule.severity}`],
      }),
    });
  }

  /**
   * Generate email body
   */
  private generateEmailBody(alert: Alert): string {
    return `
      <h2>${alert.rule.name}</h2>
      <p><strong>Severity:</strong> ${alert.rule.severity.toUpperCase()}</p>
      <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
      
      <h3>Metrics</h3>
      <ul>
        <li>Error Rate: ${alert.metrics.errorRate.toFixed(2)}%</li>
        <li>Network Latency: ${alert.metrics.networkLatency}ms</li>
        <li>API Availability: ${alert.metrics.apiAvailability.toFixed(2)}%</li>
        <li>Page Load Time: ${alert.metrics.pageLoadTime}ms</li>
      </ul>
      
      <p><a href="${process.env.VERCEL_URL}/admin/monitoring">View Dashboard</a></p>
    `;
  }

  /**
   * Generate GitHub issue body
   */
  private generateGitHubIssueBody(alert: Alert): string {
    return `## Alert Details

**Rule:** ${alert.rule.name}  
**Severity:** ${alert.rule.severity}  
**Triggered:** ${alert.timestamp.toISOString()}

## Metrics

\`\`\`
Error Rate: ${alert.metrics.errorRate.toFixed(2)}%
Error Count (5min): ${alert.metrics.errorCount}
Network Latency: ${alert.metrics.networkLatency}ms
API Availability: ${alert.metrics.apiAvailability.toFixed(2)}%
Page Load Time: ${alert.metrics.pageLoadTime}ms
Payment Failure Rate: ${alert.metrics.paymentFailureRate.toFixed(2)}%
\`\`\`

## Action Items

- [ ] Review monitoring dashboard
- [ ] Check system status
- [ ] Investigate root cause
- [ ] Apply fix if applicable
- [ ] Update incident status

## Links

- [Monitoring Dashboard](${process.env.VERCEL_URL}/admin/monitoring)
- [Sentry Error Tracking](https://sentry.io)
- [System Status](${process.env.VERCEL_URL}/status)
    `;
  }

  /**
   * Get alert history
   */
  getHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get alert statistics
   */
  getStats() {
    const byRule = new Map<string, number>();
    const bySeverity = new Map<string, number>();

    this.alertHistory.forEach((alert) => {
      byRule.set(alert.rule.id, (byRule.get(alert.rule.id) || 0) + 1);
      bySeverity.set(
        alert.rule.severity,
        (bySeverity.get(alert.rule.severity) || 0) + 1
      );
    });

    return { byRule: Object.fromEntries(byRule), bySeverity: Object.fromEntries(bySeverity) };
  }

  /**
   * Add custom alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove alert rule
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }
}

// Export singleton instance
export const alerter = new SmartAlerter();

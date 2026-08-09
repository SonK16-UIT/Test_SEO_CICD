/**
 * PostHog Interactive Event Tracking Demo App
 */

document.addEventListener('DOMContentLoaded', () => {
  const btnCta = document.getElementById('btn-cta');
  const btnSubscribe = document.getElementById('btn-subscribe');
  const consoleLog = document.getElementById('console-output');

  function appendLog(msg, type = 'info') {
    if (!consoleLog) return;
    const entry = document.createElement('div');
    entry.className = 'entry';
    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `<span style="color: #64748b;">[${timestamp}]</span> ${msg}`;
    consoleLog.prepend(entry);
  }

  appendLog('✨ App initialized. Listening for user interactions...');

  // Track CTA Button Click
  if (btnCta) {
    btnCta.addEventListener('click', () => {
      const eventProperties = {
        button_id: 'btn-cta',
        button_text: 'Test CTA Event',
        page_location: window.location.href,
        timestamp: new Date().toISOString()
      };

      if (window.posthog) {
        posthog.capture('cta_button_clicked', eventProperties);
        appendLog('🚀 <strong style="color: #6366f1;">Captured Event:</strong> <code>cta_button_clicked</code>', 'success');
      } else {
        appendLog('⚠️ PostHog SDK not loaded (add your PostHog API key in index.html)');
      }
    });
  }

  // Track Subscription Event
  if (btnSubscribe) {
    btnSubscribe.addEventListener('click', () => {
      const eventProperties = {
        feature_name: 'newsletter_demo',
        action_type: 'subscribe_click',
        timestamp: new Date().toISOString()
      };

      if (window.posthog) {
        posthog.capture('newsletter_subscribed', eventProperties);
        appendLog('🎉 <strong style="color: #10b981;">Captured Event:</strong> <code>newsletter_subscribed</code>', 'success');
      } else {
        appendLog('⚠️ PostHog SDK not loaded (add your PostHog API key in index.html)');
      }
    });
  }
});

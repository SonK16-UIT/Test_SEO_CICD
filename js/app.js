/* global posthog */
/**
 * SPA Landing Page & PostHog Telemetry Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const consoleLog = document.getElementById('console-output');
  
  let currentActiveTab = 'overview';

  // Log Dispatch Helper
  function appendLog(msg) {
    if (!consoleLog) return;
    const entry = document.createElement('div');
    entry.className = 'entry';
    const timestamp = new Date().toLocaleTimeString();
    entry.innerHTML = `<span style="color: #64748b;">[${timestamp}]</span> ${msg}`;
    consoleLog.prepend(entry);
  }

  appendLog('✨ SPA Landing Page Initialized. Telemetry Ready.');

  // =========================================================================
  // 1. Tab Switching & Virtual Pageview Telemetry
  // =========================================================================
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab === currentActiveTab) return;

      // Update UI active state
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (targetContent) targetContent.classList.add('active');

      // PostHog Telemetry: Fire virtual pageview and tab_switched event
      if (typeof posthog !== 'undefined') {
        // [PostHog Capture] Virtual SPA $pageview event
        posthog.capture('$pageview', {
          $current_url: `${window.location.origin}/#${targetTab}`,
          tab_name: targetTab
        });

        // [PostHog Capture] Custom tab switch event
        posthog.capture('tab_switched', {
          previous_tab: currentActiveTab,
          new_tab: targetTab
        });
      }

      appendLog(`🔄 <strong style="color: #818cf8;">Tab Switched:</strong> <code>${currentActiveTab}</code> ➔ <code>${targetTab}</code>`);
      currentActiveTab = targetTab;
    });
  });

  // =========================================================================
  // 2. Tab 1 Overview Events
  // =========================================================================
  const btnCta = document.getElementById('btn-cta');
  const btnSubscribe = document.getElementById('btn-subscribe');

  if (btnCta) {
    btnCta.addEventListener('click', () => {
      const payload = {
        button_id: 'btn-cta',
        location: 'hero_overview',
        timestamp: new Date().toISOString()
      };

      if (typeof posthog !== 'undefined') {
        // [PostHog Capture] Primary CTA event
        posthog.capture('cta_button_clicked', payload);
      }
      appendLog('🚀 <strong style="color: #6366f1;">Captured Event:</strong> <code>cta_button_clicked</code>');
    });
  }

  if (btnSubscribe) {
    btnSubscribe.addEventListener('click', () => {
      const payload = {
        action: 'subscribe_demo',
        location: 'hero_overview'
      };

      if (typeof posthog !== 'undefined') {
        // [PostHog Capture] Secondary Subscribe event
        posthog.capture('newsletter_subscribed', payload);
      }
      appendLog('🎉 <strong style="color: #10b981;">Captured Event:</strong> <code>newsletter_subscribed</code>');
    });
  }

  // =========================================================================
  // 3. Tab 2 Product Selection Events
  // =========================================================================
  const planBtns = document.querySelectorAll('.select-plan-btn');
  planBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const planName = btn.getAttribute('data-ph-capture-attribute-plan');
      const planPrice = btn.getAttribute('data-ph-capture-attribute-price');

      const payload = {
        plan_name: planName,
        plan_price: planPrice,
        currency: 'USD'
      };

      if (typeof posthog !== 'undefined') {
        // [PostHog Capture] Custom product plan selection event
        posthog.capture('product_plan_selected', payload);
      }
      appendLog(`📦 <strong style="color: #38bdf8;">Plan Selected:</strong> <code>${planName}</code> ($${planPrice}/mo)`);
    });
  });

  // =========================================================================
  // 4. Tab 3 Contact Form Submission & Identification
  // =========================================================================
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('contact-name');
      const emailInput = document.getElementById('contact-email');
      const topicInput = document.getElementById('contact-topic');
      const msgInput = document.getElementById('contact-message');

      const userName = nameInput ? nameInput.value.trim() : '';
      const userEmail = emailInput ? emailInput.value.trim() : '';
      const topic = topicInput ? topicInput.value : 'General Inquiry';
      const message = msgInput ? msgInput.value.trim() : '';

      if (!userName || !userEmail || !message) {
        appendLog('❌ Form Error: Please fill in all required fields.');
        return;
      }

      if (typeof posthog !== 'undefined') {
        // [PostHog Identify] Associate anonymous user with their email/name
        posthog.identify(userEmail, {
          name: userName,
          email: userEmail
        });

        // [PostHog Capture] Form submission event
        posthog.capture('contact_form_submitted', {
          contact_name: userName,
          contact_email: userEmail,
          inquiry_topic: topic,
          message_length: message.length
        });
      }

      appendLog(`💬 <strong style="color: #10b981;">Form Submitted & User Identified:</strong> <code>${userEmail}</code>`);
      contactForm.reset();
    });
  }
});

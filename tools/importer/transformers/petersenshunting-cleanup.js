/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Petersen's Hunting site-wide cleanup.
 *
 * Removes non-authorable site chrome from the ASP.NET WebForms magazine homepage.
 * All selectors verified against migration-work/cleaned.html.
 *
 * beforeTransform: subscription / newsletter modal overlays (lity-hide) that
 *   are not authorable and would otherwise leak into the parsed output.
 * afterTransform: header/main nav, footer, ad slots, ASP.NET hidden fields,
 *   accessibility skip links, and safe leftover elements.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Subscription / newsletter modal overlays (all class="lity-hide").
    // Found in cleaned.html: #currentSubscribers, #sub-modal-container, #newsletter-modal-container
    WebImporter.DOMUtils.remove(element, [
      '#currentSubscribers',
      '#sub-modal-container',
      '#newsletter-modal-container',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    WebImporter.DOMUtils.remove(element, [
      // Header / main navigation / masthead (auto-populated site shell).
      // Found in cleaned.html: <div id="MainNav_MainNavigationControl_magazineMainNavPanel"> wrapping <header class="masthead">
      '#MainNav_MainNavigationControl_magazineMainNavPanel',
      'header.masthead',
      // Footer (auto-populated site shell).
      // Found in cleaned.html: <div id="FooterNavigation_magazineFooterPanel"> and <footer>
      '#FooterNavigation_magazineFooterPanel',
      'footer',
      // Ad slots. Found in cleaned.html: <section class="ad-wrapper ..."> and <div id="adpos_top|rightA|bottomA|bottomB|bottom">
      'section.ad-wrapper',
      '[id^="adpos_"]',
      // ASP.NET WebForms hidden state fields. Found in cleaned.html: <div class="aspNetHidden">
      '.aspNetHidden',
      // Accessibility skip links. Found in cleaned.html: <a class="sr-only sr-only-focusable">Skip to main content</a>
      'a.sr-only-focusable',
      // Safe leftover / non-authorable elements.
      'link',
      'noscript',
    ]);
  }
}

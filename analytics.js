/**
 * Google Analytics 4 for commercialvehicleguide.com.
 *
 * SET THIS to the property's measurement id (GA4 Admin -> Data streams -> Web).
 * It looks like G-XXXXXXXXXX. Until it is set, this file does nothing: no
 * script is loaded, no request is made, no cookie is written.
 */
var GA_MEASUREMENT_ID = "";

(function () {
  if (!GA_MEASUREMENT_ID) return;

  // dataLayer and gtag must exist before gtag.js runs, so define them first
  // and let this file append the loader.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);

  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
  document.head.appendChild(s);
})();

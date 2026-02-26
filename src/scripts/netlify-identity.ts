// Netlify Identity redirect handler
// This script must be included on the main site (not just /admin/) so that
// the OAuth callback flow can redirect users to the CMS after login.
//
// After deploying to Netlify:
// 1. Go to Netlify Dashboard > Site settings > Identity > Enable Identity
// 2. Under Registration, set to "Invite only"
// 3. Invite Yannik via his email address
// 4. Under Services > Git Gateway, click "Enable Git Gateway"
// Yannik will receive an invite email and can then log in at /admin/

if (window.netlifyIdentity) {
  window.netlifyIdentity.on('init', (user: unknown) => {
    if (!user) {
      window.netlifyIdentity.on('login', () => {
        document.location.href = '/admin/';
      });
    }
  });
}

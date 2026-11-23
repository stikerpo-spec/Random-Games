(() => {
  "use strict";

  const config = window.GLOBAL_CLASH_BACKEND || {};
  const placeholder = value => !value || /YOUR_|PLACEHOLDER/i.test(String(value));
  const configured = !placeholder(config.supabaseUrl) && !placeholder(config.supabasePublishableKey);
  const listeners = new Set();
  let currentUser = null;
  let lastEvent = "INITIAL_SESSION";
  let client = null;

  function publish(event, user) {
    lastEvent = event || "INITIAL_SESSION";
    currentUser = user || null;
    listeners.forEach(listener => {
      try { listener(lastEvent, currentUser); }
      catch (error) { console.error("GLOBAL CLASH account listener failed.", error); }
    });
  }

  let message = "";
  if (!configured) {
    message = "Die Supabase-Projektadresse und der Publishable Key fehlen noch in global-clash/backend-config.js.";
  } else if (!window.supabase || typeof window.supabase.createClient !== "function") {
    message = "Die Supabase-Bibliothek konnte nicht geladen werden. Prüfe deine Internetverbindung und lade die Seite neu.";
  } else {
    try {
      client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      client.auth.onAuthStateChange((event, session) => publish(event, session && session.user));
      client.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.warn("GLOBAL CLASH could not restore the auth session.", error);
          return;
        }
        if (lastEvent === "INITIAL_SESSION") publish("INITIAL_SESSION", data && data.session && data.session.user);
      }).catch(error => console.warn("GLOBAL CLASH session restore failed.", error));
    } catch (error) {
      message = "Der Account-Client konnte nicht gestartet werden. Prüfe die Supabase-Konfiguration.";
      console.error("GLOBAL CLASH auth initialisation failed.", error);
    }
  }

  const ready = !!client;
  const redirectUrl = () => window.location.origin + window.location.pathname;

  window.GlobalClashAuth = {
    get ready() { return ready; },
    get configured() { return configured; },
    get message() { return message; },
    get user() { return currentUser; },
    onChange(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      listener(lastEvent, currentUser);
      return () => listeners.delete(listener);
    },
    signUp(email, password, updateEmails) {
      if (!client) return Promise.resolve({ error: new Error(message || "Account-Server nicht verbunden.") });
      return client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl(), data: { update_emails: updateEmails === true } }
      });
    },
    signIn(email, password) {
      if (!client) return Promise.resolve({ error: new Error(message || "Account-Server nicht verbunden.") });
      return client.auth.signInWithPassword({ email, password });
    },
    signOut() {
      if (!client) return Promise.resolve({ error: new Error(message || "Account-Server nicht verbunden.") });
      return client.auth.signOut();
    },
    sendPasswordReset(email) {
      if (!client) return Promise.resolve({ error: new Error(message || "Account-Server nicht verbunden.") });
      return client.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
    },
    updatePassword(password) {
      if (!client) return Promise.resolve({ error: new Error(message || "Account-Server nicht verbunden.") });
      return client.auth.updateUser({ password });
    },
    setUpdateEmails(enabled) {
      if (!client) return Promise.resolve({ error: new Error(message || "Account-Server nicht verbunden.") });
      return client.auth.updateUser({ data: { update_emails: enabled === true } });
    }
  };
})();

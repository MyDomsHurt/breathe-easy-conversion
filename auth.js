/* Firebase Google Sign-In gate — conversion dashboard (own allowlist) */
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyBnfbQ5qlfo0DD7HkryszeNGRclvj0i99Q",
    authDomain: "breathe-easy-performance.firebaseapp.com",
    projectId: "breathe-easy-performance",
    storageBucket: "breathe-easy-performance.firebasestorage.app",
    messagingSenderId: "42449914362",
    appId: "1:42449914362:web:0c727c239807c6da773c43"
  };

  // Conversion dashboard only — not the performance team list
  const ALLOWED = [
    "jefflamb1992@gmail.com",
    "joshua@breathe-easyhk.com",
    "iamruby112@gmail.com",
    "n.marie.lamb@gmail.com"
  ].map(function (e) { return e.toLowerCase(); });

  if (!window.firebase) {
    console.error("Firebase SDK missing");
    return;
  }

  firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  var gate = document.getElementById("auth-gate");
  var errEl = document.getElementById("auth-error");
  var btn = document.getElementById("btn-google");
  var userChip = document.getElementById("auth-user");
  var appRoot = document.getElementById("app-root");

  function setError(msg) {
    if (!errEl) return;
    if (msg) {
      errEl.textContent = msg;
      errEl.style.display = "block";
    } else {
      errEl.textContent = "";
      errEl.style.display = "none";
    }
  }

  function showGate() {
    if (gate) gate.style.display = "flex";
    if (appRoot) appRoot.style.display = "none";
  }

  function showApp(user) {
    if (gate) gate.style.display = "none";
    if (appRoot) appRoot.style.display = "block";
    if (userChip) {
      userChip.textContent = user.email || user.displayName || "Signed in";
    }
    window.dispatchEvent(new Event("auth-ready"));
  }

  window.beSignOut = function () {
    auth.signOut();
  };

  if (btn) {
    btn.addEventListener("click", function () {
      setError("");
      btn.disabled = true;
      auth
        .signInWithPopup(provider)
        .catch(function (err) {
          console.error(err);
          setError(err.message || "Sign-in failed. Try again.");
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      showGate();
      setError("");
      return;
    }
    var email = (user.email || "").toLowerCase();
    if (ALLOWED.indexOf(email) === -1) {
      auth.signOut().then(function () {
        showGate();
        setError("This Google account is not authorised for this dashboard.");
      });
      return;
    }
    showApp(user);
  });
})();

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config.js";

const authGate = document.getElementById("auth-gate");
const appContent = document.getElementById("app-content");
const authLoading = document.getElementById("auth-loading");
const loginView = document.getElementById("login-view");
const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginSubmit = document.getElementById("login-submit");
const loginSubmitLabel = document.getElementById("login-submit-label");
const loginSpinner = document.getElementById("login-spinner");
const authMessage = document.getElementById("auth-message");
const logoutButton = document.getElementById("logout-button");
const logoutMessage = document.getElementById("logout-message");
const authUser = document.getElementById("auth-user");
const passwordToggle = document.getElementById("password-toggle");

let supabase;
let startupComplete = false;

function showLogin(message) {
  appContent.hidden = true;
  authGate.hidden = false;
  authLoading.hidden = true;
  loginView.hidden = false;
  authUser.textContent = "";
  logoutMessage.hidden = true;
  authMessage.textContent = message || "";
  authMessage.hidden = !message;
  loginPassword.value = "";
}

function showApp(user) {
  authUser.textContent = user.email || "";
  appContent.hidden = false;
  authGate.hidden = true;
  authMessage.hidden = true;
  logoutMessage.hidden = true;
}

function setLoginBusy(isBusy) {
  loginSubmit.disabled = isBusy;
  loginSubmitLabel.textContent = isBusy ? "ENTRANDO..." : "ENTRAR";
  loginSpinner.hidden = !isBusy;
}

function loginErrorMessage(error) {
  const message = String(error && error.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirme seu e-mail pelo link enviado antes de entrar.";
  }
  if (message.includes("too many requests") || message.includes("rate limit")) {
    return "Muitas tentativas em sequência. Aguarde um momento e tente novamente.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Não foi possível conectar ao serviço de autenticação. Verifique sua conexão.";
  }
  return "Não foi possível entrar. Verifique as credenciais e tente novamente.";
}

function isSupabaseConfigured() {
  return SUPABASE_URL.trim() !== "" &&
    SUPABASE_ANON_KEY.trim() !== "" &&
    !/YOUR-|YOUR_/i.test(SUPABASE_URL + SUPABASE_ANON_KEY);
}

passwordToggle.addEventListener("click", () => {
  const showPassword = loginPassword.type === "password";
  loginPassword.type = showPassword ? "text" : "password";
  passwordToggle.textContent = showPassword ? "OCULTAR" : "MOSTRAR";
  passwordToggle.setAttribute("aria-pressed", String(showPassword));
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase) {
    authMessage.textContent = "O serviço de autenticação não está disponível. Recarregue a página e tente novamente.";
    authMessage.hidden = false;
    return;
  }
  authMessage.hidden = true;
  setLoginBusy(true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.value.trim(),
      password: loginPassword.value
    });

    if (error) {
      throw error;
    }
    if (!data.session || !data.user) {
      throw new Error("Supabase não retornou uma sessão autenticada.");
    }

    showApp(data.user);
  } catch (error) {
    console.error("Falha na autenticação Supabase:", error);
    authMessage.textContent = loginErrorMessage(error);
    authMessage.hidden = false;
  } finally {
    setLoginBusy(false);
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutMessage.hidden = true;

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    showLogin();
    loginEmail.focus();
  } catch (error) {
    console.error("Falha ao encerrar a sessão Supabase:", error);
    logoutMessage.textContent = "Não foi possível encerrar a sessão. Tente novamente.";
    logoutMessage.hidden = false;
  } finally {
    logoutButton.disabled = false;
  }
});

async function initializeAuthentication() {
  if (!isSupabaseConfigured()) {
    const message = "Configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo supabase-config.js para habilitar o login.";
    console.error(message);
    showLogin(message);
    loginSubmit.disabled = true;
    return;
  }

  try {
    const { createClient } = await import(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
    );
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        showLogin();
      } else if (startupComplete && event !== "INITIAL_SESSION" && session) {
        showApp(session.user);
      }
    });

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }

    if (data.session) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Não foi possível validar a sessão Supabase:", userError);
        showLogin("Não foi possível confirmar sua sessão. Entre novamente.");
      } else if (userData.user) {
        showApp(userData.user);
      } else {
        showLogin();
      }
    } else {
      showLogin();
    }
  } catch (error) {
    console.error("Falha ao inicializar a autenticação Supabase:", error);
    showLogin("Não foi possível validar a sessão agora. Verifique a conexão e tente entrar novamente.");
    if (!supabase) {
      loginSubmit.disabled = true;
    }
  } finally {
    startupComplete = true;
  }
}

initializeAuthentication();

export const SUPABASE_URL = "sb_publishable_1rP0ivlGl8QHX7-YvHXFTg_QfjvQc4L";
export const SUPABASE_ANON_KEY = "sb_secret_f_xGip5DJxUIrS0eqiOS2Q_5gzwYKEI";

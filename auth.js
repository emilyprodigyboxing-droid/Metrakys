import SUPABASE_CONFIG from "./supabase-config.js";

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
    return "Não foi possível conectar ao Supabase. Verifique a conexão e a URL do projeto.";
  }
  return error && error.message
    ? `Falha ao entrar: ${error.message}`
    : "Não foi possível entrar. Verifique as credenciais e tente novamente.";
}

function configurationError() {
  const urlValue = SUPABASE_CONFIG && SUPABASE_CONFIG.url;
  const keyValue = SUPABASE_CONFIG && SUPABASE_CONFIG.publishableKey;
  const url = typeof urlValue === "string" ? urlValue.trim() : "";
  const key = typeof keyValue === "string" ? keyValue.trim() : "";

  if (!url) {
    return "Configuração inválida: informe a URL do projeto Supabase em supabase-config.js.";
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return "Configuração inválida: a URL do Supabase em supabase-config.js não é válida.";
  }
  if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password) {
    return "Configuração inválida: use a URL HTTPS do projeto Supabase, sem usuário ou senha.";
  }
  if (parsedUrl.pathname !== "/" || parsedUrl.search || parsedUrl.hash) {
    return "Configuração inválida: use a URL base do projeto (por exemplo, https://<projeto>.supabase.co), sem /rest/v1/ ou outros caminhos.";
  }
  if (!key || /YOUR-|YOUR_/i.test(key)) {
    return "Configuração inválida: informe a Publishable Key ou a chave anon pública em supabase-config.js.";
  }
  if (key.startsWith("sb_secret_") || key === "service_role") {
    return "Configuração insegura: não use uma secret/service-role key no navegador; use a Publishable Key pública.";
  }
  if (!key.startsWith("sb_publishable_") && !key.startsWith("eyJ")) {
    return "Configuração inválida: a chave deve ser uma Publishable Key (sb_publishable_) ou uma chave anon pública legada.";
  }
  return "";
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
    authMessage.textContent = "O cliente Supabase ainda não foi inicializado. Verifique a conexão e recarregue a página.";
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
  const configError = configurationError();
  if (configError) {
    console.error(configError);
    showLogin(configError);
    loginSubmit.disabled = true;
    return;
  }

  // A configuration is valid; don't leave the login button disabled while the
  // client/session check runs. Authentication errors are reported separately.
  loginSubmit.disabled = false;

  try {
    const { createClient } = await import(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
    );
    supabase = createClient(SUPABASE_CONFIG.url.trim(), SUPABASE_CONFIG.publishableKey.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
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
    const detail = error && error.message ? ` (${error.message})` : "";
    showLogin(`Não foi possível inicializar a autenticação Supabase${detail}. Verifique a conexão e a configuração do projeto.`);
  } finally {
    startupComplete = true;
  }
}

initializeAuthentication();

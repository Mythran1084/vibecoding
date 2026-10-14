// Development-only route used by the "Deploy ONLINE" widget.
// GET  -> { pendente } : is there anything to commit or push?
// POST -> commit (if needed) and push to GitHub.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const MISSING_CONFIG_MESSAGE = "Variáveis GIT_ do .env.local não configuradas";

function isDevelopment() {
  return process.env.NODE_ENV === "development";
}

function readGitConfig() {
  const { GIT_TOKEN, GIT_REPO_URL, GIT_USER_NAME, GIT_USER_EMAIL } = process.env;
  if (!GIT_TOKEN || !GIT_REPO_URL || !GIT_USER_NAME || !GIT_USER_EMAIL) {
    return null;
  }
  return {
    token: GIT_TOKEN,
    tokenBase64: Buffer.from(`x-access-token:${GIT_TOKEN}`).toString("base64"),
    repoUrl: `https://${GIT_REPO_URL}`,
    userName: GIT_USER_NAME,
    userEmail: GIT_USER_EMAIL,
  };
}

// The token goes in an HTTP header, never in the URL. The empty credential
// helper stops git from opening a login window if the token is rejected.
function authArgs(config) {
  return [
    "-c",
    `http.extraHeader=Authorization: Basic ${config.tokenBase64}`,
    "-c",
    "credential.helper=",
  ];
}

// Arguments are passed separately, so the commit message is never parsed by a shell.
async function git(args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: process.cwd(),
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return stdout.trim();
}

// Git error text can include the full command line, which contains the header.
function hideSecrets(text, config) {
  return text
    .replaceAll(config.token, "***")
    .replaceAll(config.tokenBase64, "***");
}

function errorResponse(error, config) {
  const detail = error.stderr?.trim() || error.message;
  return Response.json({ erro: hideSecrets(detail, config) }, { status: 500 });
}

function notFound() {
  return new Response("Not Found", { status: 404 });
}

function missingConfig() {
  return Response.json({ erro: MISSING_CONFIG_MESSAGE }, { status: 500 });
}

export async function GET() {
  if (!isDevelopment()) return notFound();
  const config = readGitConfig();
  if (!config) return missingConfig();

  try {
    const uncommitted = await git(["status", "--porcelain"]);
    const localHead = await git(["rev-parse", "HEAD"]);
    const remoteLine = await git([...authArgs(config), "ls-remote", config.repoUrl, "main"]);
    const remoteHead = remoteLine.split(/\s+/)[0];
    return Response.json({ pendente: uncommitted !== "" || localHead !== remoteHead });
  } catch (error) {
    return errorResponse(error, config);
  }
}

export async function POST(request) {
  if (!isDevelopment()) return notFound();
  const config = readGitConfig();
  if (!config) return missingConfig();

  const body = await request.json().catch(() => ({}));
  const message =
    typeof body.mensagem === "string" && body.mensagem.trim() !== ""
      ? body.mensagem.trim()
      : "WIP: sessão em curso";

  try {
    await git(["add", "-A"]);
    // Skip the commit when there is nothing new, so earlier unpushed commits still get pushed.
    const staged = await git(["status", "--porcelain"]);
    if (staged !== "") {
      await git([
        "-c", `user.name=${config.userName}`,
        "-c", `user.email=${config.userEmail}`,
        "commit", "-m", message,
      ]);
    }
    await git([...authArgs(config), "push", config.repoUrl, "main"]);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, config);
  }
}

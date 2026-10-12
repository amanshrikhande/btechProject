import axios from "axios";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export const LANGUAGE_VERSIONS = {
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  cpp: { language: "c++", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
  java: { language: "java", version: "15.0.2" },
  typescript: { language: "typescript", version: "5.0.3" },
};

// Local fallback executor for maximum reliability
const executeLocally = async (code, language, stdin = "") => {
  const startTime = Date.now();
  const tempDir = os.tmpdir();
  const randomId = Math.random().toString(36).substring(7);

  return new Promise((resolve) => {
    let cmd = "";
    let filePath = "";

    if (language === "javascript" || language === "js") {
      filePath = path.join(tempDir, `devshare_${randomId}.js`);
      fs.writeFileSync(filePath, code);
      cmd = `node "${filePath}"`;
    } else if (language === "python" || language === "py") {
      filePath = path.join(tempDir, `devshare_${randomId}.py`);
      fs.writeFileSync(filePath, code);
      cmd = `python "${filePath}"`;
    } else {
      return resolve({
        success: false,
        stdout: "",
        stderr: `Execution for ${language} requires external compiler or Docker runner.`,
        output: `Execution for ${language} requires external compiler or Docker runner.`,
        exitCode: 1,
        executionTimeMs: Date.now() - startTime,
        language,
        version: "local",
      });
    }

    const child = exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
      // Clean up temp file
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}

      const executionTimeMs = Date.now() - startTime;
      const output = (stdout + (stderr ? "\n" + stderr : "")).trim();

      resolve({
        success: !error,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        output: output || (error ? error.message : ""),
        exitCode: error ? error.code || 1 : 0,
        executionTimeMs,
        language,
        version: "native-engine",
      });
    });

    if (child.stdin) {
      if (stdin) {
        child.stdin.write(stdin);
      }
      child.stdin.end();
    }
  });
};

export const executePistonCode = async ({ code, language, version = "*", stdin = "" }) => {
  const normalizedLang = language.toLowerCase();
  const langConfig = LANGUAGE_VERSIONS[normalizedLang] || { language: normalizedLang, version: "*" };

  const startTime = Date.now();

  try {
    const response = await axios.post(
      "https://emkc.org/api/v2/piston/execute",
      {
        language: langConfig.language,
        version: version === "*" ? langConfig.version : version,
        files: [{ content: code }],
        stdin,
      },
      { timeout: 8000 }
    );

    const runResult = response.data.run || {};
    const output = (runResult.output || "").trim();

    // Check if Piston returned a whitelist restriction notice
    if (output.includes("whitelist only") || output.includes("Please host your own instance")) {
      // Fallback to high-speed local engine
      return await executeLocally(code, normalizedLang, stdin);
    }

    return {
      success: runResult.code === 0,
      stdout: runResult.stdout || "",
      stderr: runResult.stderr || "",
      output: runResult.output || "",
      exitCode: runResult.code || 0,
      executionTimeMs: Date.now() - startTime,
      language: langConfig.language,
      version: response.data.version || langConfig.version,
    };
  } catch (error) {
    // Graceful fallback to high-speed native runner
    return await executeLocally(code, normalizedLang, stdin);
  }
};
